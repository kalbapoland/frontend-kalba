from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen
from uuid import uuid4


POSTGRES_IMAGE = "postgres:16-alpine"
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "postgres"
POSTGRES_DB = "kalba"
POSTGRES_PORT = 5432
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000


@dataclass(frozen=True)
class EphemeralDatabase:
    container_name: str
    host_port: int
    database_url: str


def run(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd is not None else None,
        env=env,
        check=True,
        text=True,
        capture_output=capture_output,
    )


def resolve_tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    raise RuntimeError(f"{name} not found in PATH")


def wait_for_postgres(docker: str, container_name: str, timeout_seconds: int = 90) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            run(
                [
                    docker,
                    "exec",
                    container_name,
                    "pg_isready",
                    "-U",
                    POSTGRES_USER,
                    "-d",
                    POSTGRES_DB,
                ],
                capture_output=True,
            )
            return
        except subprocess.CalledProcessError:
            time.sleep(2)

    raise RuntimeError("Timed out waiting for temporary PostgreSQL container to become ready")


def start_ephemeral_postgres(docker: str) -> EphemeralDatabase:
    container_name = f"kalba-smoke-pg-{uuid4().hex[:8]}"
    command = [
        docker,
        "run",
        "--rm",
        "-d",
        "--name",
        container_name,
        "-e",
        f"POSTGRES_USER={POSTGRES_USER}",
        "-e",
        f"POSTGRES_PASSWORD={POSTGRES_PASSWORD}",
        "-e",
        f"POSTGRES_DB={POSTGRES_DB}",
        "-p",
        f"127.0.0.1:: {POSTGRES_PORT}".replace(" ", ""),
        POSTGRES_IMAGE,
    ]

    run(command)

    inspect = run(
        [
            docker,
            "inspect",
            "-f",
            f"{{{{(index (index .NetworkSettings.Ports \"{POSTGRES_PORT}/tcp\") 0).HostPort}}}}",
            container_name,
        ],
        capture_output=True,
    )
    host_port = int(inspect.stdout.strip())
    database_url = (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{BACKEND_HOST}:{host_port}/{POSTGRES_DB}"
    )

    wait_for_postgres(docker, container_name)
    return EphemeralDatabase(container_name=container_name, host_port=host_port, database_url=database_url)


def wait_for_backend_health(timeout_seconds: int = 120) -> None:
    deadline = time.monotonic() + timeout_seconds
    health_url = f"http://{BACKEND_HOST}:{BACKEND_PORT}/health"
    while time.monotonic() < deadline:
        try:
            with urlopen(health_url, timeout=5) as response:
                if response.status == 200:
                    return
        except URLError:
            time.sleep(2)

    raise RuntimeError(f"Timed out waiting for backend health at {health_url}")


def start_backend_process(backend_root: Path, database_url: str, uv: str) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    env.setdefault("APP_ENV", "local")
    env["PYTHONUNBUFFERED"] = "1"

    return subprocess.Popen(
        [
            uv,
            "run",
            "uvicorn",
            "app.main:app",
            "--host",
            BACKEND_HOST,
            "--port",
            str(BACKEND_PORT),
        ],
        cwd=str(backend_root),
        env=env,
    )


def stop_backend_process(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return

    if process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=30)


def stop_ephemeral_postgres(docker: str, container_name: str) -> None:
    subprocess.run([docker, "rm", "-f", container_name], check=False, capture_output=True, text=True)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    frontend_root = script_dir.parent.parent
    backend_root = frontend_root.parent / "backend"

    docker = resolve_tool("docker")
    uv = resolve_tool("uv")

    ephemeral_db: EphemeralDatabase | None = None
    backend_process: subprocess.Popen[str] | None = None

    try:
        ephemeral_db = start_ephemeral_postgres(docker)

        backend_env = dict(os.environ)
        backend_env["DATABASE_URL"] = ephemeral_db.database_url
        backend_env["APP_ENV"] = "local"

        run([uv, "run", "alembic", "upgrade", "head"], cwd=backend_root, env=backend_env)

        backend_process = start_backend_process(backend_root, ephemeral_db.database_url, uv)
        wait_for_backend_health()

        frontend_env = dict(os.environ)
        frontend_env["DATABASE_URL"] = ephemeral_db.database_url
        frontend_env["APP_ENV"] = "local"

        run([sys.executable, "test/automated/run_android_smoke.py"], cwd=frontend_root, env=frontend_env)
    except BaseException:
        raise
    finally:
        stop_backend_process(backend_process)
        if ephemeral_db is not None:
            stop_ephemeral_postgres(docker, ephemeral_db.container_name)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)
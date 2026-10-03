from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree


SVG_NAMESPACE = "{http://www.w3.org/2000/svg}"
DIAGRAM_OUTPUTS = (
    "NAVIGATION-01-auth.svg",
    "NAVIGATION-02-user.svg",
    "NAVIGATION-03-trainer.svg",
)
MERMAID_BLOCK = re.compile(r"```mermaid\r?\n(?P<body>.*?)```", re.DOTALL)


def validate_svg_accessibility(svg_path: Path) -> None:
    root = ElementTree.parse(svg_path).getroot()
    if root.tag != f"{SVG_NAMESPACE}svg":
        raise ValueError(f"Rendered map {svg_path.name} is not an SVG document.")

    elements_by_id = {
        element.attrib["id"]: element
        for element in root.iter()
        if "id" in element.attrib
    }
    title_refs = root.attrib.get("aria-labelledby", "").split()
    description_refs = root.attrib.get("aria-describedby", "").split()
    has_referenced_title = any(
        ref in elements_by_id
        and elements_by_id[ref].tag == f"{SVG_NAMESPACE}title"
        and (elements_by_id[ref].text or "").strip()
        for ref in title_refs
    )
    has_referenced_description = any(
        ref in elements_by_id
        and elements_by_id[ref].tag == f"{SVG_NAMESPACE}desc"
        and (elements_by_id[ref].text or "").strip()
        for ref in description_refs
    )

    if not has_referenced_title or not has_referenced_description:
        raise ValueError(
            f"Rendered map {svg_path.name} must reference a non-empty SVG "
            "title with aria-labelledby and description with "
            "aria-describedby. Keep accTitle and accDescr in its Mermaid block."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render the Mermaid maps in NAVIGATION.md as SVG files."
    )
    parser.add_argument(
        "--mermaid-cli",
        default="mmdc",
        help="Mermaid CLI executable (default: mmdc)",
    )
    parser.add_argument(
        "--puppeteer-config-file",
        type=Path,
        help="Optional Puppeteer JSON config, e.g. to select a local browser",
    )
    return parser.parse_args()


def resolve_mermaid_cli(command: str) -> Path:
    resolved = shutil.which(command)
    if resolved is None and Path(command).is_file():
        resolved = str(Path(command).resolve())
    if resolved is None:
        raise FileNotFoundError(
            f"Mermaid CLI '{command}' was not found. Install Mermaid CLI and "
            "Puppeteer as described in docs/screen-flow/README.md."
        )
    return Path(resolved)


def run_mermaid(
    cli_path: Path,
    input_path: Path,
    output_path: Path,
    puppeteer_config_file: Path | None,
) -> None:
    command = [
        str(cli_path),
        "-i",
        str(input_path),
        "-o",
        str(output_path),
        "-t",
        "neutral",
        "-b",
        "#F5F1EB",
        "--scale",
        "1.6",
    ]
    if puppeteer_config_file is not None:
        command.extend(["-p", str(puppeteer_config_file.resolve())])

    if os.name == "nt" and cli_path.suffix.lower() in {".cmd", ".bat"}:
        subprocess.run(
            [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", *command],
            check=True,
        )
        return

    subprocess.run(command, check=True)


def render_maps(
    navigation_doc: Path,
    output_dir: Path,
    cli_path: Path,
    puppeteer_config_file: Path | None,
) -> None:
    source = navigation_doc.read_text(encoding="utf-8")
    diagrams = MERMAID_BLOCK.findall(source)
    if len(diagrams) != len(DIAGRAM_OUTPUTS):
        raise ValueError(
            f"Expected {len(DIAGRAM_OUTPUTS)} Mermaid diagrams in "
            f"{navigation_doc.name}; found {len(diagrams)}."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="kalba-navigation-") as temp_dir:
        temp_path = Path(temp_dir)
        for index, (diagram, output_name) in enumerate(
            zip(diagrams, DIAGRAM_OUTPUTS, strict=True),
            start=1,
        ):
            input_path = temp_path / f"diagram-{index:02}.mmd"
            output_path = output_dir / output_name
            input_path.write_text(diagram.strip() + "\n", encoding="utf-8")
            run_mermaid(
                cli_path,
                input_path,
                output_path,
                puppeteer_config_file,
            )
            validate_svg_accessibility(output_path)


def main() -> None:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    navigation_doc = script_dir / "NAVIGATION.md"
    cli_path = resolve_mermaid_cli(args.mermaid_cli)
    render_maps(
        navigation_doc,
        script_dir,
        cli_path,
        args.puppeteer_config_file,
    )
    print(f"Rendered {len(DIAGRAM_OUTPUTS)} SVG navigation maps.")


if __name__ == "__main__":
    main()

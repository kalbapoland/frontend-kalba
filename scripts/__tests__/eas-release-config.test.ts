import { readFileSync } from "node:fs";
import { join } from "node:path";

type EASConfig = {
  cli: {
    appVersionSource: string;
  };
  build: {
    production: {
      autoIncrement: boolean;
      distribution: string;
      env: Record<string, string>;
    };
    release: {
      autoIncrement: boolean;
      distribution: string;
      environment: string;
      android: {
        buildType: string;
      };
      env: Record<string, string>;
    };
  };
  submit: {
    production: {
      ios: {
        ascAppId: string;
      };
    };
  };
};

// Keep this contract aligned with the release gate in BUILDING_WITH_EAS.md §3.0.
const easConfig = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "eas.json"), "utf8"),
) as EASConfig;

describe("EAS release build configuration", () => {
  test("keeps the release profile aligned with the two-platform release flow", () => {
    expect(easConfig.cli.appVersionSource).toBe("remote");
    expect(easConfig.build.release.autoIncrement).toBe(true);
    expect(easConfig.build.release.distribution).toBe("store");
    expect(easConfig.build.release.environment).toBe("production");
    expect(easConfig.build.release.android.buildType).toBe("app-bundle");
    expect(easConfig.build.release.env.EXPO_PUBLIC_APP_VARIANT).toBe("test");
    expect(easConfig.build.production.autoIncrement).toBe(true);
    expect(easConfig.build.production.distribution).toBe("store");
    expect(easConfig.build.production.env.EXPO_PUBLIC_APP_VARIANT).toBe("production");
    expect(easConfig.submit.production.ios.ascAppId).toMatch(/^\d+$/);
  });
});

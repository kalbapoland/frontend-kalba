import * as fs from "fs";
import * as path from "path";

const MAIN_MANIFEST = path.resolve(
  __dirname,
  "../../android/app/src/main/AndroidManifest.xml",
);

describe("AndroidManifest.xml — main (release)", () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(MAIN_MANIFEST, "utf-8");
  });

  test("usesCleartextTraffic is enabled on the <application> element", () => {
    // Android 9+ blocks HTTP to non-loopback hosts by default.
    // expo prebuild can silently remove this if the manifest is regenerated.
    const applicationTag = content.match(/<application\b[^>]*>/s)?.[0] ?? "";
    expect(applicationTag).toContain('android:usesCleartextTraffic="true"');
  });
});

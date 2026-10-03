import { buildFontMap, fontMap } from "@/theme/fonts";
import { fonts } from "@/theme/tokens";

describe("font map", () => {
  test("registers an asset for every family in the palette", () => {
    const names = Object.values(fonts);

    expect(names.length).toBeGreaterThan(0);
    // Compare as sets: two palette roles may legitimately share one family
    // (e.g. body and caption both use Inter_400Regular), which collapses to a
    // single map key.
    expect(new Set(Object.keys(fontMap))).toEqual(new Set(names));
  });

  test("every registered asset resolves to a font source", () => {
    for (const [name, asset] of Object.entries(fontMap)) {
      expect(typeof asset).toBe("number");
      expect(asset).toBeTruthy();
      expect(name).toMatch(/^(Fraunces|Inter)_/);
    }
  });

  test("throws when a family has no registered asset", () => {
    // Guards the silent-fallback failure mode: a family added to
    // palette.json without a matching import must fail loudly.
    expect(() => buildFontMap(["Fraunces_300Light", "NotARealFont"])).toThrow(
      /NotARealFont/,
    );
  });
});

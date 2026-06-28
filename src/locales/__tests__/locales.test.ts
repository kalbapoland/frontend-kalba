import en from "../en.json";
import pl from "../pl.json";

type Json = Record<string, unknown>;

/** Flatten nested locale objects into dot-paths → leaf string values. */
function flatten(obj: Json, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Json, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

// Polish needs extra plural categories English does not (_few/_many). Allow
// those to exist only in pl, but everything else must be present in both.
const PL_ONLY_PLURAL_SUFFIX = /_(few|many)$/;

const enFlat = flatten(en as Json);
const plFlat = flatten(pl as Json);

describe("locale parity (en <-> pl)", () => {
  test("every English key has a Polish translation", () => {
    const missing = Object.keys(enFlat).filter((k) => !(k in plFlat));
    expect(missing).toEqual([]);
  });

  test("every Polish key exists in English (except pl-only plural forms)", () => {
    const extra = Object.keys(plFlat).filter(
      (k) => !(k in enFlat) && !PL_ONLY_PLURAL_SUFFIX.test(k),
    );
    expect(extra).toEqual([]);
  });

  test("no locale value is an empty string", () => {
    const emptyEn = Object.entries(enFlat).filter(([, v]) => v.trim() === "");
    const emptyPl = Object.entries(plFlat).filter(([, v]) => v.trim() === "");
    expect(emptyEn).toEqual([]);
    expect(emptyPl).toEqual([]);
  });
});

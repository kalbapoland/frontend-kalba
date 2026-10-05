import { render } from "@testing-library/react-native";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { THEMES } from "@/theme/themes";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Palette assertions are keyed to THEMES.default — guard against ambient env
// leaking a build lock into this suite (same insurance as themeProvider tests).
const originalEnv = process.env.EXPO_PUBLIC_THEME;

beforeEach(() => {
  delete process.env.EXPO_PUBLIC_THEME;
});

afterAll(() => {
  if (originalEnv === undefined) {
    delete process.env.EXPO_PUBLIC_THEME;
  } else {
    process.env.EXPO_PUBLIC_THEME = originalEnv;
  }
});

const APP_TONE_KEY: Record<string, string> = {
  ink: "ink",
  body: "inkBody",
  muted: "inkMuted",
  primary: "primary",
  accent: "accent",
  danger: "danger",
  inverse: "elevated",
};

const BADGE_BG_KEY: Record<string, string> = {
  primary: "primaryWash",
  accent: "accentSoft",
  neutral: "canvasDeep",
  danger: "dangerWash",
};

function firstColor(styles: unknown): string | undefined {
  const flat = Array.isArray(styles) ? styles.flat(Infinity) : [styles];
  // Style arrays resolve last-wins in RN; Badge's inline tone colour is the
  // final entry, after AppText's typography/default tone entries.
  let color: string | undefined;
  for (const s of flat as Array<{ color?: string } | undefined>) {
    if (s && typeof s === "object" && typeof s.color === "string") color = s.color;
  }
  return color;
}

function firstBg(styles: unknown): string | undefined {
  const flat = Array.isArray(styles) ? styles.flat(Infinity) : [styles];
  // Same last-wins resolution for the wash background.
  let bg: string | undefined;
  for (const s of flat as Array<{ backgroundColor?: string } | undefined>) {
    if (s && typeof s === "object" && typeof s.backgroundColor === "string") bg = s.backgroundColor;
  }
  return bg;
}

describe("AppText tone lookup (review Minor #6)", () => {
  for (const tone of Object.keys(APP_TONE_KEY)) {
    test(`tone "${tone}" resolves to the active palette colour`, () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <AppText tone={tone as never} testID={`tone-${tone}`}>
            x
          </AppText>
        </ThemeProvider>,
      );

      const style = getByTestId(`tone-${tone}`).props.style;
      expect(firstColor(style)).toBe(THEMES.default[APP_TONE_KEY[tone] as keyof typeof THEMES.default]);
    });
  }

  test("tones flip with the active theme (palette values differ)", () => {
    expect(THEMES.default.ink).not.toBe(THEMES.night.ink);
    expect(THEMES.default.accent).not.toBe(THEMES.night.accent);
  });
});

describe("Badge tone lookup", () => {
  for (const tone of Object.keys(BADGE_BG_KEY)) {
    test(`tone "${tone}" uses its wash background`, () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <Badge label="x" tone={tone as never} testID={`badge-${tone}`} />
        </ThemeProvider>,
      );

      const style = getByTestId(`badge-${tone}`).props.style;
      expect(firstBg(style)).toBe(THEMES.default[BADGE_BG_KEY[tone] as keyof typeof THEMES.default]);
    });
  }

  test("text colour follows the tone, not the wash", () => {
    const { getByText } = render(
      <ThemeProvider>
        <Badge label="x" tone="danger" testID="badge-danger-text" />
      </ThemeProvider>,
    );

    const textEl = getByText("x");
    expect(firstColor(textEl.props.style)).toBe(THEMES.default.danger);
  });
});
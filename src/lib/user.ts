import type { User } from "@/types/api";

/**
 * The human-friendly name to show for a user.
 *
 * Prefers the stored full name. Falls back to the local part of the email for
 * accounts created before names were collected (or where Google returned no
 * name), so the UI never shows a blank or a raw email where a name belongs.
 */
export function displayName(user: Pick<User, "full_name" | "email"> | null | undefined): string {
  if (!user) {
    return "";
  }

  const name = user.full_name?.trim();
  if (name) {
    return name;
  }

  const localPart = user.email?.split("@")[0]?.trim();
  return localPart || "";
}

/** First name (or first token of the display name) for greetings. */
export function firstName(
  user: Pick<User, "full_name" | "email"> | null | undefined,
): string {
  return displayName(user).split(" ")[0] ?? "";
}

/** Up to two uppercase initials derived from the display name. */
export function initials(
  user: Pick<User, "full_name" | "email"> | null | undefined,
): string {
  const name = displayName(user);
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

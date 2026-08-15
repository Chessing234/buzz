/**
 * Derive up to two uppercase initials from a display name.
 *
 * Iterates code points, not UTF-16 code units. A name whose first letter lives
 * outside the Basic Multilingual Plane — CJK Extension B, which appears in
 * ordinary Chinese and Japanese given names, or a mathematical-alphanumeric
 * letter — is a surrogate pair, and taking `part[0]` returned half of one.
 * That is not a character: every avatar for that person rendered `�`.
 */
export function getInitials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .map((part) => [...part][0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

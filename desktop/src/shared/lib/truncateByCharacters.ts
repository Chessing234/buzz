/**
 * Truncate `text` to at most `maxCharacters`, cutting between characters
 * rather than between the UTF-16 code units a character is stored in.
 *
 * `String.prototype.slice` counts code units. Anything outside the Basic
 * Multilingual Plane — every emoji, and plenty of CJK — is a surrogate pair,
 * so a cut that lands inside one leaves a lone surrogate: not a character, and
 * rendered as `�` at the end of the preview.
 *
 * Characters here means code points, not grapheme clusters. A cut can still
 * land between the parts of a ZWJ sequence (a family emoji becoming one
 * person), which is a different picture but a valid string — unlike the lone
 * surrogate, which is not text at all.
 */
export function truncateByCharacters(
  text: string,
  maxCharacters: number,
): string {
  if (maxCharacters <= 0) return "";
  const characters = [...text];
  if (characters.length <= maxCharacters) return text;
  return characters.slice(0, maxCharacters).join("");
}

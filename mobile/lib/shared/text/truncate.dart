/// Truncation for text that is shown to a person.
library;

import 'package:characters/characters.dart';

/// Returns [text] shortened to at most [maxCharacters] user-perceived
/// characters, or [text] unchanged when it is already that short.
///
/// `substring` and `length` count UTF-16 code units. Anything outside the
/// Basic Multilingual Plane — every emoji, and CJK Extension B — is stored as
/// a surrogate pair, so a cut that lands inside one leaves a lone surrogate:
/// not a character, and drawn as `\u{FFFD}` at the end of the preview.
///
/// Counting characters also means the decision to truncate and the cut itself
/// agree with each other, and with what the reader sees.
///
/// The reminder preview in `features/channels/message_actions.dart` already
/// does this with `.characters.take(...)`; this is the same rule, shared.
String truncateToCharacters(String text, int maxCharacters) {
  if (maxCharacters <= 0) return '';
  final characters = text.characters;
  if (characters.length <= maxCharacters) return text;
  return characters.take(maxCharacters).toString();
}

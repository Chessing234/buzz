import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getInitials } from "./initials.ts";

describe("getInitials", () => {
  it("filters punctuation before deriving initials", () => {
    assert.equal(getInitials("B (relay)"), "BR");
  });

  it("handles a leading symbol on a single word", () => {
    assert.equal(getInitials("(staging)"), "S");
  });

  it("still returns plain initials for normal names", () => {
    assert.equal(getInitials("Bravo Beta"), "BB");
  });

  it("returns empty for a symbol-only name", () => {
    assert.equal(getInitials("()"), "");
  });
});

describe("getInitials beyond the BMP", () => {
  it("keeps a whole astral letter instead of half a surrogate pair", () => {
    // U+20000, CJK Extension B — an ordinary character in some names.
    const initials = getInitials("\u{20000}明");
    assert.equal(initials, "\u{20000}");
    assert.equal([...initials].length, 1);
  });

  it("keeps both initials whole when both are astral", () => {
    const initials = getInitials("\u{20000}\u{20001} \u{20002}\u{20003}");
    assert.equal(initials, "\u{20000}\u{20002}");
    assert.equal([...initials].length, 2);
  });

  it("mixes an astral first name with an ordinary surname", () => {
    assert.equal(getInitials("\u{1D400}da Lovelace"), "\u{1D400}L");
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { truncateByCharacters } from "./truncateByCharacters.ts";

test("leaves a short string alone", () => {
  assert.equal(truncateByCharacters("hello", 100), "hello");
  assert.equal(truncateByCharacters("hello", 5), "hello");
});

test("never ends on half a surrogate pair", () => {
  // The 100th code unit lands inside the emoji, which is where `slice` bit.
  const body = `${"x".repeat(99)}🎉 more text`;
  const cut = truncateByCharacters(body, 100);
  const lastUnit = cut.charCodeAt(cut.length - 1);
  assert.ok(
    lastUnit < 0xd800 || lastUnit > 0xdbff,
    `ends on a lone high surrogate: ${JSON.stringify(cut.slice(-2))}`,
  );
  assert.equal(cut, `${"x".repeat(99)}🎉`);
});

test("counts characters, not code units", () => {
  assert.equal(truncateByCharacters("🎉🎉🎉", 2), "🎉🎉");
  assert.equal([...truncateByCharacters("🎉🎉🎉", 2)].length, 2);
});

test("handles the degenerate limits", () => {
  assert.equal(truncateByCharacters("hello", 0), "");
  assert.equal(truncateByCharacters("", 10), "");
});

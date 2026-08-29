import assert from "node:assert/strict";
import test from "node:test";

import { shouldPromoteExplicitAddress } from "./shouldPromoteExplicitAddress.ts";

test("explicit address does not pin when auto-mention preference is off", () => {
  assert.equal(shouldPromoteExplicitAddress(false), false);
});

test("explicit address may pin when auto-mention preference is on", () => {
  assert.equal(shouldPromoteExplicitAddress(true), true);
});

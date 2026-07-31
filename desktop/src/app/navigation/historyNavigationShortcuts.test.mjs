import assert from "node:assert/strict";
import test from "node:test";

import { matchHistoryNavigationShortcut } from "./historyNavigationShortcuts.ts";

function probe(overrides) {
  return {
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

test("mac back chord matches bracket key and code", () => {
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "[", code: "BracketLeft", metaKey: true }),
      true,
    ),
    "back",
  );
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "Dead", code: "BracketLeft", metaKey: true }),
      true,
    ),
    "back",
  );
});

test("mac forward chord matches bracket key and code", () => {
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "]", code: "BracketRight", metaKey: true }),
      true,
    ),
    "forward",
  );
});

test("windows back and forward use alt arrows without modifiers", () => {
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "ArrowLeft", altKey: true }),
      false,
    ),
    "back",
  );
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "ArrowRight", altKey: true }),
      false,
    ),
    "forward",
  );
});

test("shift modifier blocks history chords", () => {
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "ArrowLeft", altKey: true, shiftKey: true }),
      false,
    ),
    null,
  );
});

test("ctrl arrow left is not history navigation on windows", () => {
  assert.equal(
    matchHistoryNavigationShortcut(
      probe({ key: "ArrowLeft", ctrlKey: true }),
      false,
    ),
    null,
  );
});

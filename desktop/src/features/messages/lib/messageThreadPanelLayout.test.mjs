import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMPOSER_ACTIVITY_ROW_CLASS,
  THREAD_PANEL_COMPOSER_GUTTER_CLASS,
} from "./messageThreadPanelLayout.ts";

const THREAD_PANEL = new URL("../ui/MessageThreadPanel.tsx", import.meta.url);
const CHANNEL_ACCESSORY = new URL(
  "../../channels/ui/ChannelComposerActivityAccessory.tsx",
  import.meta.url,
);

test("composer activity row carries no max-width or centering of its own", () => {
  // A cap here indents the row from its composer once the surface is wider
  // than the cap, which is what made the thread panel's row drift right.
  assert.ok(!COMPOSER_ACTIVITY_ROW_CLASS.includes("max-w-"));
  assert.ok(!COMPOSER_ACTIVITY_ROW_CLASS.includes("mx-auto"));
});

test("composer activity row only inherits the composer gutter", () => {
  assert.equal(THREAD_PANEL_COMPOSER_GUTTER_CLASS, "px-5");
  assert.ok(!COMPOSER_ACTIVITY_ROW_CLASS.includes("px-"));
});

test("both composer activity rows use the shared frame", async () => {
  for (const file of [THREAD_PANEL, CHANNEL_ACCESSORY]) {
    const source = await readFile(file, "utf8");
    assert.ok(
      source.includes("className={COMPOSER_ACTIVITY_ROW_CLASS}"),
      `${file.pathname} should frame its activity row with COMPOSER_ACTIVITY_ROW_CLASS`,
    );
  }
});

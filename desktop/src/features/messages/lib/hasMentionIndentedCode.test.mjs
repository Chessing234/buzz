/**
 * `maskMarkdownCode` decides which text `getMentionOffsets` may scan, and
 * `getMentionOffsets` is what the composer uses to attach `p` tags
 * (`draftMentionRefs.ts`, `extractMentionPubkeys.ts`). So a line it masks
 * wrongly is a mention the sender's own client never tags: visible in the
 * message, invisible to the recipient's notifications and to an agent's
 * mention gate.
 *
 * The rule under test is CommonMark 4.4 — an indented code block cannot
 * interrupt a paragraph, so the chunk must start after a blank line. Every
 * expectation below was checked against react-markdown, the renderer that
 * decides what the reader actually sees.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { hasMention } from "./hasMention.ts";

test("a mention on a nested list item is tagged", () => {
  // react-markdown renders both of these as an ordinary nested bullet, not as
  // code. Masking them dropped the p tag from the most common markdown shape
  // that carries four spaces of indent.
  assert.equal(hasMention("- outer\n    - @alice look", "alice"), true);
  assert.equal(hasMention("- outer\n\t- @alice look", "alice"), true);
  assert.equal(hasMention("1. outer\n    1. @alice look", "alice"), true);
});

test("a mention on an indented continuation line is tagged", () => {
  assert.equal(
    hasMention("- a very long item\n    @alice look", "alice"),
    true,
  );
});

test("a real indented code block is still masked", () => {
  // Blank line first, so this one genuinely is code — and react-markdown
  // agrees, rendering it inside <pre><code>.
  assert.equal(
    hasMention("text\n\n    const x = 1;\n    @alice\n", "alice"),
    false,
  );
  // At the very start of a message there is nothing to interrupt.
  assert.equal(hasMention("    @alice", "alice"), false);
  // A blank line inside a chunk does not end it.
  assert.equal(hasMention("text\n\n    a\n\n    @alice", "alice"), false);
});

test("fenced code is unaffected by the indent rule", () => {
  assert.equal(hasMention("```\n@alice\n```", "alice"), false);
  assert.equal(hasMention("```\nx\n```\n@alice", "alice"), true);
  // A fence ends any indented run, so the line after it is judged afresh.
  assert.equal(hasMention("    code\n```\nx\n```\n    @alice", "alice"), true);
});

test("known gap: an indented paragraph after a blank line inside a list", () => {
  // CommonMark reads this as the list item's second paragraph, so
  // react-markdown renders the mention visibly and this masking is still
  // wrong. Distinguishing it needs the list's content indent, i.e. real block
  // parsing, which this masker does not do. Recorded rather than left silent.
  assert.equal(hasMention("- item\n\n    @alice", "alice"), false);
});

/**
 * Retention behaviour of the per-agent live observer journal.
 *
 * `appendAgentEvents` derives the transcript incrementally when a batch lands
 * after the retained window, and falls back to a full `buildTranscriptState`
 * replay when the window is evicted. Evicting back to exactly the cap made that
 * fallback permanent: an agent parked at the cap evicts one event per append, so
 * every steady-state append replayed the whole history.
 *
 * These tests pin the retention window's shape — that is the observable
 * signal for which path ingest takes — and the invariant that the derived
 * transcript still matches a replay of the retained window either way.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  syncAgentObserverEvents,
  getAgentObserverSnapshot,
  getAgentTranscript,
  resetAgentObserverStore,
} from "@/features/agents/observerRelayStore.ts";
import { buildTranscript } from "@/features/agents/ui/agentSessionTranscript.ts";

const AGENT_PUBKEY = "a".repeat(64);
const MAX_OBSERVER_EVENTS = 3000;

function makeEvent(seq) {
  return {
    seq,
    timestamp: new Date(1_760_000_000_000 + seq * 1000).toISOString(),
    kind: "turn_started",
    agentIndex: 0,
    channelId: "chan-1",
    sessionId: "sess-1",
    turnId: `turn-${seq}`,
    payload: {},
  };
}

function windowLength() {
  return getAgentObserverSnapshot(AGENT_PUBKEY).events.length;
}

describe("live observer journal retention", () => {
  beforeEach(() => {
    resetAgentObserverStore();
  });

  it("never exceeds the retention cap", () => {
    for (let seq = 1; seq <= MAX_OBSERVER_EVENTS + 750; seq += 1) {
      syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(seq)]);
      assert.ok(
        windowLength() <= MAX_OBSERVER_EVENTS,
        `window grew to ${windowLength()} at seq ${seq}`,
      );
    }
  });

  it("evicts with headroom so appends past the cap do not each evict", () => {
    for (let seq = 1; seq <= MAX_OBSERVER_EVENTS; seq += 1) {
      syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(seq)]);
    }
    assert.equal(windowLength(), MAX_OBSERVER_EVENTS);

    // The append that crosses the cap must leave the window below it. Evicting
    // back to the cap instead would re-arm eviction on the very next append and
    // keep it armed forever.
    syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(MAX_OBSERVER_EVENTS + 1)]);
    const afterFirstEviction = windowLength();
    assert.ok(
      afterFirstEviction < MAX_OBSERVER_EVENTS,
      `expected headroom after eviction, window is still ${afterFirstEviction}`,
    );

    // ...and that headroom has to be refilled by ordinary appends before the
    // next eviction, so evictions are amortized rather than per-append.
    syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(MAX_OBSERVER_EVENTS + 2)]);
    assert.equal(windowLength(), afterFirstEviction + 1);
  });

  it("keeps the newest events and drops the oldest", () => {
    const total = MAX_OBSERVER_EVENTS + 400;
    for (let seq = 1; seq <= total; seq += 1) {
      syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(seq)]);
    }
    const events = getAgentObserverSnapshot(AGENT_PUBKEY).events;
    assert.equal(events.at(-1).seq, total);
    assert.equal(events.at(0).seq, total - events.length + 1);
  });

  it("derives the same transcript as a replay of the retained window", () => {
    for (let seq = 1; seq <= MAX_OBSERVER_EVENTS + 600; seq += 1) {
      syncAgentObserverEvents(AGENT_PUBKEY, [makeEvent(seq)]);
    }
    const retained = getAgentObserverSnapshot(AGENT_PUBKEY).events;
    assert.deepEqual(
      getAgentTranscript(AGENT_PUBKEY),
      buildTranscript(retained),
    );
  });

  it("handles a single batch larger than the cap", () => {
    const batch = [];
    for (let seq = 1; seq <= MAX_OBSERVER_EVENTS + 900; seq += 1) {
      batch.push(makeEvent(seq));
    }
    syncAgentObserverEvents(AGENT_PUBKEY, batch);
    assert.ok(windowLength() <= MAX_OBSERVER_EVENTS);
    assert.equal(
      getAgentObserverSnapshot(AGENT_PUBKEY).events.at(-1).seq,
      MAX_OBSERVER_EVENTS + 900,
    );
  });
});

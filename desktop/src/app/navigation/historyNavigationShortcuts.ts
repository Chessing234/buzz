export type HistoryNavigationDirection = "back" | "forward";

export type HistoryShortcutProbe = {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/**
 * Match global back/forward history chords. These intentionally bypass the
 * editable-target guard — they have no text-editing semantics in composers.
 */
export function matchHistoryNavigationShortcut(
  probe: HistoryShortcutProbe,
  isMac: boolean,
): HistoryNavigationDirection | null {
  if (probe.shiftKey) {
    return null;
  }

  if (isMac) {
    if (!probe.metaKey || probe.ctrlKey || probe.altKey) {
      return null;
    }
    if (probe.key === "[" || probe.code === "BracketLeft") {
      return "back";
    }
    if (probe.key === "]" || probe.code === "BracketRight") {
      return "forward";
    }
    return null;
  }

  if (!probe.altKey || probe.metaKey || probe.ctrlKey) {
    return null;
  }
  if (probe.key === "ArrowLeft") {
    return "back";
  }
  if (probe.key === "ArrowRight") {
    return "forward";
  }
  return null;
}

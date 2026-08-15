/**
 * Shared inline-gutter classes for the thread panel, so the real panel and its
 * loading skeleton stay pixel-aligned as content swaps in.
 */

/** Inline gutter around thread message rows. */
export const THREAD_PANEL_MESSAGE_GUTTER_CLASS = "px-2";

/** Inline gutter around the thread composer and its activity row. */
export const THREAD_PANEL_COMPOSER_GUTTER_CLASS = "px-5";

/**
 * Inner frame of a composer activity row (the `<Agent>: <status>` indicator and
 * the typing row). The row has to share its composer's frame, so it carries no
 * max-width of its own: the composer above it is only ever inset by the gutter
 * class, and a centered cap here indents the row once the surface is wider than
 * the cap. Shared by the channel composer and the thread panel so the two
 * cannot drift apart again.
 */
export const COMPOSER_ACTIVITY_ROW_CLASS =
  "flex w-full items-center gap-2 overflow-visible pl-2";

/**
 * Centers the reading column when a `columnMaxWidthPx` is supplied (focus-mode
 * drawer). `px-10` (40px) is the inline gutter between the column and the drawer
 * edges; the max-width itself is applied inline since it is a caller-provided
 * pixel value.
 */
export const THREAD_PANEL_COLUMN_CLASS = "mx-auto w-full px-10";

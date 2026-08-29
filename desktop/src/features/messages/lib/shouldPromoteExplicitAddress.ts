/** Whether an explicit @mention should pin into the persistent audience. */
export function shouldPromoteExplicitAddress(
  keepMentionedAgentsPinned: boolean,
): boolean {
  return keepMentionedAgentsPinned;
}

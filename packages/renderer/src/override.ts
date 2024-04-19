import { LayoutTreeProxyDraft, OverrideModule } from "./types";
import { assignRules } from "./utils";
import { PatchCommand } from "./types-layout";
import { getPathsFromDraft, createVirtualNode } from "./utils";


export function runOverrides(
  overrides: OverrideModule<any, any, any>[],
  props: Record<string, any>,
  draft: LayoutTreeProxyDraft
) {
  // patch layout
  overrides.forEach((override) => {
    // 兼容逻辑
    override.layout?.(props, draft);

    if (override.patchLayout) {
      const patchLayoutCommands: PatchCommand[] = override.patchLayout(
        props,
        draft
      );

      patchLayoutCommands?.forEach?.((cmd) => {
        doPatchLayoutCommand(cmd, draft);
      });
    }
    if (override.patchRules) {
      const rules = override.patchRules(props, draft);
      assignRules(draft, rules);
    }
  });
}


export function doPatchLayoutCommand(cmd: PatchCommand, draft: LayoutTreeProxyDraft) {
  if (cmd.condition === false) {
    return;
  }
  let parent = draft;

  const paths = getPathsFromDraft(cmd.parent);

  paths.forEach((path) => (parent = parent[path]));

  parent[cmd.op](createVirtualNode(cmd.child));
}

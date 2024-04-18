import { LayoutTreeProxyDraft, OverrideModule } from "./types";
import { PatchCommand } from "./types-layout";
import { doPatchLayoutCommand, assignRules } from "./utils";


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

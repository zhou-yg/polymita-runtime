import { expectType } from 'tsd'
import {
  Assign,
  CommandOP,
  DoPatchCommand,
  FlatPatchCommandsArr,
  PatchLayout,
  PatchLayoutWithCommands,
  PatchToLayoutChildren,
  PrintLayoutStructTree,
  RemoveItem
} from '../src/types-layout'

// interface BaseModuleL {
//   type: 'div',
//   children: [
//     string,
//   ]
// }

// type PCArr = [[{
//   readonly op: CommandOP.addChild;
//   readonly parent: readonly ["div"];
//   readonly child: {
//       type: "p";
//   };
// }]]

// type NewPC = readonly [{
//   readonly op: CommandOP.addChild;
//   // readonly parent: readonly ["div"];
//   readonly parent: readonly ["div", "p"];
//   readonly child: {
//       readonly type: 'text';
//       readonly children: readonly ['123'];
//   };
// }]

// type FlatPatchCommands = FlatPatchCommandsArr<[...PCArr, NewPC]>

// type NewL = PatchLayoutWithCommands<BaseModuleL, PCArr['0']>
// type NewLDisplay = PrintLayoutStructTree<NewL>
// type NewL2 = PatchLayoutWithCommands<NewL, NewPC>
// type NewL2Display = PrintLayoutStructTree<NewL2>

// type ContinuousPC = PatchLayoutWithCommands<BaseModuleL, FlatPatchCommands>
// type ContinuousPCDisplay = PrintLayoutStructTree<ContinuousPC>

// error

interface BaseModuleL2 {
  type: 'div'
  readonly children: readonly [
    string,
    {
      type: 'p'
    }
  ]
}
type NewPC2 = {
  readonly op: CommandOP.addChild
  readonly parent: readonly ['p']
  readonly child: {
    readonly type: 'text'
    readonly children: readonly ['123']
  }
}

type NewLError = DoPatchCommand<BaseModuleL2, NewPC2>
type NewLErrorDisplay = PrintLayoutStructTree<NewLError>

type NewLError2 = PatchLayoutWithCommands<BaseModuleL2, [NewPC2]>
type NewLError2Display = PrintLayoutStructTree<NewLError2>

type NewLError3 = PatchToLayoutChildren<BaseModuleL2['children'], NewPC2>
type NewLError3Display = PrintLayoutStructTree<NewLError3>

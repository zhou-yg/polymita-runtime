import type * as CSS from "csstype";
import type {
  VNodeComponentSymbol,
  VNodeFunctionComponentSymbol,
} from "./utils";
import type { ProxyLayoutHandler } from "./override";
import type { StateSignal } from "@polymita/signal-model";
import {
  LayoutStructTree,
  PatchCommand,
  PrintLayoutStructTree,
  ConvertToLayoutTreeDraft,
  ShallowCopyArray,
  FormatPatchCommands,
  PatchLayout,
  PatchLayoutWithCommands,
  FlatPatchCommandsArr,
  BaseDataType,
  Assign,
  CommandOP,
  PatchCommandBase,
  AttrsPathCommand,
} from "./types-layout";
import { PatternMatrix2 } from "./pattern";

// const root = {
//   div: {
//     span: {

//     }
//   },
//   props: {

//   }
// }
export type LayoutTreeDraft = {
  [key: string]: LayoutTreeDraft | any;
};
export type LayoutTreeProxyDraft = {
  [key: string]: LayoutTreeProxyDraft | any;
};

export interface StyleRule {
  target: ProxyLayoutHandler["draft"];
  condition?: boolean;
  style?: CSS.Properties;
  className?: string;
}

export interface PatternStructureResult {
  [propertyKey: string]: string[];
}

export interface PatternStructure {
  [mainSematic: string]: PatternStructureResult;
}

export type PC2ArrToOverrideModule<
  Props extends VirtualLayoutJSON["props"],
  L extends LayoutStructTree,
  PC2Arr
> = PC2Arr extends readonly [infer F, ...infer R]
  ? [OverrideModule<Props, L, F>, ...PC2ArrToOverrideModule<Props, L, R>]
  : PC2Arr;

export interface PropTypeValidator {
  (...args: any[]): any;
}

export interface SingleFileModule<
  Props extends VirtualLayoutJSON["props"],
  L extends LayoutStructTree,
  PC2Arr,
  ModuleName
> {
  base?: SingleFileModule<Props, L, PC2Arr, ModuleName>;
  namespace?: string;
  name?: ModuleName;
  meta?: {
    props: Props;
    layoutStruct: L;
    patchCommands: PC2Arr;
  };
  // layoutTree?: () => ConvertToLayoutTreeDraft<
  //   PatchLayoutWithCommands<L, FlatPatchCommandsArr<PC2Arr>>
  // >;
  layoutTree?: any;
  _layoutDraft?: ConvertToLayoutTreeDraft<
    PatchLayoutWithCommands<L, FlatPatchCommandsArr<PC2Arr>>
  >;
  _p?: Props;
  _fpc2Arr?: FlatPatchCommandsArr<PC2Arr>;
  _pc2Arr?: PC2Arr;
  _L?: L;
  layoutStruct?: PatchLayoutWithCommands<L, FlatPatchCommandsArr<PC2Arr>>;
  logic?: (...args: any[]) => Record<string, any> | void;
  layout?: (p?: Props) => VirtualLayoutJSON;
  designPattern?: (
    p?: Props,
    rootDraft?: ConvertToLayoutTreeDraft<
      PatchLayoutWithCommands<L, FlatPatchCommandsArr<PC2Arr>>
    >
  ) => PatternStructure | void;
  designPatterns?: (p?: Props) => PatternMatrix2;
  styleRules?: (
    p?: Props,
    rootDraft?: ConvertToLayoutTreeDraft<
      PatchLayoutWithCommands<L, FlatPatchCommandsArr<PC2Arr>>
    >
  ) => StyleRule[] | void;
  propTypes?: Record<string, PropTypeValidator>;
  config?: (...args: any[]) => ModuleConfig;
  override?: () => PC2ArrToOverrideModule<Props, L, PC2Arr>;
}

export interface VirtualLayoutJSON extends LayoutStructTree {
  key: any;
  flags: symbol | string;
  props: Record<string, any>;
  children?: (VirtualLayoutJSON | BaseDataType)[];
}

export type GlobalModulesLinkMap = Map<
  string,
  SingleFileModule<any, any, any, any>[]
>;
export type GlobalModulesActiveMap = string[];

export interface RenderHost {
  framework: {
    name: string;
    lib: any;
  };
  moduleOverride?: {
    enable?: boolean;
    modulesLinkMap?: GlobalModulesLinkMap;
    modulesActiveMap?: GlobalModulesActiveMap;
  };
  stateManagement?: {
    name: string; // default is 'signal'
    lib: any;
  };
  useEmotion?: boolean;
  // frameworkAPI?: {
  //   createElement: (
  //     tag: string | Function,
  //     props: Record<string, any>,
  //     children: VirtualLayoutJSON[]
  //   ) => any
  //   createFragment: (children: VirtualLayoutJSON[]) => any
  // }
}

type FrameworkVirtualNode = any;

export interface ModuleConfig {
  // default is 'signal'
  logicLib?: {
    name: string;
  };
}

export interface ModuleRenderContainer<
  Props extends VirtualLayoutJSON["props"],
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewRenderPC,
  ConstructProps,
  ModuleName
> {
  runLogic: (...args: any[]) => Record<string, any>;
  render: (json: VirtualLayoutJSON) => FrameworkVirtualNode;
  provide: (node: VirtualLayoutJSON, child: VirtualLayoutJSON) => void;
  construct: <NewConstructPC>(
    props?: ConstructProps,
    overrides?: [
      OverrideModule<
        Props,
        SingleFileModule<
          Props,
          L,
          [...PCArr, NewRenderPC],
          ModuleName
        >["layoutStruct"],
        NewRenderPC
      >,
      OverrideModule<
        Props,
        SingleFileModule<
          Props,
          L,
          [...PCArr, NewRenderPC, NewConstructPC],
          ModuleName
        >["layoutStruct"],
        NewConstructPC
      >
    ]
  ) => VirtualLayoutJSON;
  getLayout: <L extends LayoutStructTree>(
    props?: Props
  ) => ConvertToLayoutTreeDraft<L>;
}

export interface DraftPatch {
  op: CommandOP;
  path: string[];
  value?: (PatchCommandBase["target"] | AttrsPathCommand["attrs"]) & {
    condition?: boolean;
  };
}

export interface OverrideModule<
  Props extends VirtualLayoutJSON["props"] = unknown,
  L extends LayoutStructTree = any,
  PC = []
> {
  patches?: DraftPatch[];
  // patchRules?: (props: Props, root: ConvertToLayoutTreeDraft<L>) => StyleRule[];
  patchRules?: (props: Props, root: any) => StyleRule[];
  layout?: (props: Props, layoutDraft: LayoutTreeProxyDraft) => void;
  // patchLayout?: (props: Props, root: ConvertToLayoutTreeDraft<L>) => PC;
  patchLayout?: (props: Props, root: any) => PatchCommand[];
  patchLogic?: (props: Props, prevLogicResult: any) => any;
}

export type Func = (...args: any[]) => any;

export interface StateManagementMatch {
  renderFramework: string;
  stateManagement: string;
}

export interface StateManagementConfig {
  matches: StateManagementMatch[];
  runLogic: <T extends Func>(
    react: any,
    hook: T,
    args: Parameters<T>
  ) => ReturnType<T>;
  transform?: (json: VirtualLayoutJSON) => VirtualLayoutJSON;
  convertProps?: (
    props: any,
    propTypes?: Record<string, PropTypeValidator>
  ) => any;
}

export type RenderContainerConstructorOption = {
  useEmotion: boolean;
  modulesLinkMap?: RenderHost["moduleOverride"]["modulesLinkMap"];
  modulesActiveMap?: RenderHost["moduleOverride"]["modulesActiveMap"];
};

export type RenderContainerConstructor<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ConstructProps,
  ModuleName
> = (
  framework: any,
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  stateManagement: StateManagementConfig,
  options?: RenderContainerConstructorOption
) => ModuleRenderContainer<P, L, PCArr, NewPC, ConstructProps, ModuleName>;

export type SignalProps<T extends Record<string, any>> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? T[P]
    : StateSignal<T[P]>;
};

export type NormalizeProps<T extends Object> = {
  [K in keyof T]: T[K] extends StateSignal<infer T2> ? T2 : T[K];
};

export type VNodeComponent = (
  props?: VirtualLayoutJSON["props"]
) => VirtualLayoutJSON & {};

export type VNodeComponent2 = (...args: any[]) => any;

export interface FunctionComponent<Props> {
  (p: Props): VirtualLayoutJSON;
  [VNodeFunctionComponentSymbol]?: boolean;
}
export interface ComposeComponent<Props> {
  (p: Props): VirtualLayoutJSON;
  [VNodeComponentSymbol]: boolean;
}

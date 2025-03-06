/* @jsxFactory h  */
import {
  BaseDataType,
  CommandOP,
  extendModule,
  h,
  matchPatternMatrix,
  PrintLayoutStructTree,
  StyleRule,
  useLayout,
  useLogic,
  SingleFileModule,
  SignalProps,
  PropTypes,
  HOVER,
  createFunctionComponent,
  VirtualLayoutJSON,
  GlobalModulesLinkMap,
  registerModule,
} from "../src";
import { signal } from "@polymita/signal-model";

export interface MockReactElement {
  // $$typeof: symbol
  props: Record<string, any>;
  type: string | Function;
  children?:
    | (BaseDataType | MockReactElement)[]
    | MockReactElement
    | BaseDataType;
}

export const MockRectFramework = {
  name: "react",
  lib: {
    createElement(
      type: string | Function,
      props: Record<string, any> | null,
      ...children: MockReactElement[]
    ): MockReactElement {
      if (typeof type === "function") {
        if (children.length > 0) {
          props.children = children.length === 1 ? children[0] : children;
        }
        return type(props);
      }
      return {
        // $$typeof: Symbol.for('react.element'),
        type,
        props: props || {},
        children:
          children.length === 0
            ? undefined
            : children.length === 1
            ? children[0]
            : children,
      };
    },
    useRef: (v = null) => ({ current: v }),
    useState: (v = undefined) => [v, () => {}],
    useEffect: () => {},
  },
};

export function simpleModule(): SingleFileModule<{}, any, [], "unknown"> {
  return {
    logic() {
      return {};
    },
    layout() {
      return <div></div>;
    },
  };
}
export type SimpleModule2 = ReturnType<typeof simpleModule2>;
export function simpleModule2(): SingleFileModule<
  {},
  {
    type: "div";
    children: [
      {
        type: "p";
      }
    ];
  },
  [],
  "unknown"
> {
  return {
    logic() {
      return {};
    },
    layout() {
      return (
        <div>
          <p></p>
        </div>
      );
    },
  };
}
export type SimpleModule3 = ReturnType<typeof simpleModule3>;
export function simpleModule3(): SingleFileModule<
  { name: string; children?: VirtualLayoutJSON },
  {
    type: "div";
    children: [
      {
        type: "span";
      }
    ];
  },
  [],
  "unknown"
> {
  return {
    logic() {
      return {};
    },
    layout(p) {
      return (
        <div>
          <span>{p.name}</span>
          {p.children}
        </div>
      );
    },
  };
}

export function moduleHasMultipleChild(): SingleFileModule<
  {},
  {
    type: "div";
    children: [
      {
        type: "div";
      }
    ];
  },
  [],
  "ModuleHasMultipleChild"
> {
  return {
    name: "ModuleHasMultipleChild",
    logic() {
      return {};
    },
    layout() {
      return (
        <div id="1">
          <div>1</div>
          <div>2</div>
        </div>
      );
    },
  };
}

type LayoutUseLogicLayout = {
  type: "div";
};
type LayoutUseLogicFileModule = ReturnType<typeof layoutUseLogic>;
export function layoutUseLogic(): SingleFileModule<
  SignalProps<{ name: string }>,
  LayoutUseLogicLayout,
  [],
  "LayoutUseLogic"
> {
  return {
    name: "LayoutUseLogic",
    propTypes: {
      name: PropTypes.signal.isRequired,
    },
    logic() {
      return { num: 1 };
    },
    layout(props) {
      const logic = useLogic<{ num: number }>();
      return (
        <div name={props.name()} is-container>
          {logic.num}
        </div>
      );
    },
  };
}

type UseStyleInLayoutStruct = {
  type: "div";
  children: [
    {
      type: "span";
    }
  ];
};

export function useStyleInLayout(): SingleFileModule<
  SignalProps<{ name: string }>,
  UseStyleInLayoutStruct,
  [],
  "unknown"
> {
  return {
    propTypes: {
      name: PropTypes.signal.isRequired,
    },
    logic() {
      return { num: 1 };
    },
    layout(props) {
      const logic = useLogic<{ num: number }>();
      return (
        <div name={props.name()}>
          <span>{logic.num}</span>
        </div>
      );
    },
    styleRules(props) {
      const root = useLayout<UseStyleInLayoutStruct>();
      return [
        {
          target: root.div,
          style: {
            color: "red",
          },
        },
      ];
    },
  };
}

export function hasInputInLayout(): SingleFileModule<{}, any, [], "unknown"> {
  return {
    logic() {
      const num = signal(0);
      return { num };
    },
    layout() {
      const logic = useLogic<{ num: number }>();
      return (
        <div>
          <input value={logic.num} />
        </div>
      );
    },
  };
}

export function patternHasMultiMatchers(): SingleFileModule<
  SignalProps<{ v1: boolean; v2: boolean }>,
  any,
  [],
  "unknown"
> {
  return {
    propTypes: {
      v1: PropTypes.signal.isRequired,
      v2: PropTypes.signal.isRequired,
    },
    layout() {
      return <div is-container>i am container</div>;
    },
    designPattern(props) {
      const p = matchPatternMatrix([props.v1(), props.v2()])({
        container: {
          backgroundColor: {
            red: [true, false],
            green: [
              [false, true],
              [true, true],
            ],
          },
        },
      });
      return p;
    },
  };
}

export function patternHasMultiMatchers2(): SingleFileModule<
  SignalProps<{ v1: boolean }>,
  any,
  [],
  "unknown"
> {
  return {
    propTypes: {
      v1: PropTypes.signal.isRequired,
    },
    layout() {
      return <div is-container>i am container</div>;
    },
    designPattern(props) {
      const p = matchPatternMatrix([props.v1(), false, false, false])({
        container: {
          backgroundColor: {
            red: [],
            green: [
              [true, "*", "*", false],
              ["*", "*", true, false],
            ],
          },
        },
      });
      return p;
    },
  };
}

// for extend module

export interface LayoutHasTypesStruct {
  type: "div";
  children: [
    {
      type: "div";
    }
  ];
}

export function layoutHasTypes(): SingleFileModule<
  SignalProps<{ name: string }>,
  LayoutHasTypesStruct,
  [[]],
  "unknown"
> {
  return {
    propTypes: {
      name: PropTypes.signal.isRequired,
    },
    layout(props) {
      return (
        <div>
          <div>{props.name()}</div>
        </div>
      );
    },
    styleRules(): StyleRule[] {
      const root = useLayout<LayoutHasTypesStruct>();

      return [
        {
          target: root.div,
          condition: true,
          style: {
            color: "red",
          },
        },
      ];
    },
  };
}

export function layoutHasLogic(): SingleFileModule<
  { name: string },
  LayoutHasTypesStruct,
  [[]],
  "unknown"
> {
  return {
    logic(...args) {
      return {
        a: 1,
      };
    },
    layout(props) {
      return (
        <div>
          <div>{props.name}</div>
        </div>
      );
    },
  };
}

interface BaseModuleForOverrideProps {
  text: string;
}
interface BaseModuleForOverrideLayoutStruct {
  type: "div";
  children: [string];
}
function BaseModuleForOverride(): SingleFileModule<
  SignalProps<BaseModuleForOverrideProps>,
  BaseModuleForOverrideLayoutStruct,
  [],
  "unknown"
> {
  return {
    propTypes: {
      text: PropTypes.signal.isRequired,
    },
    layout(props) {
      return <div is-container>i am {props.text()}</div>;
    },
    styleRules(props, root) {
      return [
        {
          target: root.div,
          condition: true,
          style: {
            color: "red",
          },
        },
      ];
    },
  };
}

export function useSingleOverride() {
  const base = BaseModuleForOverride();
  const singleOverride = extendModule(base, () => ({
    patchLayout(
      props: SignalProps<BaseModuleForOverrideProps> & { show?: boolean },
      jsonDraft
    ) {
      return [
        {
          op: CommandOP.addChild,
          condition: props.show,
          target: jsonDraft.div,
          child: <span is-text>text</span>, // must type p
        },
      ];
    },
  }));

  const m2 = singleOverride;

  const m3 = extendModule(m2, () => ({
    patchLayout(props, root) {
      return [
        {
          op: CommandOP.addChild,
          target: root.div.span,
          child: <text></text>, // must type p
        },
      ];
    },
  }));
  // const m4 = extendModule(m3, () => ({
  //   patchLayout(props, root) {
  //     /** root expect ot be below
  //      * (parameter) root: {
  //           div: readonly ["div"] & {
  //               span: readonly ["div", "span"] & {
  //                   span: readonly ["div", "span", "span"];
  //               };
  //           };
  //       }
  //      */
  //   },
  // }));

  return m2;
}

export function overrideAtModuleLayer() {
  const m2 = extendModule(BaseModuleForOverride(), () => ({
    patchLayout(props, jsonDraft) {
      return [
        {
          op: CommandOP.addChild,
          target: jsonDraft.div,
          child: <p></p>,
        },
      ];
    },
  }));
  const m3 = extendModule(m2, () => ({
    patchLayout(props, jsonDraft) {
      return [
        {
          op: CommandOP.addChild,
          target: jsonDraft.div.p,
          child: <p></p>,
        },
      ];
    },
  }));

  return m2;
}

// export function overrideAtUseModule(): SingleFileModule<
//   SignalProps<{ m2Text: string }>,
//   { type: 'div' },
//   [],
//   'unknown'
// > {
//   const m2 = overrideAtModuleLayer()

//   type pc2Arr = (typeof m2)['_pc2Arr']

//   return {
//     layout(props) {
//       const UsedM2 = useComposeModule(m2, {
//         patchLayout(props, jsonDraft) {
//           return [
//             {
//               op: CommandOP.addChild,
//               target: jsonDraft.div.p,
//               child: <text>{123}</text>
//             }
//           ]
//         }
//       })

//       return (
//         <usingModule className="at-module">
//           <UsedM2 text={props.m2Text}></UsedM2>
//         </usingModule>
//       )
//     }
//   }
// }

// export function overrideAtUseModuleAndRender(): SingleFileModule<
//   SignalProps<{ m2Text: string }>,
//   { type: 'div' },
//   [],
//   'unknown'
// > {
//   const m2 = overrideAtModuleLayer()

//   type pc2Arr = (typeof m2)['_pc2Arr']

//   return {
//     layout(props) {
//       const UsedM2 = useComposeModule(m2, {
//         patchLayout(props, jsonDraft) {
//           return [
//             {
//               op: CommandOP.addChild,
//               target: jsonDraft.div.p,
//               child: (<text>123</text>) as unknown as {
//                 readonly type: 'text'
//                 readonly children: readonly ['123']
//               }
//             }
//           ]
//         }
//       })

//       return (
//         <usingModule className="at-module">
//           <UsedM2
//             text={props.m2Text}
//             checkerTypes={({ l, pcArr, newPC }) => {
//               type L = typeof l
//               type LDisplay = PrintLayoutStructTree<L>
//               type PCArr = typeof pcArr
//               type PC = typeof newPC
//               type FPC = FlatPatchCommandsArr<[...PCArr, PC]>
//               type NewL = PatchLayoutWithCommands<L, FPC>
//               type NewLDisplay = PrintLayoutStructTree<NewL>
//               type NewD = ConvertToLayoutTreeDraft<
//                 PatchLayoutWithCommands<L, FPC>
//               >
//             }}
//             override={{
//               patchLayout(props, jsonDraft) {
//                 type Draft = typeof jsonDraft
//                 return [
//                   {
//                     op: CommandOP.addChild,
//                     target: jsonDraft.div.p.text,
//                     child: <label>{456}</label>
//                   }
//                 ]
//               }
//             }}
//           ></UsedM2>
//         </usingModule>
//       )
//     }
//   }
// }

export function moduleHasNewDesignPatterns(): SingleFileModule<
  { name: string },
  any,
  any,
  "unknown"
> {
  return {
    layout() {
      return <div is-container selected={true} disabled={false}></div>;
    },
    designPatterns() {
      return [
        [HOVER, "selected", "disabled"],
        {
          container: {
            backgroundColor: {
              ["red"]: ["*", 1, 0],
              ["blue"]: ["*", 0, 1],
            },
          },
        },
      ];
    },
  };
}

export function overridePatchRules() {
  const base = layoutHasTypes();
  const newModule = extendModule(base, () => ({
    patchRules(props: SignalProps<{ name: string }> & { show: boolean }, root) {
      return [
        {
          target: root.div.div,
          condition: props.show,
          style: {
            color: "green",
          },
        },
      ];
    },
  }));

  return newModule;
}

export function overrideAtUseModule(): SingleFileModule<
  SignalProps<{ m2Text: string }>,
  { type: "div" },
  [],
  "unknown"
> {
  const m2 = overrideAtModuleLayer();

  type pc2Arr = (typeof m2)["_pc2Arr"];

  const UsedM2 = createFunctionComponent(m2, {
    patchLayout(props, jsonDraft) {
      return [
        {
          op: CommandOP.addChild,
          target: jsonDraft.div.p,
          child: <text>{123}</text>,
        },
      ];
    },
  });
  return {
    layout(props) {
      return (
        <usingModule className="at-module">
          <UsedM2 text={props.m2Text}></UsedM2>
        </usingModule>
      );
    },
  };
}

export function overrideAtUseModuleAndRender(): SingleFileModule<
  SignalProps<{ m2Text: string }>,
  { type: "div" },
  [],
  "unknown"
> {
  const m2 = overrideAtModuleLayer();

  type pc2Arr = (typeof m2)["_pc2Arr"];

  const UsedM2 = createFunctionComponent(m2, {
    patchLayout(props, jsonDraft) {
      return [
        {
          op: CommandOP.addChild,
          target: jsonDraft.div.p,
          child: <text>123</text>,
        },
      ];
    },
  });
  return {
    layout(props) {
      return (
        <usingModule className="at-module">
          <UsedM2
            text={props.m2Text}
            override={{
              patchLayout(props, jsonDraft) {
                type Draft = typeof jsonDraft;
                return [
                  {
                    op: CommandOP.addChild,
                    target: jsonDraft.div.p.text,
                    child: <label>{456}</label>,
                  },
                ];
              },
            }}
          ></UsedM2>
        </usingModule>
      );
    },
  };
}

function pageModuleContributor1(): SingleFileModule<
  {},
  {
    type: "pageContributor";
    children: [{ type: "contributorTitle" }, { type: "contributorContent" }];
  },
  [],
  "Contributor1"
> {
  return {
    namespace: "page-contributor1",
    name: "Contributor1",
    layout(props) {
      return (
        <pageContributor>
          <contributorTitle>title</contributorTitle>
          <contributorContent>content</contributorContent>
        </pageContributor>
      );
    },
  };
}

const testModules: GlobalModulesLinkMap = new Map();

export const getTestModules = () => testModules;

export function overridePageModuleContributor1() {
  const m = pageModuleContributor1();
  const m2 = extendModule(m, () => ({
    namespace: "new-module",
    patchLayout(props, draft) {
      return [
        {
          op: CommandOP.addChild,
          target: draft.pageContributor,
          child: <newChild>new</newChild>,
        },
      ];
    },
  }));
  Object.assign(m2, {
    namespace: "mock-override",
    name: "NewContributor",
  });

  registerModule(m2, testModules);
}

export function rootPageModule(): SingleFileModule<
  {},
  { type: "div" },
  [],
  "unknown"
> {
  const contributor1Module = pageModuleContributor1();
  registerModule(contributor1Module, testModules);

  const Contributor1ModuleFC = createFunctionComponent(contributor1Module);

  return {
    namespace: "root-page",
    layout(props) {
      return (
        <div>
          <Contributor1ModuleFC />
        </div>
      );
    },
  };
}

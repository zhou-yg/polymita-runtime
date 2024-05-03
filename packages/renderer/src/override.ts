import {
  DraftPatch,
  GlobalModulesActiveMap,
  GlobalModulesLinkMap,
  LayoutTreeDraft,
  LayoutTreeProxyDraft,
  OverrideModule,
  SingleFileModule,
  StyleRule,
  VirtualLayoutJSON,
} from "./types";
import {
  createVirtualNode,
  get,
  isFunctionComponentPath,
  isVirtualNode,
  isVNodeFunctionComponent,
  set,
} from "./utils";
import {
  AttrsPathCommand,
  BaseDataType,
  CommandOP,
  LayoutStructTree,
  PatchCommand,
} from "./types-layout";
import { deepClone } from "./lib/deepClone";

const ExportPropKey = "props";

/**
 * eg:
 *  json: ['div', MyCpt, 'div']
 */
export function buildLayoutNestedObj<T extends LayoutStructTree>(
  json: VirtualLayoutJSON
): LayoutTreeDraft {
  let root: LayoutTreeDraft = {};

  function buildRoot(
    target: LayoutTreeDraft,
    source: VirtualLayoutJSON | BaseDataType
  ) {
    if (isVirtualNode(source)) {
      const tag = source?.type;
      if (typeof tag === "string") {
        /**
         * @TODO how to keep reference to original "props object"?
         */
        target[tag] = <LayoutTreeDraft>{
          [ExportPropKey]: source.props,
        };
        if (Array.isArray(source.children) || isVirtualNode(source.children)) {
          [].concat(source.children).forEach((child) => {
            buildRoot(target[tag], child);
          });
        }
      } else {
        /**
         * @TODO support custom component
         */
      }
    }
  }

  buildRoot(root, json);

  return root;
}

export const handlerPathKeySymbol = Symbol.for("handlerPathKeySymbol");
export type ProxyLayoutHandler = ReturnType<typeof proxyLayoutJSON>;

const draftOperationMethodSymbol = Symbol.for("draftOperationMethod");

/**
 * key point: apply path to children array with same tag
 * patch[]{
 *   path: ['div', 'div', 'props', 'id'],
 * }
 */

const DRAFT_OPERATES = [
  CommandOP.addChild,
  CommandOP.addFirst,
  CommandOP.remove,
  CommandOP.replace,
  CommandOP.assignAttrs,
  //
  CommandOP.wrap,
  CommandOP.wrapFirst,
  CommandOP.wrapLast,
];

export function getPathsFromDraft(target: any): string[] {
  return target[handlerPathKeySymbol];
}
/**
 * 代理json并记录patch
 * 关键要点：因为有同名节点的存在，同一数组下的同名节点会被合并
 *
 * 返回的是 Proxy对象，只需要考虑 Object，只收集 set
 */
export function proxyLayoutJSON(json: VirtualLayoutJSON) {
  const patches: DraftPatch[] = [];

  const jsonTree = buildLayoutNestedObj(json);

  function createProxy(source: LayoutTreeDraft, pathArr: string[] = []) {
    const clonedTarget = deepClone(source);
    const proxy = new Proxy(clonedTarget, {
      get(target, key: string | symbol | CommandOP) {
        if (key === handlerPathKeySymbol) {
          return pathArr;
        }
        const v = Reflect.get(target, key);
        // console.log('target=', target, 'key=', key, 'value=',v);
        if (typeof key === "string") {
          if (DRAFT_OPERATES.includes(key as CommandOP)) {
            return createProxy(
              Object.assign(() => {}, { [draftOperationMethodSymbol]: key }),
              pathArr
            );
          } else if (typeof v === "object" || v === undefined || v === null) {
            return createProxy(
              v || { [fakeProxyObjectSymbol]: true },
              pathArr.concat(key)
            );
          }
        }
        return v;
      },
      set(source, key: string, value: any) {
        const currentPathArr = pathArr.concat(key);
        patches.push({
          op: CommandOP.setAttrs,
          path: currentPathArr,
          value: deepClone(value),
        });
        Reflect.set(source, key, value);
        return true;
      },
      apply(target: any, thisArg, argArray) {
        // console.log('argArray: ', argArray);
        // console.log('target: ', target[draftOperationMethodSymbol]);
        const currentPathArr = pathArr;
        const op: CommandOP = target[draftOperationMethodSymbol];
        patches.push({
          op,
          path: currentPathArr,
          value: argArray[0],
        });
      },
    });
    return proxy;
  }

  function commit() {}

  function applyPatches() {
    const newObj = applyJSONTreePatches(json, patches);

    return newObj;
  }

  function appendPatches(ps: DraftPatch[] = []) {
    patches.push(...ps);
  }

  // 此处的类型应该根据 layout 结构生成得出，但这里是通用方法，无法精确取得类型
  const draftJSON = createProxy(jsonTree);

  return {
    draft: draftJSON,
    append: appendPatches,
    apply: applyPatches,
  };
}

export function applyJSONTreePatches(
  source: VirtualLayoutJSON,
  patches: DraftPatch[]
) {
  const target: VirtualLayoutJSON = source;

  // console.log('patches: ', patches);

  for (const patch of patches) {
    const { op, path, value } = patch;

    const [current, i] = getVirtualNodesByPath(target, path);
    let parent: VirtualLayoutJSON[] = []
    if (path.length > 1) {
      parent = getVirtualNodesByPath(target, path.slice(0, -1))[0]
    }

    if (isVNodeFunctionComponent(current[0])) {
      mergeConstructOverrideToNode(current, i, patch);
    } else {
      assignPatchToNode(parent, current, i, patch);
    }
  }

  return target;
}

function equalNode (n1: VirtualLayoutJSON, n2: VirtualLayoutJSON) {
  return typeof n1 === 'object' && typeof n2 === 'object' && n1.type === n2.type
}
function nodeExists (n1: VirtualLayoutJSON[], n2: VirtualLayoutJSON | BaseDataType) {
  return typeof n2 === 'object' && n1.find(c => c.type === n2.type)
}

function assignPatchToNode(
  parent: VirtualLayoutJSON[],
  current: VirtualLayoutJSON[],
  depth: number,
  patch: DraftPatch
) {
  const { op, path, value } = patch;
  const jsonValue = value as VirtualLayoutJSON
  switch (op) {
    case CommandOP.replace:
      parent.forEach(p => {
        p.children = p.children.map((child) => {
          return nodeExists(current, child) ? jsonValue : child
        })
      })
      break;
    case CommandOP.addFirst:
      current.forEach((node) => {
        if (node.children) {
          node.children = [jsonValue, ...node.children];
        } else {
          node.children = [jsonValue];
        }
      });
      break;
    case CommandOP.addChild:
      current.forEach((node) => {
        if (node.children) {
          node.children = [].concat(node.children).concat(jsonValue);
        } else {
          node.children = [jsonValue];
        }
      });
      break;
    case CommandOP.remove:
      parent.forEach(p => {
        p.children = p.children.filter((child, index) => {
          return !nodeExists(current, child)
        })
      })
      break;
    case CommandOP.setAttrs:
      const restKeys = path.slice(depth + 1);
      current.forEach((node) => {
        set(node, restKeys, value);
      });
      break
    case CommandOP.assignAttrs:
      current.forEach(node => {
        Object.assign(node.props, value)
      })
      break
    case CommandOP.wrap:
      parent.forEach(pNode => {
        pNode.children.forEach((child, i) => {
          if (nodeExists(current, child)) {
            const v = deepClone(jsonValue)
            pNode.children[i] = v
            v.children = [child]
          }
        })
      })
      break
    case CommandOP.wrapFirst:
      parent.forEach(pNode => {
        let found = false
        pNode.children.forEach((child, i) => {
          if (nodeExists(current, child) && !found) {
            const v = deepClone(jsonValue)
            pNode.children[i] = v
            v.children = [child]
            found = true
          }
        })
      })
      break
    case CommandOP.wrapLast:
      parent.forEach(pNode => {
        let foundIndex = -1
        pNode.children.forEach((child, i) => {
          if (nodeExists(current, child)) {
            foundIndex = i
          }
        })
        if (foundIndex > -1) {
          jsonValue.children = [pNode.children[foundIndex]]
          pNode.children[foundIndex] = jsonValue
        }
      })
      break;
  }
}

function mergeConstructOverrideToNode(
  nodes: VirtualLayoutJSON[],
  i: number,
  patch: DraftPatch
) {
  const { op, path, value } = patch;
  const newPath = path.slice(i + 1);

  const newPatch = {
    ...patch,
    path: newPath,
  };
  nodes.forEach((n) => {
    if (!n.props) {
      n.props = {};
    }
    if (n.props.override?.patches) {
      n.props.override.patches.push(newPatch);
    } else {
      n.props.override = Object.assign(n.props.override || {}, {
        patches: [newPatch],
      });
    }
  });
}
/**
 * source = div/p/span, path=['div'] => div, 1
 * source = div/span/span, path=['div', 'p'] => null, 1
 * source = div/p/span, path=['div', 'p', 'props'] => 2
 */
export function getVirtualNodesByPath(
  source: VirtualLayoutJSON,
  path: (string | number)[]
): [VirtualLayoutJSON[], number] {
  let current = [source];
  let i = 0;
  for (; i < path.length; i++) {
    const type = path[i];

    if (isFunctionComponentPath(type)) {
      current = current.filter(
        (n) => isVNodeFunctionComponent(n) && n.type.name === type
      );
      break;
    }

    const newCurrent: VirtualLayoutJSON[] = [];
    for (const node of current) {
      if (isVirtualNode(node)) {
        if (node.type === type) {
          newCurrent.push(node);
        }
      }
    }
    if (newCurrent.length === 0) {
      break;
    }

    const nextType = path[i + 1];

    if (nextType) {
      const nextChildren = newCurrent
        .map((n) =>
          n.children.filter((n) => {
            if (isVirtualNode(n)) {
              if (isVNodeFunctionComponent(n)) {
                return n.type.name === nextType;
              }
              return n.type === nextType;
            }
          })
        )
        .flat() as VirtualLayoutJSON[];

      if (nextChildren.length === 0) {
        break;
      }
      current = nextChildren;
    }
  }

  return [current, i];
}

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

export function doPatchLayoutCommand(
  cmd: PatchCommand,
  draft: LayoutTreeProxyDraft
) {
  if (cmd?.condition === false) {
    return;
  }
  let parent = draft;

  const paths = getPathsFromDraft(cmd.target);

  paths.forEach((path) => (parent = parent[path]));
  if (
    cmd.op === CommandOP.addChild || 
    cmd.op === CommandOP.addFirst || 
    cmd.op === CommandOP.replace
  ) {
    parent[cmd.op](cmd.child);
  } else if (cmd.op === CommandOP.remove) {
    parent[cmd.op]();
  } else if (cmd.op === CommandOP.assignAttrs) {
    parent[cmd.op](cmd.attrs);
  } else if (cmd.op === CommandOP.wrap || cmd.op === CommandOP.wrapFirst || cmd.op === CommandOP.wrapLast) {
    parent[cmd.op](cmd.parent);
  }
}

const fakeProxyObjectSymbol = Symbol.for("fakeProxyObjectSymbol");

function isFake(obj: any) {
  return obj && obj[fakeProxyObjectSymbol];
}

export function assignRules(draft: LayoutTreeProxyDraft, rules: StyleRule[]) {
  for (const rule of rules) {
    const { condition, target: draftTarget, style, className } = rule;
    if (!!condition || condition === undefined) {
      const pathInDraft: string[] = getPathsFromDraft(draftTarget);
      if (style) {
        const stylePath = pathInDraft.concat(["props", "style"]);

        const styleObj = get(draft, stylePath);
        if (isFake(styleObj)) {
          set(draft, stylePath, {});
        }
        Object.entries(style).forEach(([k, v]) => {
          set(draft, stylePath.concat(k), v);
        });
      }
      if (className) {
        const classNamePath = pathInDraft.concat(["props", "className"]);
        set(draft, classNamePath, className);
      }
    }
  }
}


const moduleIndexKey = (m: SingleFileModule<any, any, any, any>) => `${m.namespace}-${m.name}`

export function getModulesByBase (m: SingleFileModule<any, any, any, any>, mp: GlobalModulesLinkMap) {
  const key = moduleIndexKey(m)
  const modules = mp.get(key)

  return (modules || []).filter(m => {
    return key !== moduleIndexKey(m)
  })
}

export function getActiveModuleByBase (
  m: SingleFileModule<any, any, any, any>,
  mp: GlobalModulesLinkMap,
  activeSet: GlobalModulesActiveMap
): SingleFileModule<any, any, any, any>[] | void{
  if (m && activeSet) {
    const key = moduleIndexKey(m)
    const modules = mp.get(key)
    let result: [number, SingleFileModule<any, any, any, any>][] = []
    modules.forEach(m => {
      const i = activeSet.indexOf(moduleIndexKey(m))
      if (i >= 0) {
        result.push([i, m])
      }
    })
    return result.sort((a, b) => a[0] - b[0]).map(arr => arr[1])
  }
}


export function registerModule (m: SingleFileModule<any, any, any, any>, mp: GlobalModulesLinkMap) {
  const key = moduleIndexKey(m)
  const modules = mp.get(key)
  if (modules) {
    if (!modules.includes(m)) {
      modules.push(m)
    }
  } else {
    mp.set(key, [m])
  }

  if (m.base) {
    const baseKey = moduleIndexKey(m.base) 
    const modules = mp.get(baseKey)
    modules?.push(m)
  }
}

export function mergeOverrideModules(modules: SingleFileModule<any, any, any, any>[]) {
  if (modules.length > 1) {
    return modules.reduce((p, n) => {
      return extendModule(p, n.override)
    })
  }
  return modules[0]
}

export function extendModule<
  Props,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewProps extends Props,
  NewPC,
  ModuleName
>(
  module: SingleFileModule<Props, L, PCArr, ModuleName>,
  override: () => OverrideModule<
    NewProps,
    SingleFileModule<NewProps, L, PCArr, ModuleName>["layoutStruct"],
    NewPC
  >
) {
  const newModule = {
    ...module,
    base: module,
    override() {
      const p1 = module.override?.() || [];
      const p2 = override();
      return [...p1, p2];
    },
  } as unknown as SingleFileModule<
    NewProps,
    L,
    any, // [...PCArr, FormatPatchCommands<NewPC>],
    ModuleName
  >;

  return newModule
}
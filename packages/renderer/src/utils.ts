import { isSignal, get, set } from "@polymita/signal-model";
import {
  VirtualLayoutJSON,
  LayoutTreeProxyDraft,
  StyleRule,
  PatternStructure,
  StateManagementMatch,
  PatternStructureResult,
  LayoutTreeDraft,
  PropTypeValidator,
  DraftPatch,
} from "./types";
import { deepClone } from "./lib/deepClone";
import { css } from "@emotion/css";
import {
  LayoutStructTree,
  PatchCommand,
  BaseDataType,
  CommandOP,
} from "./types-layout";
import { typeDefaultValueFlagSymbol } from "./lib/propTypes";

// (window as any).ecss = css;

export { set, get } from "@polymita/signal-model";

export { isFunction } from "./lib/serialize";

export function mergeFromProps(
  json: VirtualLayoutJSON,
  props: Record<string, any>,
  keys: string[]
) {
  keys.forEach((key) => {
    const val = props[key];
    if (val) {
      if (json.props[key]) {
        json.props[key] = `${json.props[key]} ${val}`;
      } else {
        json.props[key] = val;
      }
    }
  });
  return json;
}

/**
 * key point: pattern implicitly match every JSON Node
 */
export const SEMATIC_RELATION_IS = "is";
export const SEMATIC_RELATION_HAS = "has";
export function checkSematic(
  sematic: string,
  props: VirtualLayoutJSON["props"]
) {
  let result = false;
  const kvArr = Object.entries(props);
  for (const [k, v] of kvArr) {
    const [relationField, ...sematicArr] = k.split("-");
    if (relationField === SEMATIC_RELATION_IS && sematicArr.length > 1) {
      throw new Error(
        "[checkSematic] the node can not be multiply sematic at the same time"
      );
    }
    if ([SEMATIC_RELATION_IS, SEMATIC_RELATION_HAS].includes(relationField)) {
      result = result || sematicArr.includes(sematic);
    }
    if (result) {
      break;
    }
  }
  return result;
}

export function camelToLine(str: string) {
  return str
    .replace(/^[A-Z]/, (firstChar) => firstChar.toLocaleLowerCase())
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase();
}

function patternResultToEmotionCSS(
  style: PatternStructureResult,
  pseudo?: string
) {
  let styleRows: string[] = [];
  Object.entries(style || {}).forEach(([k, v]) => {
    const r = Array.isArray(v) ? last(v) : v;
    styleRows.push(`${camelToLine(k)}: ${r};`);
  });

  return css`
    ${styleRows.join("\n")}
  `;
}

export function assignPattern(
  json: VirtualLayoutJSON,
  pattern: PatternStructure,
  useEmotion?: boolean
): VirtualLayoutJSON {
  // const source = deepClone(json)
  const source = json;

  traverseLayoutTree(source, (node) => {
    const { props } = node;
    for (const sematic in pattern) {
      if (checkSematic(sematic, props)) {
        const style = pattern[sematic];
        if (useEmotion) {
          const cls = patternResultToEmotionCSS(style);
          if (props.className) {
            props.className = `${props.className} ${cls}`;
          } else {
            props.className = cls;
          }
        } else {
          if (!props.style) {
            props.style = {};
          }
          Object.entries(style).forEach(([k, v]) => {
            props.style[k] = Array.isArray(v) ? last(v) : v;
          });
        }
      }
    }
  });
  return source;
}
type PatternStructureValueMatcher =
  | (number | string | boolean)[]
  | (number | string | boolean)[][];

type MatcherValueOrStar<T extends PatternStructureValueMatcher> = {
  [K in keyof T]: T[K] | "*";
};

interface PatternMatrix {
  [mainSematic: string]: {
    [propertyKey: string]: {
      [value: string]: PatternStructureValueMatcher;
    };
  };
}

function equalMatcher(setting: any[] | any[][], inputs: any[]) {
  return (
    setting.every((v, i) => v === inputs[i] || v === "*") ||
    setting.some((arr2) => {
      if (Array.isArray(arr2)) {
        return equalMatcher(arr2, inputs);
      }
      return false;
    })
  );
}

export function matchPatternMatrix<T extends PatternStructureValueMatcher>(
  patternInputs: T
) {
  return (ps: PatternMatrix) => {
    let result: PatternStructure = {};
    for (let mainSemantic in ps) {
      result[mainSemantic] = {};
      for (let propertyKey in ps[mainSemantic]) {
        result[mainSemantic][propertyKey] = [];
        for (let value in ps[mainSemantic][propertyKey]) {
          const matcher = ps[mainSemantic][propertyKey][value];

          if (equalMatcher(matcher, patternInputs) || matcher.length === 0) {
            result[mainSemantic][propertyKey].push(value);
          }
        }
      }
    }
    return result;
  };
}
// in html attributes
export const renderHTMLProp = "_html";

export const VirtualNodeTypeSymbol = Symbol.for("polymitaVirtualNodeSymbol");

export function isVirtualNode(node: any): node is VirtualLayoutJSON {
  return (
    node &&
    typeof node === "object" &&
    "type" in node &&
    "props" in node &&
    "children" in node &&
    node.flags === VirtualNodeTypeSymbol
  );
}

export function isReactComponent(
  node: any
): node is { $$typeof: Symbol; render: Function } {
  // export function isReactComponent(node: any): node is any {
  return "$$typeof" in node && node.render && typeof node.render === "function";
}

/**
 * uppercase path means it is a Module Component
 */
export function isFunctionComponentPath(path: string | number) {
  return /^[A-Z]/.test(String(path));
}

export function isFunctionVNode(node: VirtualLayoutJSON) {
  return typeof node.type === "function";
}

function mergeLayoutAttributes(exist: any, value: any) {
  const type = typeof value;
  if (typeof exist !== type) {
    return value;
  }
  switch (type) {
    case "string":
      return exist + value;
    case "object":
      return Object.assign({}, exist, value);
    default:
      return value;
  }
}

let max = 1e3;
export function traverse(
  obj: any,
  callback: (k: string[], v: any) => boolean | void,
  path: string[] = [],
  cache: Set<any> = new Set()
) {
  if (cache.has(obj)) {
    return;
  }
  cache.add(obj);
  if (callback(path, obj) !== false) {
    if (!obj || typeof obj !== "object") return;
    for (let k in obj) {
      const v = obj[k];
      if (callback(path.concat(k), v) !== false) {
        traverse(v, callback, path.concat(k), cache);
      }
    }
  }
}

export function traverseLayoutTree(
  layoutTree: VirtualLayoutJSON | any,
  callback: (n: VirtualLayoutJSON) => void
) {
  if (isVirtualNode(layoutTree)) {
    callback(layoutTree);

    if (layoutTree.children) {
      if (Array.isArray(layoutTree.children)) {
        layoutTree.children.forEach((child) => {
          traverseLayoutTree(child, callback);
        });
      } else {
        traverseLayoutTree(layoutTree.children, callback);
      }
    }
  }
}

/** fork from swr */
export const isArray = Array.isArray;

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export const VNodeComponentSymbol = Symbol("VNodeComponentSymbol");
export const VNodeFunctionComponentSymbol = Symbol(
  "VNodeFunctionComponentSymbol"
);
export const VNodeFunctionComponentOriginModuleSymbol = Symbol(
  "VNodeFunctionComponentOriginModuleSymbol"
);
export function getModuleFromFunctionComponent(f: any) {
  return f[VNodeFunctionComponentOriginModuleSymbol];
}

export function isVNodeComponent(target: any): target is { type: Function } {
  return !!target?.type?.[VNodeComponentSymbol];
}
export function isVNodeFunctionComponent(
  target: any
): target is { type: Function } {
  return !!target?.type?.[VNodeFunctionComponentSymbol];
}

export function assignDefaultValueByPropTypes<T extends Record<string, any>>(
  props: T,
  propTypes?: Record<string, PropTypeValidator>
): T {
  if (!propTypes) {
    return props;
  }

  const r: Record<string, any> = {};
  Object.keys(propTypes).forEach((key) => {
    if (props[key] === undefined) {
      const defaultValue = propTypes?.[key]?.[typeDefaultValueFlagSymbol];
      if (defaultValue !== undefined) {
        if (isSignal(defaultValue)) {
          console.error(
            `[propTypes] props.${key} is return a signal directly, it maybe cause some unexpected error.`
          );
        }
        r[key] =
          typeof defaultValue === "function" ? defaultValue() : defaultValue;
      }
    }
  });

  return Object.assign({}, props, r);
}

export const ShouldRenderAttr = "if";
export function shouldNotRender(json: VirtualLayoutJSON) {
  return typeof json?.type !== "function" && json?.props?.if === false;
}

export function lowerCaseType(type: LayoutStructTree["type"]) {
  return typeof type === "string" ? camelToLine(type) : type;
}
/**
 * fork from https://github.com/JedWatson/classnames/blob/main/index.js
 */
const hasOwn = {}.hasOwnProperty;
export function classNames(
  ...args: (string | number | Record<string, boolean> | (string | number)[])[]
) {
  var classes = [];

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    if (!arg) continue;

    var argType = typeof arg;

    if (argType === "string" || argType === "number") {
      classes.push(arg);
    } else if (Array.isArray(arg)) {
      if (arg.length) {
        var inner = classNames.apply(null, arg);
        if (inner) {
          classes.push(inner);
        }
      }
    } else if (argType === "object") {
      if (
        arg.toString !== Object.prototype.toString &&
        !arg.toString.toString().includes("[native code]")
      ) {
        classes.push(arg.toString());
        continue;
      }

      for (var key in arg as object) {
        if (hasOwn.call(arg, key) && arg[key]) {
          classes.push(key);
        }
      }
    }
  }
  return classes.join(" ");
}
export const classnames = classNames;

export function getNodeType(type: string | Function, props: { as?: string }) {
  return lowerCaseType(props?.as || type);
}

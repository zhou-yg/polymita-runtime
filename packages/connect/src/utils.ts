import { set } from "@polymita/signal-model";

export function traverse(
  target: Record<string, any>,
  callback: (arrPath: string[], value: any) => void,
  parentKeys?: string[]
) {
  if (!parentKeys) {
    parentKeys = [];
  }
  Object.entries(target).forEach(([key, value]) => {
    const currentKeys = parentKeys.concat(key);
    callback(currentKeys, value);
    if (typeof value === "object" && value) {
      traverse(value, callback, currentKeys);
    }
  });
}

const undefTag = "__tarat_undefined_placeholder_tag__";

export function stringifyWithUndef(data: object) {
  return JSON.stringify(data, (k, v) => {
    return v === undefined ? undefTag : v;
  });
}

export function parseWithUndef(str: string) {
  return JSON.parse(str, (k, v) => {
    if (v === undefTag) {
      return undefined;
    }
    return v;
  });
}

export const BINARY_FILE_TYPE_PLACEHOLDER = "@binary:FILE";
export const BINARY_FILE_KEY_SPLIT_CHAR = ".";

export function isBinaryType(v: any) {
  return v instanceof File;
}

/**
 * @TODO support more data type: Blob, ArrayBuffer
 */
export function serializeJSON(obj: Record<string, any>) {
  let hasBinary = false;
  traverse(obj, (kArr, value) => {
    hasBinary = hasBinary || isBinaryType(value);
  });
  console.log("hasBinary: ", hasBinary);
  // transform it to FormData
  if (hasBinary) {
    const fileKeysMap: Array<[(string | number)[], File]> = [];
    traverse(obj, (kArr, value) => {
      if (isBinaryType(value)) {
        fileKeysMap.push([kArr, value]);
      }
    });
    fileKeysMap.forEach(([kArr, value]) => {
      set(obj, kArr, BINARY_FILE_TYPE_PLACEHOLDER);
      const binaryTempKey = kArr.join(BINARY_FILE_KEY_SPLIT_CHAR);
      obj[binaryTempKey] = value;
    });

    const fd = new FormData();

    Object.entries(obj).forEach(([k, v]) => {
      if (isBinaryType(v)) {
        fd.append(k, v);
      } else {
        fd.append(k, stringifyWithUndef(v));
      }
    });
    return fd;
  }
  return stringifyWithUndef(obj);
}

// @ts
export * from "./render.new";
export * from "./types";
export * from "./types-layout";
export * from "./utils";
export * from "./lib/propTypes";
export * from "./pattern";
//
export * from "./extensions/frameworks/react";
export * from "./extensions/stateManagements/react-signal";

import PKG from "../package.json";
if (typeof window !== "undefined") {
  if (window["@polymita/renderer"]) {
    throw new Error("[@polymita/renderer] already loaded");
  }
  // @ts-ignore
  window["@polymita/renderer"] = {
    version: PKG.version,
  };
}

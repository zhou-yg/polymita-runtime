var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b ||= {})
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// .tarat/server/app/routes.server.tsx
var routes_server_exports = {};
__export(routes_server_exports, {
  default: () => _TaratRootApplication,
  getReactAdaptor: () => import_connect3.getReactAdaptor
});
module.exports = __toCommonJS(routes_server_exports);
var import_react4 = __toESM(require("react"));
var import_react_router_dom = require("react-router-dom");
var import_server = require("react-router-dom/server");
var import_connect2 = require("@polymita/connect");
var import_connect3 = require("@polymita/connect");

// app/_app.tsx
var import_react = __toESM(require("react"));
var App = (props) => {
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "file-uploader-app" }, props.children);
};
var app_default = App;

// app/pages/main.tsx
var import_react3 = __toESM(require("react"));
var import_connect = require("@polymita/connect");

// views/uploader.tsx
var import_react2 = __toESM(require("react"));
var Uploader = (props) => {
  const uploader2 = props;
  const f = uploader2.inputFile();
  const OSSLink = uploader2.OSSLink();
  const isImg = /\.(png|jpg)$/.test(OSSLink == null ? void 0 : OSSLink.link);
  return /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("p", null, !isImg && f && OSSLink ? /* @__PURE__ */ import_react2.default.createElement("a", { href: OSSLink.link, target: "_blank" }, f.name) : "", isImg && f && OSSLink ? /* @__PURE__ */ import_react2.default.createElement("img", { src: OSSLink.link, width: "200" }) : ""), /* @__PURE__ */ import_react2.default.createElement("br", null), /* @__PURE__ */ import_react2.default.createElement("input", { type: "file", defaultValue: "", onChange: (e) => {
    const f2 = e.target.files[0];
    uploader2.inputFile(() => f2);
  } }));
};
var uploader_default = Uploader;

// drivers/uploader.ts
var import_signal_model = require("@polymita/signal-model");
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));

// models/indexes.json
var indexes_default = {
  uploaderItem: "uploaderItem"
};

// drivers/uploader.ts
function uploader() {
  const inputFile = (0, import_signal_model.state)();
  const OSSLink = (0, import_signal_model.computedInServer)(function* () {
    const file = inputFile();
    if (file) {
      const publicDir = path.join(process.cwd(), "public");
      const destFile = path.join(publicDir, file.originalFilename);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      yield new Promise((resolve) => {
        fs.createReadStream(file.filepath).pipe(fs.createWriteStream(destFile)).on("close", () => resolve(0)).on("error", () => {
          throw new Error("copy file to public dir fail");
        });
      });
      return {
        name: file.newFilename,
        link: `/${file.originalFilename}`
      };
    }
  });
  const fileStorage = (0, import_signal_model.prisma)(indexes_default.uploaderItem, () => void 0, {
    immediate: false
  });
  const writeFileStroage = (0, import_signal_model.writePrisma)(fileStorage, () => {
    if (OSSLink()) {
      return OSSLink();
    }
  });
  const createStorage = (0, import_signal_model.inputComputeInServer)(function* () {
    yield writeFileStroage.create();
  });
  const updateStorage = (0, import_signal_model.inputComputeInServer)(function* (targetId) {
    const d = OSSLink();
    if (d) {
      yield writeFileStroage.update(targetId, __spreadValues({}, d));
    }
  });
  return {
    writeFileStroage,
    updateStorage,
    createStorage,
    inputFile,
    OSSLink
  };
}

// app/pages/main.tsx
function Main() {
  const uploader2 = (0, import_connect.useSignal)(uploader);
  return /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement(uploader_default, __spreadValues({}, uploader2)));
}

// .tarat/server/app/routes.server.tsx
(0, import_connect2.setHookAdaptor)(import_react4.default);
(0, import_connect2.registerModelIndexes)({
  uploaderItem: "uploaderItem"
});
function _TaratRootApplication({ location }) {
  return /* @__PURE__ */ import_react4.default.createElement(import_server.StaticRouter, { location }, /* @__PURE__ */ import_react4.default.createElement(app_default, null, /* @__PURE__ */ import_react4.default.createElement(import_react_router_dom.Routes, null, /* @__PURE__ */ import_react4.default.createElement(import_react_router_dom.Route, { path: "main", element: /* @__PURE__ */ import_react4.default.createElement(Main, null) }))));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getReactAdaptor
});

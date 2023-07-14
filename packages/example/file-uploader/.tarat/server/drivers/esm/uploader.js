// .tarat/drivers/uploader.js
import {
  state,
  computedInServer,
  prisma,
  writePrisma,
  inputComputeInServer
} from "@polymita/signal-model";
import * as fs from "node:fs";
import * as path from "node:path";

// models/indexes.json
var indexes_default = {
  uploaderItem: "uploaderItem"
};

// .tarat/drivers/uploader.js
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {
  enumerable: true,
  configurable: true,
  writable: true,
  value
}) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
function uploader() {
  const inputFile = state();
  const OSSLink = computedInServer(function* () {
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
  const fileStorage = prisma(indexes_default.uploaderItem, () => void 0, {
    immediate: false
  });
  const writeFileStroage = writePrisma(fileStorage, () => {
    if (OSSLink()) {
      return OSSLink();
    }
  });
  const createStorage = inputComputeInServer(function* () {
    yield writeFileStroage.create();
  });
  const updateStorage = inputComputeInServer(function* (targetId) {
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
var autoParser1689336953054_0 = {
  uploader: {
    names: [
      [0, "inputFile"],
      [1, "OSSLink"],
      [2, "fileStorage"],
      [3, "writeFileStroage"],
      [4, "createStorage"],
      [5, "updateStorage"]
    ],
    deps: [
      ["h", 1, [0]],
      ["ic", 3, [1], [2]],
      ["ic", 4, [], [3]],
      ["ic", 5, [1], [3]]
    ]
  }
};
Object.assign(uploader, {
  __deps__: autoParser1689336953054_0.uploader.deps,
  __names__: autoParser1689336953054_0.uploader.names,
  __name__: "uploader",
  __namespace__: "tarat-file-uploader"
});
export {
  uploader as default
};

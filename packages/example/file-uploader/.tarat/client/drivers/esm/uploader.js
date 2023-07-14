// .tarat/drivers/cache_uploader.js
import {
  state,
  computedInServer,
  prisma,
  writePrisma,
  inputComputeInServer,
} from "@polymita/signal-model";

// models/indexes.json
var indexes_default = {
  uploaderItem: "uploaderItem",
};

// .tarat/drivers/cache_uploader.js
function uploader() {
  const inputFile = state();
  const OSSLink = computedInServer(() => {});
  const fileStorage = prisma(indexes_default.uploaderItem, () => void 0, {
    immediate: false,
  });
  const writeFileStroage = writePrisma(fileStorage, () => {
    if (OSSLink()) {
      return OSSLink();
    }
  });
  const createStorage = inputComputeInServer(() => {});
  const updateStorage = inputComputeInServer(() => {});
  return {
    writeFileStroage,
    updateStorage,
    createStorage,
    inputFile,
    OSSLink,
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
      [5, "updateStorage"],
    ],
    deps: [
      ["h", 1, [0]],
      ["ic", 3, [1], [2]],
      ["ic", 4, [], [3]],
      ["ic", 5, [1], [3]],
    ],
  },
};
Object.assign(uploader, {
  __deps__: autoParser1689336953054_0.uploader.deps,
  __names__: autoParser1689336953054_0.uploader.names,
  __name__: "uploader",
  __namespace__: "tarat-file-uploader",
});
export { uploader as default };
/*! can not invoked in current runtime */

/**. auto generated by tarat */
// location at:/Users/zhouyunge/Documents/fishpond-desktop-workspace/packages/polymita-runtime/packages/example/file-uploader/.tarat/client/drivers/esm/uploader.js
const autoParser1689336962895_2 = {
  uploader: {
    names: [
      [0, "inputFile"],
      [1, "OSSLink"],
      [2, "fileStorage"],
      [3, "writeFileStroage"],
      [4, "createStorage"],
      [5, "updateStorage"],
    ],
    deps: [
      ["h", 1, [0]],
      ["ic", 3, [1], [2]],
      ["ic", 4, [], [3]],
      ["ic", 5, [1], [3]],
    ],
  },
};
Object.assign(uploader, {
  __deps__: autoParser1689336962895_2.uploader.deps,
  __names__: autoParser1689336962895_2.uploader.names,
  __name__: "uploader",
  __namespace__: "tarat-file-uploader",
});
/** auto generated by tarat .*/
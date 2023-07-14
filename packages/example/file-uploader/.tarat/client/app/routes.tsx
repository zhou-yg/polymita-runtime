/**
 * @tips: this file is generated by tarat. do not modified this file
 */
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { preset } from "@polymita/signal-model";
import {
  RenderDriver,
  setHookAdaptor,
  registerModelIndexes,
} from "@polymita/connect";

import App from "/Users/zhouyunge/Documents/fishpond-desktop-workspace/packages/polymita-runtime/packages/example/file-uploader/app/_app";

import Main from "/Users/zhouyunge/Documents/fishpond-desktop-workspace/packages/polymita-runtime/packages/example/file-uploader/app/pages/main";

registerModelIndexes({
  uploaderItem: "uploaderItem",
});

preset.clientRuntime();
const TopContext = setHookAdaptor(React);

function _TaratRootApplication({ location }) {
  const driver = new RenderDriver();
  driver.fromContextMap(window.hookContextMap);
  driver.switchToClientConsumeMode();

  let router = (
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="main" element={<Main />}></Route>
        </Routes>
      </App>
    </BrowserRouter>
  );

  return <TopContext.Provider value={driver}>{router}</TopContext.Provider>;
}

render(_TaratRootApplication);

function render(f) {
  let ele = React.createElement(f);
  const app = ReactDOM.createRoot(document.getElementById("app"));
  app.render(ele);
}
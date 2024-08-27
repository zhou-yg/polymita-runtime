import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { logFrame } from "../../util";

export default function serverScripts (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config
  const r = fs.existsSync( config.entryFiles.serverScripts)
  let loaded = false
  return async (ctx, next) => {
    if (r && !loaded) {
      require(config.entryFiles.serverScripts)
      loaded = true
      logFrame(`load scripts ${config.entryFiles.serverScripts.replace(config.cwd, '')}`)
    }
    await next()
  }
}
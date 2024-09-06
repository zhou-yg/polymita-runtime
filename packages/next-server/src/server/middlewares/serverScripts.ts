import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { logFrame } from "../../util";

export default function serverScripts (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config
  const r = fs.existsSync(config.pointFiles.env.serverScriptsIndex)
  console.log('[serverScripts]: ', config.pointFiles.env.serverScriptsIndex);
  let loaded = false
  return async (ctx, next) => {
    if (r && !loaded) {
      require(config.pointFiles.env.serverScriptsIndex)?.onMounted?.()
      loaded = true
      logFrame(`load scripts ${config.pointFiles.env.serverScriptsIndex.replace(config.cwd, '')}`)
    }
    await next()
  }
}
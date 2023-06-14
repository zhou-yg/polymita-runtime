import Application from "koa";
import { join } from "path";
import { IConfig } from "../config";
export default function pureDevCache (args: {
  config: IConfig
}) : Application.Middleware {

 const config = args.config

 return async (ctx, next) => {
  for (const k in require.cache) {
    if (
      k.startsWith(config.pointFiles.outputDir) ||
      k.startsWith(join(config.cwd, config.modelsDirectory)) // delete the models/indexes.json
    ) {
      delete require.cache[k]
    }
  }

  await next()
 }
}

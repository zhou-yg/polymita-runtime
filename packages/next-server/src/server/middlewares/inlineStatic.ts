import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
/**
 * @TODO should provide by default  
 */
export default function inlineStatic (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config

  return async (ctx, next) => {
    const url = ctx.request.url
    const name = url.match(/\/static\/(\w+\.js)/)?.[1]

    if (name) {
      const resources = config.staticDeps.find(p => p.name === name);
      let code = ''

      if (resources) {
        code = resources.resources.reduce((prev, file) => {
          if (fs.existsSync(file)) {
            return prev + '\n\n\n' + fs.readFileSync(file, 'utf-8')
          }
          return prev
        }, '')
      } 
      ctx.set('Content-Type', 'application/javascript');
      ctx.body = code
    } else {
      await next()
    }
  }
}
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
    const name = url.match(/\/static\/(\w+\.(js|css))/)?.[1]

    if (name) {
      const resources = config.staticDeps.find(p => p.name === name);
      let code = ''

      if (resources && resources.resources) {
        code = resources.resources?.reduce((prev, file) => {
          return prev + `\n\n\n// file: ${file}\n` + fs.readFileSync(file, 'utf-8')
        }, '')
      } 
      if (/\.js/.test(name)) {
        ctx.set('Content-Type', 'application/javascript');
      } else if (/\.css$/.test(name)) {
        ctx.set('Content-Type', 'text/css');
      }
      ctx.body = code
    } else {
      await next()
    }
  }
}
import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { exportToGlobalScript, getCurrentDynamicConfig } from "../../config/dynamic";
/**
 * @TODO should provide by default  
 */
export default function inlineStatic (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config

  return async (ctx, next) => {
    const url = ctx.request.url
    const name = url.match(/\/dynamicConfig\.js$/)

    if (name) {
      const code = exportToGlobalScript(config)
      
      ctx.set('Content-Type', 'application/javascript');
      ctx.body = code
    } else {
      await next()
    }
  }
}
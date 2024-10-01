import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { exportDynamicModulesToRoutes, exportToGlobalScript, getCurrentDynamicConfig } from "../../config/dynamic";
/**
 * @TODO should provide by default  
 */
export default function inlineDynamic (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config

  return async (ctx, next) => {
    const url = ctx.request.url
    const name = url.match(/\/dynamicConfig\.js$/)
    console.log('name: ', url, name);

    if (name) {
      const code = exportToGlobalScript(config)

      const routeCode = exportDynamicModulesToRoutes(config)
      console.log('routeCode: ', routeCode);
      
      ctx.set('Content-Type', 'application/javascript');
      ctx.body = `${code}\n${routeCode}`
    } else {
      await next()
    }
  }
}
import Application from "koa";
import { IConfig } from "../../config";
import * as fs from "fs";
import * as path from "path";
import { isBlankObject, logFrame } from "../../util";
/**
 * @TODO should provide by default  
 */
export default function prisma (args: {
  config: IConfig
}) : Application.Middleware {
  const config = args.config

  return async (ctx, next) => {
    const url = ctx.request.url
    if (url.startsWith(config.apiPre) && ctx.prisma) {
      const prisma = ctx.prisma

      const action = async (method: string, entity: string, q: any) => {
        logFrame('prismaQuickAPI', method, 'start: ', entity, q);
        const r = prisma[entity][method](q).then(r => r)
        await r
        logFrame('prismaQuickAPI]', method, 'end: ', entity, q);
        return r
      }
    
      const [_, entity, method] = (url.match(new RegExp(`${config.apiPre}/(\\w+)/(\\w+)`)) || [])
      const from = ctx.request.query.from;
      const param = ctx.request.body
      console.log('[prisma] entity, method: ', entity, method, param);

      let result = ''
      if (prisma[entity]?.[method]) {
        result = await action(
          method, 
          entity, 
          param
        )
      } else {
        throw new Error(`[prismaQuickAPI] "${method}" not found in prisma`)
      }
      ctx.set('content-type', 'application/json')
      ctx.body = JSON.stringify(result)

    } else {
      await next()
    }
  }
}

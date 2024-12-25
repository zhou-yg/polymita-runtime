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

      async function find(from: string, e: string, w) {
        console.log('find e: ', e);
        return prisma[e].findMany(w).then(r => r)
      }
      async function update(from: string, e: string, w) {
        console.log('update start: ', e, w);
        const r = prisma[e].update(w)
        await r
        console.log('update end: ', e);
        return r
      }
      async function remove(from: string, e: string, d) {
        return prisma[e].delete(d).then(r => r)
      }
      async function create(from: string, e: string, q) {
        console.log('create start: ', e, q);
        const r = prisma[e].create(q).then(r => r)
        await r
        console.log(`create end:`,e, q)
        return r
      }
      async function updateMany(from, e: string, query) {
        return prisma[e].updateMany(query).then(r => r)
      }
      async function upsert(from, e: string, query) {
        return prisma[e].upsert(query).then(r => r)
      }
    
      const actions = {
        find, update, remove, create, updateMany, upsert
      }

      const [_, entity, method] = (url.match(new RegExp(`${config.apiPre}/(\\w+)/(\\w+)`)) || [])
      const from = ctx.request.query.from;
      const param = ctx.request.body
      console.log('[prisma] entity, method: ', entity, method, param);

      let result = ''
      if (actions[method]) {
        result = await actions[method](
          'prisma-middleware', 
          entity, 
          param
        )
      } else {
        result = await prisma[entity]?.[method](param)
      }
      ctx.set('content-type', 'application/json')
      ctx.body = JSON.stringify(result)

    } else {
      await next()
    }
  }
}

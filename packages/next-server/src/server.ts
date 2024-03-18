/**
 * run in Node.js runtime
 */
import Koa from 'koa'
import { IConfig } from "./config";
import * as path from 'path'

function setupBasicServer (c: IConfig) {
  const app = new Koa()
  app.use(async (ctx, next) => {
    const contentLength = ctx.request.headers['content-length'];
    if (contentLength && parseInt(contentLength)) {
      console.log('[@polymita/server] request payload contentLength: ', `${parseInt(contentLength) / 1024 / 1024}mb`);
    }
    await next();
  })
  app.use(async (ctx, next) => {
    console.log('[@polymita/server] >> request path=', ctx.request.path)
    await next()
  })

  return app
}

async function startApp(app: Koa, c: IConfig) {
  app.listen(c.port)
}

function resolveNext(c: IConfig) {
  return require(path.join(c.cwd, './node_modules/next/'))
}

export async function createDevServer (c: IConfig) {  
  const app = setupBasicServer(c)
  const next = resolveNext(c)

  const nextApp = next({ 
    dev: true,
    hostname: 'localhost',
    port: c.port,
  })
  const nextHandle = nextApp.getRequestHandler()

  await nextApp.prepare()

  app.use(async (ctx) => {
    const parsedUrl = new URL(ctx.req.url)
    await nextHandle(ctx.req, ctx.res, parsedUrl)
  })

  await startApp(app, c)
}

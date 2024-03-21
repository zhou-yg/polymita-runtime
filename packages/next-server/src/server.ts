/**
 * run in Node.js runtime
 */
import Koa from 'koa'
import { IConfig } from "./config";
import * as path from 'path'
import { logFrame } from './util';
import * as url from 'url'

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
  app.listen(c.port, () => {
    logFrame(`listen at: ${c.port}`)
  })
}

function resolveNext(c: IConfig) {
  return require(path.join(c.cwd, './node_modules/next/'))
}

export async function createDevServer (c: IConfig) {  
  const app = setupBasicServer(c)
  const next = resolveNext(c)

  console.log('c.port: ', c.port);

  const nextApp = next({ 
    dev: true,
    hostname: 'localhost',
    port: c.port,
  })
  const nextHandle = nextApp.getRequestHandler()

  await nextApp.prepare()

  app.use(async (ctx) => {
    const parsedUrl = url.parse(ctx.req.url)
    await nextHandle(ctx.req, ctx.res, parsedUrl)
  })

  await startApp(app, c)


  process.on('SIGINT', function(s) {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)", s);
    // some other closing procedures go here
    process.exit(0);
  });
}

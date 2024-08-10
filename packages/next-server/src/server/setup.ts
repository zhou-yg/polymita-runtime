/**
 * run in Node.js runtime
 */
import Application from "koa";
import koaBody from 'koa-body'
import cors from '@koa/cors'
import Koa from 'koa'
import staticServe from 'koa-static'
import e2k from 'express-to-koa'
import chalk from 'chalk'
import page from "./middlewares/page";
import react from '@vitejs/plugin-react'

import * as vite from "vite";

import { IConfig } from "../config";
import getPort, { makeRange as portNumbers } from "get-port";

import pureDevCache from "./middlewares/pureDevCache";
import { getAddress, getDefaultRoute, logFrame } from "../util";
import moduleTranslatorRollupPlugin from "../compiler/plugins/rollup-plugin-module-translator";

export function setupBasicServer (c: IConfig) {
  const app = new Koa()
  app.use(async (ctx, next) => {
    const contentLength = ctx.request.headers['content-length'];
    if (contentLength && parseInt(contentLength)) {
      console.log('[@polymita/server] request payload contentLength: ', `${parseInt(contentLength) / 1024 / 1024}mb`);
    }
    await next();
  })
  app.use(koaBody({
    multipart: true,
    jsonLimit: '1000mb',
  }))
  app.use(cors())
  app.use(staticServe(c.publicDirectory))
  app.use(async (ctx, next) => {
    console.log('[@polymita/server] >> request path=', ctx.request.path)
    await next()
  })

  return app
}

function appendMiddleware (app: Application, c: IConfig) {
  /**
   * handle *.css
   */
  // app.use(async (ctx, next) => {
  //   if (!ctx.body && ctx.request.path.endsWith('.css')) {
  //     if (existsSync(join(ctx.request.path))) {
  //       ctx.headers['content-type'] = 'text/css'
  //       ctx.body = readFileSync((ctx.request.path), 'utf-8')
  //     }
  //   }
  //   await next()
  // })
}

async function startApp(app: Application, c: IConfig) {
  appendMiddleware(app, c)

  const port = c.port

  app.listen(port, () => {

    let address = getAddress()
    
    const allList = c.pages.filter(v => v.routerPath).map(v => {
      return `
        ${v.name}:
        localhost: ${chalk.green(`http://localhost:${port}${v.path}`)}
        ${address ? `ip: ${chalk.green(`http://${address}:${port}${v.path}`)}` : ''  }`
    }).join('\n')
  
  
    logFrame(`
      Tarat App Server started at
  
      ${allList}
    `)
  })
}
async function startTestApp(app: Application, c: IConfig) {
  appendMiddleware(app, c)

  const port = c.port

  app.listen(port, () => {

    let address = getAddress()
  
    logFrame(`
      Tarat App Server started at 
        localhost: ${chalk.green(`http://localhost:${port}`)}
        ${address ? `ip: ${chalk.green(`http://${address}:${port}`)}` : ''  }
    `)
  })
}

export async function createDevViteServer (c: IConfig) {  
  const app = setupBasicServer(c)

  app.use(pureDevCache({
    config: c
  }))

  const viteServer = await vite.createServer({
    clearScreen: false,
    root: c.cwd,
    optimizeDeps: {
      force: true
    },
    css: {},
    plugins: [
      // tsconfigPaths(),
      {
        ...moduleTranslatorRollupPlugin(c),
        enforce: 'pre' 
      },
      react(),
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json', '.less', '.css'],
      alias: [
        {
          find: '@',
          replacement: c.cwd,
        },
      ]
    }
  })

  app.use(e2k(viteServer.middlewares))


  app.use(page({
    config: c,
    vite: viteServer,
  }))

  await startApp(app, c)
}


export async function createServer(c: IConfig) {
  const app = setupBasicServer(c)
 
  app.use(staticServe(c.buildDirectory))

  // depends on dist/{distServerRoutes, distEntryJS}
  app.use(page({
    config: c,
  }))

  await startApp(app, c)

  return app
}


export async function createTestServer(c: IConfig) {
  const app = setupBasicServer(c)
 
  await startTestApp(app, c)

  return app
}
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
import sendApp from './middlewares/sendApp'
import createExternal from 'vite-plugin-external';

import * as vite from "vite";

import { IConfig } from "../config";

import pureDevCache from "./middlewares/pureDevCache";
import { getAddress, logFrame } from "../util";
import inlineStatic from "./middlewares/inlineStatic";
import { externalModules } from "../compiler";
import prisma from "./middlewares/prisma";
import serverScripts from "./middlewares/serverScripts";

export function setupBasicServer (c: IConfig) {
  const app = new Koa()
  app.use(async (ctx, next) => {
    const contentLength = ctx.request.headers['content-length'];
    if (contentLength && parseInt(contentLength)) {
      console.log('[@polymita/next-server] request payload contentLength: ', `${parseInt(contentLength) / 1024 / 1024}mb`);
    }
    await next();
  })
  app.use(koaBody({
    multipart: true,
    jsonLimit: '100mb',
  }))
  app.use(cors())
  app.use(staticServe(c.publicDirectory))
  app.use(async (ctx, next) => {
    console.log('[@polymita/server] >> request path=', ctx.request.path)
    await next()
  })
  app.use(serverScripts({ config: c }))

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
        localhost: ${chalk.green(`http://localhost:${port}${v.routerPath}`)}
        ${address ? `ip: ${chalk.green(`http://${address}:${port}${v.routerPath}`)}` : ''  }`
    }).join('\n')  
  
    logFrame(`
      Tarat App Server started at "${port}"
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

  app.use(inlineStatic({ config: c }))
  app.use(prisma({ config: c }))

  const viteServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    clearScreen: false,
    optimizeDeps: {
      force: true
    },
    plugins: [      
      // {
      //   ...moduleTranslatorRollupPlugin(c),
      //   enforce: 'pre' 
      // },
      react(),
      createExternal({
        externals: {
          ...externalModules(c.dependencyModules),
        }
      }) as any
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

  // app.use(sendApp({ config: c }))

  app.use(page({
    config: c,
    vite: viteServer,
  }))

  await startApp(app, c)
}


export async function createServer(c: IConfig) {
  const app = setupBasicServer(c)

  app.use(staticServe(c.cwd))

  app.use(inlineStatic({ config: c }))
  app.use(prisma({ config: c }))
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
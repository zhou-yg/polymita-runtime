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
import taratRunner from "./middlewares/runner";
import page from "./middlewares/page";
import unserializeWithFile from "./middlewares/unserialize";
import aliasDriverRollupPlugin from './compiler/plugins/rollup-plugin-alias-driver';
import react from '@vitejs/plugin-react'

import * as vite from "vite";
import tsconfigPaths from 'vite-tsconfig-paths'

import { IConfig } from "./config";
import getPort, { makeRange as portNumbers } from "get-port";

import pureDevCache from "./middlewares/pureDevCache";
import { getAddress, getDefaultRoute, logFrame } from "./util";
import path, { join } from "path";
import { createReadStream, existsSync, readFileSync } from "fs";

export function setupBasicServer (c: IConfig) {
  const app = new Koa()
  app.use(async (ctx, next) => {
    const contentLength = ctx.request.headers['content-length'];
    if (contentLength && parseInt(contentLength)) {
      console.log('[server on starting] contentLength: ', `${parseInt(contentLength) / 1024 / 1024}mb`);
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
    console.log('>> request path=', ctx.request.path)
    await next()
  })
  app.use(unserializeWithFile())

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
    
    const allList = c.pages.filter(v => !v.dir).map(v => {
      return `${v.name}:
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

export async function createDevServer (c: IConfig) {  
  const app = setupBasicServer(c)

  app.use(pureDevCache({
    config: c
  }))

  app.use(taratRunner({
    config: c
  }))

  const viteServer = await vite.createServer({
    clearScreen: false,
    root: c.cwd,
    server:{ middlewareMode: 'ssr' },
    optimizeDeps: {
      force: true
    },
    plugins: [
      tsconfigPaths(),
      { ...aliasDriverRollupPlugin(c, 'client'), enforce: 'pre' },
      react({
        exclude: /modules\/.*\.tsx/
      }),
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json', '.less', '.css'],
      alias: [
        {
          find: '@',
          replacement: c.cwd,
        },
        {
          find: /@polymita\/signal-model$/,
          replacement: '@polymita/signal-model/dist/signal-model.client.esm.js'
        }
      ]
    }
  })

  app.use(e2k(viteServer.middlewares))


  app.use(page({
    config: c,
    pages: c.pages,
    vite: viteServer,
  }))

  await startApp(app, c)
}


export async function createServer(c: IConfig) {
  const app = setupBasicServer(c)
 
  app.use(staticServe(c.buildDirectory))

  app.use(taratRunner({
    config: c
  }))

  app.use(page({
    config: c,
    pages: c.pages,
  })) 

  await startApp(app, c)

  return app
}


export async function createTestServer(c: IConfig) {
  const app = setupBasicServer(c)
 
  app.use(taratRunner({
    config: c
  }))

  await startTestApp(app, c)

  return app
}
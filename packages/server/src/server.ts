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

import { createServer as createViteServer } from "vite";
import tsconfigPaths from 'vite-tsconfig-paths'

import { IConfig } from "./config";
import getPort, { makeRange as portNumbers } from "get-port";

import pureDevCache from "./middlewares/pureDevCache";
import { getAddress, getDefaultRoute, logFrame } from "./util";
import path, { join } from "path";

export function setupBasicServer (c: IConfig) {
  const app = new Koa()
  app.use(koaBody({
    multipart: true
  }))
  app.use(cors())
  app.use(staticServe(c.publicDirectory))
  app.use(async (ctx, next) => {
    await next()
  })
  app.use(unserializeWithFile())

  return app
}

async function startApp(app: Application, c: IConfig) {

  const port = c.port

  app.listen(port)

  let address = getAddress()
  
  const allList = c.pages.filter(v => !v.dir).map(v => {
    return `
      ${v.name}:
      localhost: ${chalk.green(`http://localhost:${port}${v.path}`)}
      ${address ? `ip: ${chalk.green(`http://${address}:${port}${v.path}`)}` : ''  }
    `
  }).join('\n')


  logFrame(`
    Tarat App Server started at

    ${allList}
  `)
}

export async function createDevServer (c: IConfig) {  
  const app = setupBasicServer(c)

  app.use(pureDevCache({
    config: c
  }))

  app.use(taratRunner({
    config: c
  }))

  const vite = await createViteServer({
    clearScreen: false,
    root: c.cwd,
    server:{ middlewareMode: 'ssr' },
    optimizeDeps: {
      force: true
    },
    plugins: [
      tsconfigPaths(),
      { ...aliasDriverRollupPlugin(c, 'client'), enforce: 'pre' },
      react(),
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: [
        {
          find: '@/',
          replacement: c.cwd,
        },
        {
          find: '@polymita/signal-model',
          replacement: '@polymita/signal-model/dist/signal-model.client.esm.js'
        }
      ]
    }
  })

  app.use(e2k(vite.middlewares))


  app.use(page({
    config: c,
    pages: c.pages,
    vite,
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
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
import { createRouter } from './router'
import { createThirdPart } from './third_part'
import koaMount from 'koa-mount'

import * as vite from "vite";

import { IConfig } from "../config";

import pureDevCache from "./middlewares/pureDevCache";
import { getAddress, logFrame } from "../util";
import inlineStatic from "./middlewares/inlineStatic";
import { externalModules } from "../compiler";
import prisma from "./middlewares/prisma";
import prismaQuickAPI from "./middlewares/prismaQuickAPI";
import serverScripts from "./middlewares/serverScripts";
import inlineDynamic from "./middlewares/dynamic";

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
    multipart: true, // 支持文件上传
    formidable: {
      maxFileSize: 1024 * 1024 * 1024, // 设置最大文件大小为 1GB
      keepExtensions: true, // 保留文件扩展名
    },
    jsonLimit: '1gb', // JSON 请求体大小限制
    formLimit: '1gb', // 表单请求体大小限制
    textLimit: '1gb', // 文本请求体大小限制
  }));
  app.use(cors())
  app.use(staticServe(c.publicDirectory))
  app.use(async (ctx, next) => {
    console.log('[@polymita/next-server] >> request path=', ctx.request.path)
    await next()
    console.log('[@polymita/next-server] << response path=', ctx.request.path)
  })
  app.use(prisma({ config: c }))
  
  app.use(serverScripts({ config: c }))


  app.use(async (ctx, next) => {
    await next()
  })

  const thirdPartIns = createThirdPart(c)
  /**
   * extend third global context
   */
  Object.assign(app.context, thirdPartIns.context)
  app.use(koaMount('/third_part', thirdPartIns))

  const router = createRouter(c)

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}
/**
 * @deprecated
 */
function appendMiddleware (app: Application, c: IConfig) {
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

  app.use(inlineDynamic({ config: c }))
  app.use(inlineStatic({ config: c }))
  app.use(prismaQuickAPI({ config: c }))

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
          ...externalModules(c.dependencyModules.map(f => f.name)),
        }
      }) as any
    ],
    build: {
      commonjsOptions: {
        include: [/dynamic_modules/, /node_modules/],
      },
    },
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

  app.use(staticServe(c.cwd))

  app.use(inlineDynamic({ config: c }))
  app.use(inlineStatic({ config: c }))
  app.use(prismaQuickAPI({ config: c }))
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
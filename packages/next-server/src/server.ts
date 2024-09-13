/**
 * run in Node.js runtime
 */
import Koa from 'koa'
import http from 'http'
import staticServe from 'koa-static'
import { IConfig } from "./config";
import * as path from 'path'
import { logFrame } from './util';
import * as url from 'url'

async function startApp(app: Koa, c: IConfig) {
  app.listen(c.port, () => {
    logFrame(`listen at: ${c.port}`)
  })
}

function resolveNext(c: IConfig) {
  return require(path.join(c.nodeModulesDir, './next/'))
}

export { createDevViteServer, createServer } from './server/setup'


export async function createDevNextServer (c: IConfig) {  
  // const app = setupBasicServer(c)
  const next = resolveNext(c)

  const nextApp = next({ 
    dev: true,
    hostname: 'localhost',
    port: c.port,
  })
  const nextHandle = nextApp.getRequestHandler()

  await nextApp.prepare()

  http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url)
      await nextHandle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).once('error', (err) => {
    console.error(err)
    process.exit(1)
  })
  .listen(c.port, () => {
    console.log(`> Ready on http://localhost:${c.port}`)
  })

  process.on('SIGINT', function(s) {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)", s);
    // some other closing procedures go here
    process.exit(0);
  });
}

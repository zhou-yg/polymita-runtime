import { IConfig } from "../../config";
import { join } from "path"
import { getDependencyModules } from "../../config/dynamic"
import Router from '@koa/router';
import Koa from 'koa'
import mount from 'koa-mount'

import * as fs from 'fs'
import { logFrame } from "../../util";

function isServiceDep (c: IConfig, pkgName: string) {
  return c.moduleConfig?.services?.includes(pkgName) 
}

/**
 * load "./third_part/index.js" and sub modules
 */
function loadThirdPart(c: IConfig, app: Koa) {
  if (fs.existsSync(c.thirdPartEntry)) {
    require(c.thirdPartEntry)(c, app)
  }
  /**
   * load dynamic modules third_parts
   */
  const modules = getDependencyModules(c)
  const thirdPartInModules = modules.filter(m => {
    return isServiceDep(c, m.pkgName)
  }).map(f => {
    const r = [
      join(c.thirdPartDir, 'index.js'),
      join(c.thirdPartDir, 'index.mjs'),
      join(c.buildDirectory, c.thirdPartDir, 'index.js'),
      join(c.buildDirectory, c.thirdPartDir, 'index.mjs')
    ].find(entry => {
      return fs.existsSync(join(f.dir, entry))
    })

    if (r) {
      return join(f.dir, r)
    }
  }).filter(Boolean) as string[]

  logFrame('[loadThirdPart] thirdPartInModules: ', thirdPartInModules);
  if (thirdPartInModules.length > 0) {
    thirdPartInModules.forEach(f => {
      require(f)(c, app)
    })
  }
}

export function createThirdPart (c: IConfig) {
    
  const thirdKoaIns = new Koa();

  thirdKoaIns.use(async (ctx, next) => {
    console.log('[@polymita/server] start third', ctx.request.path)
    await next()
  })

  loadThirdPart(c, thirdKoaIns)

  thirdKoaIns.use(async (ctx, next) => {
    console.log('[@polymita/server] end basic', ctx.request.path)
    if (!ctx.body) {
      await next()
    }
  })
    
  return thirdKoaIns
}

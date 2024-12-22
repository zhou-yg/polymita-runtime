import { IConfig } from "../../config";
import { join } from "path"
import { getDependencyModules } from "../../config/dynamic"
import Router from '@koa/router';
import Koa from 'koa'
import mount from 'koa-mount'

import * as fs from 'fs'
/**
 * load "./third_part/index.js" and sub modules
 */
function loadThirdPart(c: IConfig, app: Koa) {
  if (fs.existsSync(c.thirdPartEntry)) {
    require(c.thirdPartEntry)(c)
  }

  /**
   * load dynamic modules third_parts
   */
  const modules = getDependencyModules(c)
  const thirdPartInModules = modules.filter(m => {
    return c.moduleConfig?.services?.includes(m.pkgName)
  }).map(m => {
    return join(m.dir, c.thirdPartDir)
  }).filter(f => {
    console.log('[loadThirdPart] dynamic third_part: ', f);
    return fs.existsSync(join(f, 'index.js')) || fs.existsSync(join(f, 'index.mjs'))
  })


  if (thirdPartInModules.length > 0) {
    thirdPartInModules.forEach(f => {
      require(f)(c, app)
    })
  }
}

export function createThirdPart (c: IConfig) {
    
    const thirdKoaIns = new Koa();

    loadThirdPart(c, thirdKoaIns)
      
    return thirdKoaIns
}

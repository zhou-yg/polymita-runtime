import { join } from "path"
import { IConfig } from "./config"
import { getDependencyModules } from "./config/dynamic"
import { logFrame } from "./util"
import * as fs from 'fs'
/**
 * load "./third_part/index.js" and sub modules
 */
export function loadThirdPart(c: IConfig) {
  if (fs.existsSync(c.thirdPartEntry)) {
    logFrame(`find third entry:${c.thirdPartEntry}`)
    require(c.thirdPartEntry)(c)
  }

  /**
   * load dynamic modules third_parts
   */
  const modules = getDependencyModules(c)
  const thirdPartInModules = modules.map(m => {
    return join(m.path, c.thirdPartDir)
  }).filter(f => {
    return fs.existsSync(join(f, 'index.js')) || fs.existsSync(join(f, 'index.mjs'))
  })

  if (thirdPartInModules.length > 0) {
    thirdPartInModules.forEach(f => {
      require(f)(c)
    })
  }
}


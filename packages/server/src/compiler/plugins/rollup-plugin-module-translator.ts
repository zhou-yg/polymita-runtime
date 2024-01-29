import * as fs from 'fs'
import * as path from 'path'
import { Plugin } from 'vite'
import { IConfig } from '../../config'
import { loadJSON } from '../../util'
import * as esbuild from 'esbuild'

function isType (path: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag)
}

function getTsConfig (id: string) {
  const parsedId = path.parse(id)
  const tsconfigPath = path.join(parsedId.dir, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    return loadJSON(tsconfigPath)
  }
}
/**
 * redirect drivers imports to already compiled drivers in client runtime
 * eg: from 'drivers/login.js' -> from './tarat/client/drivers/login.js'
 */
export default function moduleTranslatorRollupPlugin (c: IConfig): Plugin {
  const {
    cwd,
    cjsDirectory,
    esmDirectory,
    modulesDirectory
  } = c
  const {
    outputClientDir,
    outputServerDir
  } = c.pointFiles

  return {
    name: 'polymita-module-translator',

    async transform (code: string, id: string) {
      if (isType(id, modulesDirectory)) {

        const tsconfig = getTsConfig(id)

        const newCode = esbuild.transformSync(code, {
          loader: 'tsx',
          jsxFactory: tsconfig.compilerOptions.jsxFactory
        })

        return newCode.code
      }
    },
  }
}

import * as fs from 'fs'
import * as path from 'path'
import { Plugin } from 'vite'
import { IConfig } from '../../config'
import { loadJSON } from '../../util'
import * as esbuild from 'esbuild'

function isType (path: string, build: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag) && !path.includes(`${build}/${tag}`)
}

function getTsConfig (modulesDir: string) {  
  const parsedId = path.parse(modulesDir)
  const tsconfigPath = path.join(parsedId.dir, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    return loadJSON(tsconfigPath)
  } else {
    console.log('[polymita-module-translator] tsconfig not found ', id)
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
    modulesDirectory,
    buildDirectory
  } = c
  const {
    outputClientDir,
    outputServerDir
  } = c.pointFiles

  const modulesDir = path.join(c.cwd, modulesDirectory)
  const tsconfigPath = path.join(modulesDir, 'tsconfig.json')
  const tsconfig = loadJSON(tsconfigPath)

  return {
    name: 'polymita-modules-translator',

    async transform (code: string, id: string) {
      if (
        isType(id, buildDirectory , modulesDirectory) && 
        tsconfig.compilerOptions.jsxFactory
      ) {
        const newCode = esbuild.transformSync(code, {
          loader: 'tsx',
          jsxFactory: tsconfig.compilerOptions.jsxFactory
        })
        return newCode.code
      }
    },
  }
}

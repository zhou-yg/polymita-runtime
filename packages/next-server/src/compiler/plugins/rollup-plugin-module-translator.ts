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

/**
 * redirect drivers imports to already compiled drivers in client runtime
 * eg: from 'drivers/login.js' -> from './tarat/client/drivers/login.js'
 */
export default function moduleTranslatorRollupPlugin (c: IConfig): Plugin {
  const {
    cwd,
    cjsDirectory,
    esmDirectory,
    overridesDirectory,
    modulesDirectory,
    buildDirectory
  } = c
  const {
  } = c.pointFiles

  const modulesDir = path.join(c.cwd, modulesDirectory)
  const tsconfigPath = path.join(modulesDir, 'tsconfig.json')

  const dir2 = path.join(c.cwd, overridesDirectory)
  const tsconfigPath2 = path.join(dir2, 'tsconfig.json')

  const tsconfig = tsconfigPath ? loadJSON(tsconfigPath) : tsconfigPath2 ? loadJSON(tsconfigPath2) : {}

  return {
    name: 'polymita-modules-translator',

    async transform (code: string, id: string) {
      if (
        (
          isType(id, buildDirectory , modulesDirectory) || 
          isType(id, buildDirectory , overridesDirectory)
        ) && 
        tsconfig?.compilerOptions?.jsxFactory
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

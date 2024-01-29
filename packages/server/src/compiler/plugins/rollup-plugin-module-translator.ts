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
        console.log('code:', id)

        const newCode = esbuild.transformSync(code, {
          loader: 'tsx',
          jsxFactory: 'h'
        })

        return newCode.code
      }
    },
  }
}

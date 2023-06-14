import * as fs from 'fs'
import * as path from 'path'
import { Plugin } from 'vite'
import { IConfig } from '../../config'
import { loadJSON } from '../../util'

function isDriver (path: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag)
}
/**
 * redirect drivers imports to already compiled drivers in client runtime
 * eg: from 'drivers/login.js' -> from './tarat/client/drivers/login.js'
 */
export default function aliasDriverRollupPlugin (c: IConfig, env: 'server' | 'client'): Plugin {
  const {
    cwd,
    cjsDirectory,
    esmDirectory,
    driversDirectory
  } = c
  const {
    outputClientDir,
    outputServerDir
  } = c.pointFiles

  const envDriverOutputDir = env === 'server' ? outputServerDir : outputClientDir

  const defaultFormat = esmDirectory // env === 'server' ? cjsDirectory : esmDirectory

  return {
    name: 'tarat-alias-driver',
    async resolveId (source: string, importer: string, options) {

      if (!importer) {
        return null
      }
      if (isDriver(source, driversDirectory)) {
        const resolution = await this.resolve(source, importer, { skipSelf: true, ...options })
        if (!resolution || resolution.external) {
          return resolution
        }
        const aliasSource = resolution.id
          .replace(cwd, envDriverOutputDir)
          .replace(new RegExp(`\\/${driversDirectory}\\/`), `/${driversDirectory}/${defaultFormat}/`)
          .replace(/\.ts$/, '.js')
        
        const r2 = await this.resolve(aliasSource, importer, { skipSelf: true, ...options })
        return r2
      }
    },
  }
}

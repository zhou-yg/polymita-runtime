import * as esbuild from 'esbuild';
import * as path from 'path'
import * as fs from 'fs'
import { IConfig } from '../../config';

function isDriver (path: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag)
}
/**
 * redirect drivers imports to already compiled drivers in client runtime
 * eg: from 'drivers/login.js' -> from './tarat/client/drivers/login.js'
 */

const esbuildPluginAliasDriver = (c: IConfig, env: 'server' | 'client'): esbuild.Plugin => {
  const {
    cwd,
    cjsDirectory,
    esmDirectory,
    driversDirectory,
    project
  } = c
  const {
    outputClientDir,
    outputServerDir
  } = c.pointFiles

  console.log('plugin esbuildPluginAliasDriver')
  const defaultFormat = esmDirectory
  const envDriverOutputDir = env === 'server' ? outputServerDir : outputClientDir
  const filterReg = new RegExp(`${project}\\/${driversDirectory}`)

  return {
    name: 'alias-driver',
    setup(build) {
      build.onResolve({ filter: /drivers/ }, (args) => {
        const complementPath = path.join(args.resolveDir, args.path)
        if (filterReg.test(complementPath)) {

          const aliasSource = complementPath
            .replace(cwd, envDriverOutputDir)
            .replace(new RegExp(`\\/${driversDirectory}\\/`), `/${driversDirectory}/${defaultFormat}/`)
            .replace(/(\.ts)?$/, '.js')
          return {
            path: aliasSource
          }
        }
        return { path: complementPath }
      })
    }
  }
}


export default esbuildPluginAliasDriver
/**
 * 
 * @deprecated useless, because the integrated sub-driver will be bundle
 * 
 */
import * as esbuild from 'esbuild';
import * as path from 'path'
import * as fs from 'fs'
import { IConfig } from '../../config';

function isDriver (path: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag)
}

function isRelative (path: string) {
  return /^\./.test(path)
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

  const defaultFormat = env === 'server' ? cjsDirectory : esmDirectory
  const envDriverOutputDir = env === 'server' ? outputServerDir : outputClientDir
  const filterReg = new RegExp(`(${project}\\/${driversDirectory})|(dist\\/\\w+\\/${driversDirectory})`)

  return {
    name: 'alias-driver',
    setup(build) {
      build.onResolve({ filter: /drivers/ }, (args) => {
        const complementPath = isRelative(args.path)
          ? path.join(args.resolveDir, args.path)
          : path.join(c.cwd, 'node_modules', args.path)
        console.log('complementPath: ', env, complementPath, filterReg.test(complementPath));
        if (filterReg.test(complementPath)) {
          const aliasSource = complementPath
            .replace(cwd, envDriverOutputDir)
            .replace(new RegExp(`\\/${driversDirectory}\\/`), `/${driversDirectory}/${defaultFormat}/`)
            .replace(/(\.(t|j)s)?$/, '.js')

          console.log('aliasSource: ', aliasSource, fs.existsSync(aliasSource), '\n');
          if (fs.existsSync(aliasSource)) {
            return {
              path: aliasSource
            }
          }
        }
      })
    }
  }
}


export default esbuildPluginAliasDriver
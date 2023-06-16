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

  const defaultFormat = esmDirectory
  const envDriverOutputDir = env === 'server' ? outputServerDir : outputClientDir
  const filterReg = new RegExp(`${project}\\/${driversDirectory}`)

  return {
    name: 'alias-driver',
    setup(build) {
      build.onLoad({ filter: /drivers/ }, async (args) => {
        const complementPath = args.path
        if (filterReg.test(complementPath)) {
          const aliasSource = complementPath
            .replace(cwd, envDriverOutputDir)
            .replace(new RegExp(`\\/${driversDirectory}\\/`), `/${driversDirectory}/${defaultFormat}/`)
            .replace(/(\.ts)?$/, '.js')

          if (fs.existsSync(aliasSource)) {
            let text = await fs.promises.readFile(aliasSource, 'utf8')
            return {
              contents: text,
              loader: 'js',
            }
          }
        }
        return {
          contents: undefined, // keep esbuild loading it self
        }
      })
    }
  }
}


export default esbuildPluginAliasDriver
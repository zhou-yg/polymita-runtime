import * as esbuild from 'esbuild';
import * as path from 'path'
import * as fs from 'fs'

function isDriver (path: string, tag: string) {
  const pathArr = path.split('/')
  
  return pathArr.includes(tag)
}
/**
 * redirect drivers imports to already compiled drivers in client runtime
 * eg: from 'drivers/login.js' -> from './tarat/client/drivers/login.js'
 */

const esbuildPluginAliasDriver = (options: {
  cwd: string
}): esbuild.Plugin => {
  return {
    name: 'alias-driver',
    setup(build) {
      
    }
  }
}


export default esbuildPluginAliasDriver
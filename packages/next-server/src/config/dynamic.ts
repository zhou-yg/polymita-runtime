import Router from '@koa/router';
import { IConfig } from '../config';
import * as path from 'path'
import * as fs from 'fs'
import { decompress, tryMkdir } from '../util';

export async function saveDynamicModule (
  config: IConfig,
  moduleName: string, 
  zipFile: string | undefined
) {
  let dynamicModuleDir = ''
  if (moduleName) {
    dynamicModuleDir = path.join(config.cwd, config.dynamicModulesDirectory, moduleName)
    tryMkdir(dynamicModuleDir)

    if (zipFile) {
      await decompress(zipFile, dynamicModuleDir)
    }
  }

  return dynamicModuleDir
}

type IActiveModule = string | [string, Record<string, any>]


export function getActiveModules(config: IConfig) {
  const activeJson =config.pointFiles.currentFiles.overridesActive;
  if (!fs.existsSync(activeJson)) {
    return []
  }

  return JSON.parse(fs.readFileSync(activeJson, 'utf-8'))
}

export function overrideActivate(
  config: IConfig,
  moduleName: string,
  overrideConfig?: Record<string, any>
) {
  const activeJson =config.pointFiles.currentFiles.overridesActive;
  if (!fs.existsSync(activeJson)) {
    fs.writeFileSync(activeJson, '[]')
  }

  const activeArray: IActiveModule[] = JSON.parse(fs.readFileSync(activeJson, 'utf-8'))
  const isActive = activeArray.findIndex(m => m === moduleName || m[0] === moduleName)

  if (isActive >= 0) {
    activeArray[isActive] = [moduleName, overrideConfig]
  } else {
    activeArray.push([moduleName, overrideConfig])
  }

  fs.writeFileSync(activeJson, JSON.stringify(activeArray, null, 2))

  return activeArray
}

export function overrideInactivate(
  config: IConfig,
  moduleName: string,
) {
  const activeJson =config.pointFiles.currentFiles.overridesActive;
  if (!fs.existsSync(activeJson)) {
    return []
  }

  const activeArray: IActiveModule[] = JSON.parse(fs.readFileSync(activeJson, 'utf-8'))
  const isActive = activeArray.findIndex(m => m === moduleName || m[0] === moduleName)

  if (isActive >= 0) {
    activeArray.splice(isActive, 1)
  }

  fs.writeFileSync(activeJson, JSON.stringify(activeArray, null, 2))

  return activeArray
}
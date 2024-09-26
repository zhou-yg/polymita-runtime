import Router from '@koa/router';
import { IConfig, UserCustomConfig } from '../config';
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

export function getCurrentDynamicConfig(config: IConfig) {
  const f = config.pointFiles.currentFiles.dynamicConfigFile;
  if (!fs.existsSync(f)) {
    return []
  }

  return JSON.parse(fs.readFileSync(f, 'utf-8'))
}

export function overrideActivate(
  config: IConfig,
  moduleName: string,
  overrideConfig?: Record<string, any>
) {
  const f = config.pointFiles.currentFiles.dynamicConfigFile;
  if (!fs.existsSync(f)) {
    fs.writeFileSync(f, '[]')
  }

  const userConfig: UserCustomConfig = JSON.parse(fs.readFileSync(f, 'utf-8'))

  const activeArray = userConfig.moduleOverride?.activeLink || []
  const configMap = userConfig.moduleOverride?.configMap || {}

  const isActive = activeArray.findIndex(m => m === moduleName || m[0] === moduleName)

  if (isActive >= 0) {
    activeArray[isActive] = moduleName
  } else {
    activeArray.push(moduleName)
  }

  if (overrideConfig) {
    configMap[moduleName] = overrideConfig
  }

  fs.writeFileSync(f, JSON.stringify({
    ...userConfig,
    moduleOverride: {
      ...userConfig.moduleOverride,
      activeLink: activeArray,
      configMap,
    }
  }, null, 2))

  return activeArray
}

export function overrideInactivate(
  config: IConfig,
  moduleName: string,
) {
  const f = config.pointFiles.currentFiles.dynamicConfigFile;
  if (!fs.existsSync(f)) {
    return []
  }

  const userConfig: UserCustomConfig = JSON.parse(fs.readFileSync(f, 'utf-8'))
  const activeArray = userConfig.moduleOverride?.activeLink || []

  const isActive = activeArray.findIndex(m => m === moduleName || m[0] === moduleName)

  if (isActive >= 0) {
    activeArray.splice(isActive, 1)
  }

  fs.writeFileSync(f, JSON.stringify({
    ...userConfig,
    moduleOverride: {
      ...userConfig.moduleOverride,
      activeLink: activeArray,
    }
  }, null, 2))

  return activeArray
}

export function exportToGlobalScript (config: IConfig) {
  const initialConfig = config.moduleConfig;
  const userConfig = getCurrentDynamicConfig(config)

  const codeValue = JSON.stringify({
    ...initialConfig,
    ...userConfig,
  }, null, 2)
  
  return `window.${config.globalConfigRefKey} = ${codeValue}`
}

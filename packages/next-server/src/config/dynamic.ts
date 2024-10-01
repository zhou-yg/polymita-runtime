import Router from '@koa/router';
import { IConfig, IDynamicModule, UserCustomConfig } from '../config';
import * as path from 'path'
import * as fs from 'fs'
import { compile } from 'ejs'

import { convertModuleNameToVariableName, decompress, tryMkdir } from '../util';

const dynamicModuleTemplateFile = './dynamicModuleTemplate.ejs'
const dynamicModuleTemplateFilePath = path.join(__dirname, dynamicModuleTemplateFile)
const dynamicModuleTemplate = compile(fs.readFileSync(dynamicModuleTemplateFilePath).toString())

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

/**
 * for generating:
 *  import * as _polymita_xxx a from '@polymita/xxx'
 *  import * as xxx from '@/dynamic_modules/xxx'
 */
function getDependencyModules(c: IConfig) {
  return c.allDependencyModules.map(f => {

    let importPath = ''
    let importPathPKG = ''
    if (f.fromNodeModules) {
      importPath = f.dir;
      importPath = importPath.replace(c.nodeModulesDir, ''); 
      importPath = path.join(importPath, c.buildDirectory, c.outputIndex)
      importPathPKG = path.join(importPath, 'package.json')
    } else {
      importPath = path.join('@', c.dynamicModulesDirectory, f.name, c.buildDirectory, c.outputIndex)
      importPathPKG = path.join('@', c.dynamicModulesDirectory, f.name, 'package.json')
    }

    return {
      pkgName: f.pkgName,
      // package name maybe include '@' scope
      name: convertModuleNameToVariableName(f.name),
      path: importPath,
      pathPKG: importPathPKG,
    }
  })
}

function generateDependencyModulesImportCode(
  modulesContextName: string,
  dependencyModules: ReturnType<typeof getDependencyModules>
) {
  const dependencyModulesImportCode = dependencyModules.map(({ name, pkgName }) => {
    return [
      `const ${name} = globalThis['${pkgName}'];`,
    ]
  }).flat().join('\n')

  const registerModulesCode = dependencyModules.map((obj) => {
    
    return `${modulesContextName}.registerModule('${obj.pkgName}', ${obj.name})`
  }).join('\n')
  
  return {
    dependencyModulesImportCode,
    registerModulesCode,
  }
}

function generateDynamicModulesImportCode(
  modulesContextName: string,
  dynamicModules: IDynamicModule[]
) {
  
  const dynamicModulesImportCode = dynamicModules.map((f) => {
    return Object.entries(f.meta.routes?.pages || {}).map(([_, name]) => {
      return `const ${convertModuleNameToVariableName(f.pkgName)}${name}Component = ${modulesContextName}.createViewComponent('${f.pkgName}', '${name}')`
    })
  }).flat().join('\n')

  return dynamicModulesImportCode
}

/**
 * append dynamic modules pages
 */
export function exportDynamicModulesToRoutes(
  config: IConfig,
) {
  const modulesContextName = 'modulesContext';

  const dependencyModules = getDependencyModules(config)

  const {
    dependencyModulesImportCode,
    registerModulesCode,
  } = generateDependencyModulesImportCode(modulesContextName, dependencyModules)


  /**
   * export dynamic routes to global
   */
  let exportRoutesToGlobalCode = `window.${config.globalDynamicRoutesRefKey} = [`
  config.dynamicModules.map(f => {
    return Object.entries(f.meta.routes?.pages || {}).map(([path, name]) => {

      exportRoutesToGlobalCode += `
      {
        path: "${path}",
        element: React.createElement(${convertModuleNameToVariableName(f.pkgName)}${name}Component),
      },`
    })
  }).flat()
  exportRoutesToGlobalCode += `]`

  
  const dynamicModulesImportCode = generateDynamicModulesImportCode(modulesContextName, config.dynamicModules)


  const code = dynamicModuleTemplate({
    modulesContextName,
    exportRoutesToGlobalCode,

    registerModulesCode,
    dependencyModulesImportCode,
    dynamicModulesImportCode,
  })

  return code
}
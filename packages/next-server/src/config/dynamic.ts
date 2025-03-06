import Router from '@koa/router';
import { IConfig, IDynamicModule, UserCustomConfig } from '../config';
import * as path from 'path'
import * as fs from 'fs'
import { compile } from 'ejs'

import { convertModuleNameToVariableName, decompress, loadJSON, logFrame, tryMkdir } from '../util';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { migratePrisma } from '../compiler';

const dynamicModuleTemplateFile = './dynamicModuleTemplate.ejs'
const dynamicModuleTemplateFilePath = path.join(__dirname, dynamicModuleTemplateFile)
const dynamicModuleTemplate = compile(fs.readFileSync(dynamicModuleTemplateFilePath).toString())

export function getModuleInfo (dir: string) {
  const pkgJSON = path.join(dir, 'package.json')

  if (!fs.existsSync(pkgJSON)) {
    return
  }

  return {
    pkgJSON: loadJSON(pkgJSON) as JSONSchemaForNPMPackageJsonFiles
  }
}

export async function saveDynamicModule (
  config: IConfig,
  moduleName: string, 
  zipFile: string,
  forceMigrate?: boolean
) {
  const dynamicModuleDir = path.join(config.cwd, config.dynamicModulesDirectory, moduleName)
  tryMkdir(dynamicModuleDir)

  const info = getModuleInfo(dynamicModuleDir)

  await decompress(zipFile, dynamicModuleDir)

  const newInfo = getModuleInfo(dynamicModuleDir)
  const migrateName = `${newInfo?.pkgJSON.name}-${newInfo?.pkgJSON.version}`

  logFrame('[saveDynamicModule] migrate ', info?.pkgJSON.version, newInfo?.pkgJSON.version, info?.pkgJSON.version !== newInfo?.pkgJSON.version, forceMigrate)

  if (
    info?.pkgJSON.version !== newInfo?.pkgJSON.version ||
    forceMigrate
  ) {
    logFrame('[saveDynamicModule] migrate ', `${migrateName}`)
    await migratePrisma(config, migrateName)  
  }

  return {
    destDir: dynamicModuleDir
  }
}

export function getCurrentDynamicConfig(config: IConfig) {
  const f = config.pointFiles.currentFiles.moduleConfigFile;
  if (!fs.existsSync(f)) {
    return {}
  }

  return JSON.parse(fs.readFileSync(f, 'utf-8'))
}

export function overrideActivate(
  config: IConfig,
  moduleName: string,
  overrideConfig?: Record<string, any>
) {
  const f = config.pointFiles.currentFiles.moduleConfigFile;
  if (!fs.existsSync(f)) {
    fs.writeFileSync(f, '{}')
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
  const f = config.pointFiles.currentFiles.moduleConfigFile;
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

export function overrideRootConfig (
  config: IConfig,
  overrideConfig?: Record<string, any>
) {

  const f = config.pointFiles.currentFiles.moduleConfigFile;
  console.log('[next-server] overrideRootConfig: ', f);
  if (!fs.existsSync(f)) {
    const dir = path.dirname(f)
    tryMkdir(dir)
    fs.writeFileSync(f, '{}')
  }
  const userConfig: UserCustomConfig = JSON.parse(fs.readFileSync(f, 'utf-8'))
  
  if (overrideConfig) {
    Object.assign(userConfig, overrideConfig)
  }

  fs.writeFileSync(f, JSON.stringify(userConfig, null, 2))

  return userConfig
}

export function overrideUpdateModuleConfig(
  config: IConfig,
  moduleName: string,
  overrideConfig?: Record<string, any>
) {
  moduleName = moduleName.replace(/@polymita\//g, '/')

  const f = path.join(config.pointFiles.currentFiles.dynamicModulesDir, moduleName, config.moduleConfigFile);
  console.log('[next-server] overrideUpdateModuleConfig: ', f);
  if (!fs.existsSync(f)) {
    const dir = path.dirname(f)
    tryMkdir(dir)
    fs.writeFileSync(f, '{}')
  }

  const userConfig: UserCustomConfig = JSON.parse(fs.readFileSync(f, 'utf-8'))
  
  if (overrideConfig) {
    Object.assign(userConfig, overrideConfig)
  }

  fs.writeFileSync(f, JSON.stringify(userConfig, null, 2))

  return userConfig
}

export function exportToGlobalScript (config: IConfig) {
  const initialConfig = config.moduleConfig;
  const userConfig = getCurrentDynamicConfig(config)

  const codeValue = JSON.stringify({
    ...initialConfig,
    ...userConfig,
  }, null, 2)

  let miCode = '{}'
  if (fs.existsSync(config.pointFiles.currentFiles.modelFiles.schemaIndexes)) {
    miCode = fs.readFileSync(config.pointFiles.currentFiles.modelFiles.schemaIndexes, 'utf-8')
  }

  const userConfigCode = `window.${config.globalConfigRefKey} = ${codeValue}`
  
  const modelIndexesCode = `window.${config.globalModelIndexesRefKey} = ${miCode}`

  return [
    userConfigCode,
    modelIndexesCode,
  ]
}

/**
 * for generating:
 *  import * as _polymita_xxx a from '@polymita/xxx'
 *  import * as xxx from '@/dynamic_modules/xxx'
 */
export function getDependencyModules(c: IConfig) {
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
      dir: f.dir,
      pkgName: f.pkgName,
      // package name maybe include '@' scope
      varName: convertModuleNameToVariableName(f.name),
      /** @deprecated */
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

function getNameAndProps(name: string | [string, any]) {
  let nameVar = name;
  let propsVar: Record<string, any> = {};
  if (Array.isArray(name) && name.length === 2) {
    nameVar = name[0];
    propsVar = name[1];
  }
  return { nameVar, propsVar }
}

function generateDynamicModulesImportCode(
  modulesContextName: string,
  dynamicModules: IDynamicModule[]
) {
  
  const dynamicModulesImportCode = dynamicModules.map((f) => {
    return Object.entries(f.meta.routes?.pages || {}).map(([_, name]) => {
      const { nameVar } = getNameAndProps(name)

      /** 
       * const xxxModuleComponent = modulesContext.createViewComponent('@polymita/xxxx', 'ModuleName')
      */
      return `const ${convertModuleNameToVariableName(f.pkgName)}${nameVar}Component = ${modulesContextName}.createViewComponent('${f.pkgName}', '${nameVar}')`
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
   * generate declaration component from module.views
   */
  const dynamicModulesImportCode = generateDynamicModulesImportCode(modulesContextName, config.dynamicModules)

  /**
   * export dynamic routes to global
   */
  let exportRoutesToGlobalCode = `window.${config.globalDynamicRoutesRefKey} = [`
  console.log('[config/dynamic] config.dynamicModules: ', config.dynamicModules);
  config.dynamicModules.map(f => {
    return Object.entries(f.meta.routes?.pages || {}).map(([path, name]) => {
      const { nameVar, propsVar } = getNameAndProps(name)

      exportRoutesToGlobalCode += `
      {
        path: "${path}",
        title: "${propsVar?.title || nameVar}",
        hidden: ${!!propsVar?.hidden}
        element: React.createElement(${convertModuleNameToVariableName(f.pkgName)}${nameVar}Component, ${JSON.stringify(propsVar)}),
      },`
    })
  }).flat()
  exportRoutesToGlobalCode += `]`



  const code = dynamicModuleTemplate({
    modulesContextName,
    dependencyModulesImportCode,
    //
    registerModulesCode,
    //
    dynamicModulesImportCode,
    //
    exportRoutesToGlobalCode,
  })

  return code
}

export function getAllOverridesList (c: IConfig) {
  const dynamicConfig = getCurrentDynamicConfig(c)?.moduleOverride?.activeLink || []

  const isActive = (name: string) => {
    return dynamicConfig.includes(`components-${name}`)
  }

  return c.dynamicModules.map(m => {
    const overridesDir = path.join(m.dir, c.buildDirectory, c.overridesDirectory)

    if (!fs.existsSync(overridesDir)) {
      return
    }

    const overrideFiles = fs
      .readdirSync(overridesDir)
      .filter(f => /\.js$/.test(f))
      .map(f => f.replace(/\.js$/, ''))
    
    return {
      pkg: m.pkgName,
      overrideFiles: overrideFiles.map(f => [f, isActive(f)])
    }
  }).filter(Boolean)
}
import { isNonNullable, loadJSON, logFrame, sortByDependency } from "../util"
import * as path from 'path'
import * as fs from 'fs'
import { existsSync, lstatSync, readdirSync } from "fs"
import chalk from 'chalk'
import { JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package"
import type { IConfig, UserCustomConfig } from "../config"

interface IPkg {
  dependencies: {
    [k: string]: string
  }
}

const internalLibs = {
  signalModel: '@polymita/signal-model',
  signal: '@polymita/signal',
}

export interface IDynamicModule {
  name: string,
  pkgName: string,
  version: string,
  dir: string,
  meta: UserCustomConfig,
  fromNodeModules: boolean,
  pkgJSON: JSONSchemaForNPMPackageJsonFiles
}

function getModuleByDir(
  name: string,
  fromNodeModules: boolean,
  dir: string,
  outputDirectoryName: string,
  metaFileName: string,
  moduleConfigFileName: string,
): IDynamicModule | undefined {
  const pkg = path.join(dir, 'package.json')
  const metaFile = path.join(dir, outputDirectoryName, metaFileName)
  const moduleConfigFile = path.join(dir, moduleConfigFileName)

  const pkgJSON = loadJSON(pkg)

  if (!pkgJSON.name) {
    return
  }

  const metaJSON = loadJSON(metaFile)
  const moduleConfig = loadJSON(moduleConfigFile)

  Object.assign(metaJSON, moduleConfig)

  return {
    name,
    pkgJSON,
    version: pkgJSON.version,
    pkgName: pkgJSON.name,
    dir: dir,
    meta: metaJSON,
    fromNodeModules,
  } 
}

export function sortModules (modules: IDynamicModule[]) {
  const moduleNames = modules.map(m => m.pkgName)

  const relations = modules.map(m => {
    return moduleNames.filter(depModuleName => {
      return m.pkgJSON.dependencies?.[depModuleName]
    }).map(depModuleName => {
      return [m.pkgName, depModuleName] as [string, string]
    })
  }).flat()

  const sortedModuleNames = sortByDependency(moduleNames, relations)

  const result = sortedModuleNames.map(name => modules.find(m => m.pkgName === name)!).filter(Boolean)

  if (result.length !== modules.length) {
    throw new Error('[sortModules] unknown why changed after sort')
  }

  return result
}

/**
 * load dynamic modules from server
 */
export function findDynamicModules (
  targetDir: string,
  metaFileName: string,
  outputDirectoryName: string,
  moduleConfigFileName: string,
) {
  if (!fs.existsSync(targetDir)) {
    return []
  }

  const modules = readdirSync(targetDir)
    .map(f => {
      const dir = path.join(targetDir, f)
      return getModuleByDir(f, false, dir, outputDirectoryName, metaFileName, moduleConfigFileName)
    })
    .filter(isNonNullable)
    .filter(f => f && lstatSync(f.dir).isDirectory())
  return modules
}

export function findDependencies (
  nodeModulesDir: string,
  configFileName: string, 
  pkgJSON: null | JSONSchemaForNPMPackageJsonFiles,
  metaFileName: string,
  outputDirectoryName: string,
  moduleConfigFileName: string,
) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})

  const modules: string[] = pkgModules.filter(moduleName => {
    const dir = path.join(nodeModulesDir, moduleName)
    const pkg = path.join(dir, 'package.json')
    const configFile = path.join(dir, configFileName)
    if (existsSync(configFile)) {
      return true
    } if (existsSync(pkg)) {
      const obj = loadJSON(pkg)
      const r1 = !!obj.tarat || !!obj.polymita
      return r1
    } else {
      // logFrame(chalk.red(`dependency module "${moduleName}" hasnt installed`))
    }
  })

  return modules
    .map(name => getModuleByDir(name, true, path.join(nodeModulesDir, name), outputDirectoryName, metaFileName, moduleConfigFileName))
    .filter(isNonNullable)
}

type k = keyof typeof internalLibs
export function findDepLibs (pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})
  return Object.fromEntries(Object.keys(internalLibs).map(k => [k, pkgModules[k]])) as Record<k, boolean>;
}

export interface Dep {
  name: string
  resourceDir?: string
  resources?: string[]
  order: number
}

export function combineStaticToCode (resources: string[]) {
  return resources.reduce((prev, file) => {
    if (fs.existsSync(file)) {
      return prev + '\n\n\n' + fs.readFileSync(file, 'utf-8')
    }
    return prev
  }, '')
}

export function findStaticDeps (isProd: boolean, nodeModulesDir: string, modules: string[]) {
  const arr: Dep[] = [
    {
      name: 'deps.js',
      resourceDir: 
        isProd 
          ? path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic')
          : path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic/dev'),
      /**
       * "dev" state maybe using prod resources
       * */    
      resources: isProd ? [] : [
        path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic/emotion-react.umd.min.js'),
        path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic/emotion-styled.umd.min.js'),
        // path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic/eventemitter3.js'),
      ],
      order: 0,
    },
    {
      name: 'runtime.js',
      resources: [
        path.join(nodeModulesDir, '@polymita/signal/dist/index.umd.js'),
        path.join(nodeModulesDir, '@polymita/signal-model/dist/index.umd.js'),
        path.join(nodeModulesDir, '@polymita/renderer/dist/renderer.umd.js'),
        path.join(nodeModulesDir, '@polymita/next-connect/dist/index.umd.js'),
      ],
      order: 1,
    },
    {
      name: 'module.js',
      resources: [
        ...modules.map(dir => (path.join(dir, `dist/index.js`))).filter(fs.existsSync),
      ],
      order: 2,
    },
    {
      name: 'module.css',
      resources: [
        ...modules.map(dir => (path.join(dir, `dist/index.css`))).filter(fs.existsSync),
      ] ,
      order: 0,
    },
  ]

  arr.forEach(d1 => {
    if (d1.resourceDir && existsSync(d1.resourceDir)) {
      if (lstatSync(d1.resourceDir).isDirectory()) {
        const dirLoadedResources = (readdirSync(d1.resourceDir)
          .filter(f => /\.js$/.test(f))
          .map(f => {
            return path.join(d1.resourceDir!, f)
          }))
          if (!dirLoadedResources.length) {
            throw new Error(`[findStaticDeps] not found resources in dir "${d1.resourceDir}"`)
          }

          d1.resources = dirLoadedResources.concat((d1.resources || []))
      }
    }
  })

  return arr
}

export const getFileNameFormUrl = (c: IConfig, url: string) => {
  const reg = new RegExp(`${c.inlineStaticPrefix}/([\\w-]+\\.(js|css))`)
  const name = url.match(reg)?.[1]
  return name
}

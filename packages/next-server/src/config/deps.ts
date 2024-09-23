import { loadJSON, logFrame } from "../util"
import * as path from 'path'
import * as fs from 'fs'
import { existsSync, lstatSync, readdirSync } from "fs"
import chalk from 'chalk'
import { JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package"

interface IPkg {
  dependencies: {
    [k: string]: string
  }
}

const internalLibs = {
  signalModel: '@polymita/signal-model',
  signal: '@polymita/signal',
}

/**
 * load dynamic modules from server
 */
export function findDynamicModules (
  dynamicModulesDir: string,
) {
  if (!fs.existsSync(dynamicModulesDir)) {
    return []
  }

  const modules = readdirSync(dynamicModulesDir)
    .map(f => ({
      name: f,
      dir: path.join(dynamicModulesDir, f),
    }))
    .filter(f => lstatSync(f.dir).isDirectory())
  return modules
}

export function findDependencies (nodeModulesDir: string,configFileName: string, pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
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

  return modules.map(name => ({
    dir: path.join(nodeModulesDir, name),
    name,
  }))
}

type k = keyof typeof internalLibs
export function findDepLibs (pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})
  return Object.fromEntries(Object.keys(internalLibs).map(k => [k, pkgModules[k]])) as Record<k, boolean>;
}

interface Dep {
  name: string
  resourceDir?: string
  resources?: string[]
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
        path.join(nodeModulesDir, '@polymita/next-server/dist/internalStatic/eventemitter3.js'),
      ]
    },
    {
      name: 'runtime.js',
      resources: [
        path.join(nodeModulesDir, '@polymita/signal/dist/index.umd.js'),
        path.join(nodeModulesDir, '@polymita/signal-model/dist/index.umd.js'),
        path.join(nodeModulesDir, '@polymita/renderer/dist/renderer.umd.js'),
        path.join(nodeModulesDir, '@polymita/next-connect/dist/index.umd.js'),
      ],
    },
    {
      name: 'module.js',
      resources: [
        ...modules.map(name => (path.join(nodeModulesDir, `dist/index.js`))),
       ]
    },
    {
      name: 'module.css',
      resources: [
        ...modules.map(name => (path.join(nodeModulesDir, `dist/index.css`))),
       ]
    },
  ]

  arr.forEach(d1 => {
    if (existsSync(d1.resourceDir)) {
      if (lstatSync(d1.resourceDir).isDirectory()) {
        d1.resources = (readdirSync(d1.resourceDir)
          .filter(f => /\.js$/.test(f))
          .map(f => {
            return path.join(d1.resourceDir, f)
          })).concat((d1.resources || []))
      }
    }
  })

  return arr
}
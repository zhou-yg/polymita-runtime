import { loadJSON, logFrame } from "../util"
import * as path from 'path'
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

export function findDependencies (cwd: string, configFileName: string, pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})

  const modules: string[] = pkgModules.filter(moduleName => {
    const dir = path.join(cwd, 'node_modules', moduleName)
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

export function findStaticDeps (isProd: boolean, cwd: string, modules: string[]) {
  const arr: Dep[] = [
    {
      name: 'deps.js',
      resourceDir: 
        isProd 
          ? path.join(cwd, 'node_modules/@polymita/next-server/dist/internalStatic')
          : path.join(cwd, 'node_modules/@polymita/next-server/dist/internalStatic/dev'),
      resources: isProd ? [] : [
        path.join(cwd, 'node_modules/@polymita/next-server/dist/internalStatic/emotion-react.umd.min.js'),
        path.join(cwd, 'node_modules/@polymita/next-server/dist/internalStatic/emotion-styled.umd.min.js'),
      ]
    },
    {
      name: 'runtime.js',
      resources: [
        path.join(cwd, 'node_modules/@polymita/renderer/dist/renderer.umd.js'),
        path.join(cwd, 'node_modules/@polymita/next-connect/dist/index.umd.js'),
      ],
    },
    {
      name: 'module.js',
      resources: [
        ...modules.map(name => (path.join(cwd, 'node_modules', name ,'/dist/index.js'))),
       ]
    }
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
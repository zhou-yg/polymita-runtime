import { loadJSON, logFrame } from "../util"
import * as path from 'path'
import { existsSync } from "fs"
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

export function findDependencies (cwd: string, pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})

  const modules: string[] = pkgModules.filter(moduleName => {
    const dir = path.join(cwd, 'node_modules', moduleName)
    const pkg = path.join(dir, 'package.json')
    if (existsSync(pkg)) {
      const obj = loadJSON(pkg)
      const r1 = !!obj.tarat || obj.polymita
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
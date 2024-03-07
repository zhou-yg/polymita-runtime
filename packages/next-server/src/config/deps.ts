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
export function findDependencies (cwd: string, pkgJSON: null | JSONSchemaForNPMPackageJsonFiles) {
  const pkgModules = Object.keys(pkgJSON?.dependencies || {})

  const modules: string[] = pkgModules.filter(moduleName => {
    const dir = path.join(cwd, 'node_modules', moduleName)
    const pkg = path.join(dir, 'package.json')
    if (existsSync(pkg)) {
      const r1 = !!loadJSON(pkg).tarat
      return r1
    } else {
      // logFrame(chalk.red(`dependency module "${moduleName}" hasnt installed`))
    }
  })

  return modules
}

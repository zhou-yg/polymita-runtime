import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../../config";
import * as layoutTypes from './layoutTypes'

import { buildDTS, esbuild } from '../bundleUtility';
import loadModuleToView from '../plugins/esbuild-load-module';

export async function generateViewFromModule (c: IConfig) {
  const moduleFiles = c.modules.map(f => {
    return f.path
  })

  const tsFiles: [string, string][] = []

  await esbuild({
    entryPoints: moduleFiles,
    outdir: c.generateFiles.viewsDir,
    platform: 'browser',
    format: 'esm',
    treeShaking: true,
    plugins: [
      loadModuleToView({
        modulesDir: path.join(c.cwd, c.modulesDirectory),
        onFile([f, content]) {
          tsFiles.push([f, content])
        },
      }),
    ]
  })

  await Promise.all(tsFiles.map(([f, content]) => {
    return fs.promises.writeFile(f, content)
  }))

  await buildDTS(c, tsFiles.map(f => f[0]), c.generateFiles.viewsDir)

  await Promise.all(tsFiles.map(([f]) => {
    return fs.promises.unlink(f)
  }))  

}

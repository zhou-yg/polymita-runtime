import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../../config";
import * as layoutTypes from './layoutTypes'

import { buildDTS, esbuild } from '../bundleUtility';
import loadModuleToView from '../plugins/esbuild-load-module';
import { logFrame, traverseDir } from '../../util';
import aliasAtCodeToCwd from '../plugins/esbuild-alias-at';

export async function buildOverrides(c: IConfig) {

  const { outputOverridesDir } = c.pointFiles;
  const originalDir = path.join(c.cwd, c.overridesDirectory);

  const sourceFiles: string[] = []

  if (!fs.existsSync(originalDir)) {
    return
  }
  traverseDir(originalDir, f => {
    const wholePath = path.join(originalDir, f.relativeFile)
    if (f.isDir) {
      if (!fs.existsSync(wholePath)) {
        fs.mkdirSync(wholePath)
      }
    } else if (/\.(j|t)s(x?)$/.test(f.file)) {
      sourceFiles.push(wholePath)
    }
  })

  await esbuild({
    entryPoints: sourceFiles,
    outdir: outputOverridesDir,
    format: 'esm',
    splitting: true,
    plugins: [
      aliasAtCodeToCwd(c.cwd),
    ]
  })

  await buildDTS(c, sourceFiles, outputOverridesDir)
}

export async function generateViewFromOverrides (c: IConfig, externalModule?: boolean) {
  const sourceFiles = c.overrides.map(f => {
    return f.path
  })

  const tsFiles: [string, string][] = []

  await esbuild({
    entryPoints: sourceFiles,
    outdir: c.pointFiles.outputViewsDir,
    platform: 'browser',
    format: 'esm',
    treeShaking: true,
    plugins: [
      loadModuleToView({
        modulesDir: path.join(c.cwd, c.overridesDirectory),
        modulesDirName: c.overridesDirectory,
        externalModule,
        onFile([f, content]) {
          tsFiles.push([f, content])
        },
        onlyRegister: true,
      }),
    ]
  });

  await Promise.all(tsFiles.map(([f, content]) => {
    return fs.promises.writeFile(f, content)
  }))

  logFrame('generate view: \n' + tsFiles.map(([f]) => f.replace(c.cwd, '')).join('\n'))

  // if (externalModule) {
  //   /**
  //    * externalModule模式变成了相对路径，导致dts会多生成嵌套，
  //    * eg: dist/views/views/*.d, dist/views/modules/*.d
  //    */
  //   await buildDTS(c, tsFiles.map(f => f[0]), c.pointFiles.outputDir)
  // } else {
  //   await buildDTS(c, tsFiles.map(f => f[0]), c.pointFiles.outputViewsDir)
  // }
  await buildDTS(c, tsFiles.map(f => f[0]), c.pointFiles.outputViewsDir)

  await Promise.all(tsFiles.map(([f]) => {
    return fs.promises.unlink(f)
  }))
}

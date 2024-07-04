import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../../config";
import * as layoutTypes from './layoutTypes'

import { buildDTS, esbuild } from '../bundleUtility';
import loadModuleToView from '../plugins/esbuild-load-module';
import { logFrame, traverseDir } from '../../util';
import aliasAtCodeToCwd from '../plugins/esbuild-alias-at';

import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer';
import postcss from 'postcss'
import less from 'postcss-less'

export async function buildTailwindCSS(c: IConfig) {
  if (!c.tailwindConfigPath) {
    return
  }

  const globalCSSPath = path.join(c.cwd, 'app/globals.css')
  const contents = await fs.promises.readFile(globalCSSPath)  

  const result = await postcss([
    tailwindcss({
      config: c.tailwindConfigPath,
    }),
    autoprefixer() as any
  ]).process(contents, {
    from: globalCSSPath,
    to: c.pointFiles.outputCSS,
    syntax: less,
  });
  fs.writeFileSync(c.pointFiles.outputCSS, result.css)
}

export async function buildModules(c: IConfig) {

  const { outputModulesDir } = c.pointFiles;
  const originalModulesDir = path.join(c.cwd, c.modulesDirectory);

  const moduleFiles: string[] = []

  if (!fs.existsSync(originalModulesDir)) {
    return
  }
  traverseDir(originalModulesDir, f => {
    const wholePath = path.join(originalModulesDir, f.relativeFile)
    if (f.isDir) {
      if (!fs.existsSync(wholePath)) {
        fs.mkdirSync(wholePath)
      }
    } else if (/\.(j|t)s(x?)$/.test(f.file)) {
      moduleFiles.push(wholePath)
    }
  })

  await esbuild({
    entryPoints: moduleFiles,
    outdir: outputModulesDir,
    format: 'esm',
    splitting: true,
    plugins: [
      aliasAtCodeToCwd(c.cwd),
    ]
  })

  await buildDTS(c, moduleFiles, outputModulesDir)
}

export async function generateViewFromModule (c: IConfig, externalModule?: boolean) {
  const moduleFiles = c.modules.map(f => {
    return f.path
  })

  const tsFiles: [string, string][] = []

  await esbuild({
    entryPoints: moduleFiles,
    outdir: c.pointFiles.outputViewsDir,
    platform: 'browser',
    format: 'esm',
    treeShaking: true,
    plugins: [
      loadModuleToView({
        modulesDir: path.join(c.cwd, c.modulesDirectory),
        modulesDirName: c.modulesDirectory,
        externalModule,
        onFile([f, content]) {
          tsFiles.push([f, content])
        },
      }),
    ]
  });

  await Promise.all(tsFiles.map(([f, content]) => {
    return fs.promises.writeFile(f, content)
  }))

  logFrame('generate view: \n' + tsFiles.map(([f]) => f.replace(c.cwd, '')).join('\n'))

  if (externalModule) {
    /**
     * externalModule模式变成了相对路径，导致dts会多生成嵌套，
     * eg: dist/views/views/*.d, dist/views/modules/*.d
     */
    await buildDTS(c, tsFiles.map(f => f[0]), c.pointFiles.outputDir)
  } else {
    await buildDTS(c, tsFiles.map(f => f[0]), c.pointFiles.outputViewsDir)
  }

  await Promise.all(tsFiles.map(([f]) => {
    return fs.promises.unlink(f)
  }))
}

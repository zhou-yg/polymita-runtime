import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../config";
import { loadJSON, traverseDir } from '../util';
import { build, IBuildOption, getPlugins, getTSConfigPath, buildDTS, generateExternal } from "./prebuild";
import * as esbuild from 'esbuild';
import esbuildPluginPostcss from './plugins/esbuild-plugin-postcss';

export async function buildClientRoutes (c: IConfig) {
  const {
    outputDir,
    autoGenerateClientRoutes,
    clientRoutes,
    outputAppClientDir,
    clientRoutesCSS
  } = c.pointFiles

  const myPlugins = getPlugins({
    css: clientRoutesCSS,
    mode: 'build',
    target: 'browser',
    alias: {
      '@polymita/signal-model': '@polymita/signal-model/dist/signal-model.client.esm'
    },
    runtime: 'client'
  }, c)

  const op: IBuildOption = {
    input: {
      input: autoGenerateClientRoutes,
      plugins: myPlugins,
    },
    output: {
      file: clientRoutes,
      format: 'commonjs',
    }
  }
  
  await build(c, op)
}


export async function buildViews (c: IConfig) {
  const {
    outputViewsDir,
  } = c.pointFiles

  const originalViewsDir = path.join(c.cwd, c.viewsDirectory)

  const queue: Promise<void>[] = []

  const originDriverDir = path.join(c.cwd, c.driversDirectory)
  const externalDrivers = fs.existsSync(originDriverDir) ? fs.readdirSync(originDriverDir).map(f => {
    return path.join(c.cwd, c.driversDirectory, f)
  }) : []

  const entryViewFiles: string[] = []

  traverseDir(originalViewsDir, f => {
    const wholePath = path.join(originalViewsDir, f.file)
    if (f.isDir) {
      if (!fs.existsSync(wholePath)) {
        fs.mkdirSync(wholePath)
      }
    } else if (/\.(j|t)sx$/.test(f.file)) {
      entryViewFiles.push(wholePath)
    }
  })

  await esbuild.build({
    entryPoints: entryViewFiles,
    bundle: true,
    outdir: outputViewsDir,
    format: 'esm',
    splitting: true,
    external: [
      ...generateExternal(c),
      ...externalDrivers,
    ]
  })  
}

export async function buildModules(c: IConfig) {
  const { outputModulesDir } = c.pointFiles;
  const originalModulesDir = path.join(c.cwd, c.modulesDirectory);

  const moduleFiles: string[] = []

  traverseDir(originalModulesDir, f => {
    const wholePath = path.join(originalModulesDir, f.file)
    if (f.isDir) {
      if (!fs.existsSync(wholePath)) {
        fs.mkdirSync(wholePath)
      }
    } else if (/\.(j|t)s(x?)$/.test(f.file)) {
      moduleFiles.push(wholePath)
    }
  })

  await esbuild.build({
    entryPoints: moduleFiles,
    bundle: true,
    outdir: outputModulesDir,
    format: 'esm',
    splitting: true,
    tsconfig: getTSConfigPath(c.cwd),
    external: [
      ...generateExternal(c)
    ]
  })
}

export async function esbuildServerRoutes(c: IConfig) {
  const {
    autoGenerateServerRoutes,
    distServerRoutes,
    distServerRoutesCSS
  } = c.pointFiles
  
  await esbuild.build({
    entryPoints: [autoGenerateServerRoutes],
    outfile: distServerRoutes,
    format: 'cjs',
    bundle: true,
    plugins: [
      esbuildPluginPostcss({ cwd: c.cwd })
    ],
    external: [
      ...generateExternal(c),
    ]
  })
}
/**
 * generate modules/*.d.ts
 */
export function generateModuleTypes (c: IConfig) {
  const { outputModulesDir } = c.pointFiles;
  const { modules } = c;

  const moduleFiles: [string, string][] = []
  
  modules.forEach(f => {
    const outPath = path.join(outputModulesDir, f.relativeFile.replace(/\.ts(x?)$/, '.d.ts'))
    moduleFiles.push([f.path, outPath])
  })
  
  return Promise.all(moduleFiles.map(([input, output]) => buildDTS(c, input, output)))
}


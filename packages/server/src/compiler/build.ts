import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../config";
import { loadJSON, traverseDir } from '../util';
import { build, IBuildOption, getPlugins, getTSConfigPath, buildDTS, generateExternal, generateClientRoutes } from "./prebuild";
import * as esbuild from 'esbuild';
import esbuildPluginPostcss from './plugins/esbuild-plugin-postcss';
import esbuildPluginAliasDriver from './plugins/esbuild-alias-driver';
import aliasAtCodeToCwd from './plugins/esbuild-alias-at';
import * as layoutTypes from './layoutTypes'

export async function buildClientRoutes (c: IConfig) {
  const {
    autoGenerateClientRoutes,
    clientRoutes,
    clientRoutesCSS
  } = c.pointFiles

  await generateClientRoutes(c)

  await esbuild.build({
    entryPoints: [autoGenerateClientRoutes],
    platform: 'browser',
    outfile: clientRoutes,
    bundle: true,
    plugins: [
      esbuildPluginAliasDriver(c, 'client'),
      aliasAtCodeToCwd(c.cwd),
      esbuildPluginPostcss({
        cwd: c.cwd
      }),
    ]
  })

  // const myPlugins = getPlugins({
  //   css: clientRoutesCSS,
  //   mode: 'build',
  //   target: 'browser',
  //   alias: {
  //     '@polymita/signal-model': '@polymita/signal-model/dist/signal-model.client.esm'
  //   },
  //   runtime: 'client'
  // }, c)

  // const op: IBuildOption = {
  //   input: {
  //     input: autoGenerateClientRoutes,
  //     plugins: myPlugins,
  //   },
  //   output: {
  //     file: clientRoutes,
  //     format: 'commonjs',
  //   }
  // }
  
  // await build(c, op)
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
    ],
    plugins: [
      aliasAtCodeToCwd(c.cwd),
      esbuildPluginPostcss({ cwd: c.cwd }),
    ]
  })  
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

  await esbuild.build({
    entryPoints: moduleFiles,
    bundle: true,
    outdir: outputModulesDir,
    format: 'esm',
    splitting: true,
    external: [
      ...generateExternal(c),
    ],
    plugins: [
      // esbuildPluginPostcss({ cwd: c.cwd }),
      aliasAtCodeToCwd(c.cwd),
      esbuildPluginAliasDriver(c, 'client'),
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
      esbuildPluginPostcss({ cwd: c.cwd }),
      esbuildPluginAliasDriver(c, 'server'),
      aliasAtCodeToCwd(c.cwd),
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
  
  modules
  .filter(f => /\.ts(x?)$/.test(f.file))
  .forEach(f => {
    const outPath = path.join(outputModulesDir, f.relativeFile.replace(/\.ts(x?)$/, '.d.ts'))
    moduleFiles.push([f.path, outPath])
  })
  
  return Promise.all(moduleFiles.map(([input, output]) => buildDTS(c, input, output)))
}

export function generateModuleLayoutTypes (c: IConfig) {
  const { outputModulesDir } = c.pointFiles;
  const { modules } = c;

  const files: [string, string][] = []

  modules
  .filter(f => /\.ts(x?)$/.test(f.file))
  .forEach(f => {
    const outPath = path.join(outputModulesDir, f.relativeFile.replace(/\.ts(x?)$/, '.layout.d.ts'))
    files.push([f.path, outPath])
  })

  return Promise.all(files.map(async ([inputPath, outputPath]) => {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const { name } = path.parse(inputPath);
    const json = layoutTypes.parse(content);
    const tsdCode = layoutTypes.toTSD(json);
    console.log('outputPath: ', outputPath);
    fs.writeFileSync(outputPath, `type ${name}Layout = ${tsdCode}`)
  }))
}


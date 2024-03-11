import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../../config";
import * as layoutTypes from './layoutTypes'

import { buildDTS, esbuild } from '../bundleUtility';
import loadModuleToView from '../plugins/esbuild-load-module';

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
    fs.writeFileSync(outputPath, `type ${name}Layout = ${tsdCode}`)
  }))
}

export async function generateViewFromModule (c: IConfig) {
  const moduleFilesDir = path.join(c.cwd, c.modulesDirectory)

  const moduleFiles = fs.readdirSync(moduleFilesDir).map(f => path.join(moduleFilesDir, f))

  await esbuild({
    entryPoints: moduleFiles.slice(0,1),
    outdir: c.generateFiles.viewsDir,
    platform: 'browser',
    format: 'esm',
    treeShaking: true,
    plugins: [
      loadModuleToView(c.cwd),
    ]
  })  
}

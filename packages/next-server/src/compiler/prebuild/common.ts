import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { IConfig } from '../../config';
import { join, parse } from 'path';
import { buildDTS, buildDTS2, esbuild, runTSC } from '../bundleUtility';
import { logFrame, traverseDir, tryMkdir } from '../../util';
import { cp } from 'shelljs';
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer';
import postcss from 'postcss'
import less from 'postcss-less'
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';
import externalGlobals from '../plugins/esbuild-globals';
import { compressZip } from '../../util';

export async function buildCommonDirs(c: IConfig) {
  const dirs = readdirSync(c.cwd)
    .filter(name => /^[a-zA-Z0-9]+$/.test(name))
    .filter(name => !c.preservedDirs.includes(name))
    .map(name => {
      return name
    })

  await Promise.all(dirs.map(name => {

    const dir = join(c.cwd, name)
    const dest = join(c.pointFiles.output.root, name)

    const files: string[] = []
    traverseDir(dir, f => {
      if (/\.tsx?/.test(f.file)) {
        files.push(f.path)
      }
    })
    if (files.length) {
      return runTSC(c, files, dest)
    }
  }))

  dirs.forEach(name => {
    logFrame(`build dir '${name}' done`)
  })
}

export async function buildPolymitaConfig(c: IConfig) {
  if (existsSync(c.configFile)) {
    esbuild({
      entryPoints: [c.configFile],
      outfile: c.pointFiles.output.configFile,
      format: 'cjs',
    })
  }
}


export async function  buildScripts(c: IConfig) {

  const buildEntries: string[] = []

  /**
   * only server
   * edge scripts compiled within UI
   */
  ;[
    [c.serverDir, c.pointFiles.output.scriptsDir],
  ].forEach(([type, destDir]) => {
    const dir = join(c.cwd, c.scriptDirectory, type)

    tryMkdir(destDir)          
    traverseDir(dir, f => {
      if (f.isDir) {
        tryMkdir(join(c.pointFiles.output.scriptsDir, type, f.relativeFile))
      } else {
        if (/\.ts(x)?/.test(f.file)) {
          buildEntries.push(f.path)
        } else if (!/^\./.test(f.file)) {
          // ignore hidden files
          cp(f.path, join(destDir, f.relativeFile))
        }
      }
    })
  })

  if (buildEntries.length) {
    await Promise.all([
      esbuild({
        entryPoints: buildEntries,
        outdir: c.pointFiles.output.scriptsDir,
        outbase: join(c.cwd, c.scriptDirectory),
      }),
    ])
  }
}

export const externalModules = (modules: string[] = []) => ({
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
  'react-router-dom': 'ReactRouterDOM',
  '@emotion/react': 'emotionReact',
  '@emotion/styled': 'emotionStyled',
  '@mui/material': 'MaterialUI',
  '@polymita/next-connect': 'window["@polymita/next-connect"]',
  '@polymita/renderer': 'window["@polymita/renderer"]',
  '@polymita/signal': 'window["@polymita/signal"]',
  '@polymita/signal-model': 'window["@polymita/signal-model"]',
  'eventemitter3': 'EventEmitter3',
  ...Object.fromEntries(modules.map(name => [name, `window["${name}"]`]))
})


/**
 * virtual index
 */
export async function buildIndex(c: IConfig) {
  const entry = c.pointFiles.output.virtualIndex
  console.log('[buildIndex] entry: ', entry);
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    format: 'umd' as any,
    outfile: c.pointFiles.output.index,
    external: [
      ...Object.keys(externalModules(c.dependencyModules.map(f => f.name))),
    ],
    plugins: [
      externalGlobals(externalModules(c.dependencyModules.map(f => f.name))),
      umdWrapper({
        libraryName: c.packageJSON.name
      }),
    ],
  })

  await buildDTS(
    c,
    [entry],
    c.pointFiles.output.root,
  )
  unlinkSync(entry)
}

export async function buildTailwindCSS(c: IConfig) {

  if (!c.tailwindConfigPath) {
    return
  }

  const globalCSSPath = join(c.cwd, 'app/globals.css')

  if (!existsSync(globalCSSPath)) {
    return
  }
  const contents = readFileSync(globalCSSPath, 'utf-8')

  const result = await postcss([
    tailwindcss({
      config: c.tailwindConfigPath,
    }),
    autoprefixer() as any
  ]).process(contents, {
    from: globalCSSPath,
    to: c.pointFiles.output.css,
    syntax: less,
  });

  writeFileSync(c.pointFiles.output.css, result.css)
}

export async function buildMeta(c: IConfig) {
  const meta = c.pointFiles.output.meta

  await writeFile(meta, JSON.stringify(c.moduleConfig, null, 2))
}

export async function zipOutput(c: IConfig) {
  if (existsSync(c.pointFiles.output.zip)) {
    unlinkSync(c.pointFiles.output.zip)
  }

  const files = [
    ['dist', c.pointFiles.output.root],
    ['', c.packageJSONPath],
  ] as [string, string][];

  compressZip(files, c.pointFiles.output.zip)
}

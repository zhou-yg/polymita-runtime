import { existsSync, readdirSync, unlinkSync } from 'fs';
import { IConfig } from '../../config';
import { join, parse } from 'path';
import { buildDTS, buildDTS2, esbuild, runTSC } from '../bundleUtility';
import { logFrame, traverseDir, tryMkdir } from '../../util';
import { cp } from 'shelljs';
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';
import externalGlobals from '../plugins/esbuild-globals';

export async function buildCommonDirs(c: IConfig) {
  const dirs = readdirSync(c.cwd)
    .filter(name => /^[a-zA-Z0-9]+$/.test(name))
    .filter(name => !c.preservedDirs.includes(name))
    .map(name => {
      return name
    })

  await Promise.all(dirs.map(name => {
    console.log('name: ', name);
    const dir = join(c.cwd, name)
    const dest = join(c.pointFiles.outputDir, name)

    const files: string[] = []
    traverseDir(dir, f => {
      if (/\.tsx?/.test(f.file)) {
        files.push(f.path)
      }
    })

    return runTSC(c, files, dest)
  }))

  dirs.forEach(name => {
    logFrame(`build dir '${name}' done`)
  })
}

export async function buildPolymitaConfig(c: IConfig) {
  if (existsSync(c.configFile)) {
    esbuild({
      entryPoints: [c.configFile],
      outfile: c.pointFiles.configFile,
      format: 'cjs',
    })
  }
}

export async function  buildScripts(c: IConfig) {

  const buildEntries: string[] = []

  ;[
    [c.serverDir, c.pointFiles.outputServerScriptsDir],
  ].forEach(([type, destDir]) => {
    const dir = join(c.cwd, c.scriptDirectory, type)

    tryMkdir(destDir)

    traverseDir(dir, f => {
      if (f.isDir) {
        tryMkdir(join(c.pointFiles.outputScriptsDir, type, f.relativeFile))
      } else {
        if (/\.ts(x)?/.test(f.file)) {
          buildEntries.push(f.path)
        } else if (!/^\./.test(f.file)) {
          cp(f.path, join(destDir, f.relativeFile))
        }
      }
    })
  })

  if (buildEntries.length) {
    await Promise.all([
      esbuild({
        entryPoints: buildEntries,
        outdir: c.pointFiles.outputScriptsDir,
        outbase: join(c.cwd, c.scriptDirectory),
      }),
    ])
  }
}

export const externalModules = (modules: string[] = []) => ({
  react: 'React',
  'react-dom': 'ReactDOM',
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
  const entry = c.pointFiles.outputVirtualIndex
  console.log('[buildIndex] entry: ', entry);
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    format: 'umd' as any,
    outfile: c.pointFiles.outputIndex,
    external: [
      ...Object.keys(externalModules(c.dependencyModules)),
    ],
    plugins: [
      externalGlobals(externalModules(c.dependencyModules)),
      umdWrapper({
        libraryName: c.packageJSON.name
      }),
    ],
  })

  await buildDTS(
    c,
    [entry],
    c.pointFiles.outputDir,
  )
  unlinkSync(entry)
}
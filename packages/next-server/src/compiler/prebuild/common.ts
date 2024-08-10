import { existsSync, readdirSync } from 'fs';
import { IConfig } from '../../config';
import { join, parse } from 'path';
import { buildDTS, esbuild, runTSC } from '../bundleUtility';
import { logFrame, traverseDir, tryMkdir } from '../../util';
import { cp } from 'shelljs';
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';

export async function buildCommonDirs(c: IConfig) {
  const dirs = readdirSync(c.cwd)
    .filter(name => /^[a-zA-Z0-9]+$/.test(name))
    .filter(name => !c.preservedDirs.includes(name))
    .map(name => {
      return name
    })

  await Promise.all(dirs.map(name => {
    const dir = join(c.cwd, name)
    const dest = join(c.pointFiles.outputDir, name)

    const files: string[] = []
    traverseDir(dir, f => {
      if (/\.ts(x)?/.test(f.file)) {
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

/**
 * virtual index
 */
export async function buildIndex(c: IConfig) {
  const entry = c.devFiles.virtualIndex
  esbuild({
    entryPoints: [entry],
    bundle: true,
    format: 'umd' as any,
    outfile: c.pointFiles.outputIndex,
    external: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@polymita/next-connect',
      '@polymita/next-server',
      '@polymita/renderer',
      'react',
      'react-dom',
      'react-router-dom'
    ],
    plugins: [
      umdWrapper({
        libraryName: c.packageJSON.name
      }),
    ],
  })
}
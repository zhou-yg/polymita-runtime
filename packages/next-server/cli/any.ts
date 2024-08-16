import * as path from 'path'
import * as fs from 'fs'
import chokidar from 'chokidar'
import {
  IConfig, IWatcherConfig, buildModelIndexes, composeSchema, generateLayoutTypes, generateModelTypes2, generateSignalMap, generateViewFromModule, preCheckSchema, readConfig, watchByConfig,
  logFrame,
  time,
  errorFrame,
  generateSignalsAndDeps,
  buildModules,
  buildCommonDirs,
  emptyDirectory,
  buildScripts,
  composeScripts,
  buildOverrides,
  generateClientRoutes,
  generateBuildingIndex,
  buildIndex,
  buildPolymitaConfig,
  createDevServer,
  createDevViteServer,
  generateViewFromOverrides,
} from '../src'

async function buildEverything (c: IConfig) {

  // await generateViewFromModule(c)

  // await generateSignalsAndDeps(c)
  
  // generateLayoutTypes(c)

  // await Promise.all([
  //   buildModelIndexes(c),
  //   generateModelTypes2(c),
  // ])
}

function prepareDirs(c: IConfig) {
  if (!fs.existsSync(c.generateFiles.root)) {
    fs.mkdirSync(c.generateFiles.root, { recursive: true })
  }
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
    isProd: false,
  })

  let t1 = time()

  emptyDirectory(config.pointFiles.outputDir)
  prepareDirs(config)

  const c = config;
  await Promise.all([
    generateViewFromModule(c),
    generateViewFromOverrides(c),
    generateSignalsAndDeps(c),
  ])
  
  generateLayoutTypes(c)

  await Promise.all([
    buildModelIndexes(c),
    generateModelTypes2(c),
  ])

  createDevViteServer(config)
}
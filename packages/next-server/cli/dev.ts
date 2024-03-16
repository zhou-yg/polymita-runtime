import * as path from 'path'
import * as fs from 'fs'
import chokidar from 'chokidar'
import { IConfig, IWatcherConfig, buildModelIndexes, composeDriver, composeSchema, generateLayoutTypes, generateModelTypes, generateModelTypes2, generateSignalMap, generateViewFromModule, preCheckSchema, readConfig, watchByConfig } from '../src'


function resolveNext(c: IConfig) {
  return require(path.join(c.cwd, './node_modules/next/'))
}

const chokidarOptions = () => ({
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

async function buildEverything (c: IConfig) {
  generateSignalMap(c)

  await generateViewFromModule(c)
  
  generateLayoutTypes(c)

  await Promise.all([
    buildModelIndexes(c),
    generateModelTypes2(c),
  ])
}

function watchEverything (c: IConfig) {
  const driversGroup = [
    path.join(c.cwd, c.signalsDirectory),
  ]
  const driversWatcher = chokidar.watch(driversGroup, chokidarOptions())

  const config: IWatcherConfig[] = [
    {
      watcher: driversWatcher,
      name: 'signals',
      event: 'change',
      callbackMode: 'sequence',
      callbacks: [generateSignalMap],
    },
  ]

  watchByConfig(c.cwd, config)
}

function prepareDirs(c: IConfig) {
  if (!fs.existsSync(c.generateFiles.root)) {
    fs.mkdirSync(c.generateFiles.root, { recursive: true })
  }
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
  })

  prepareDirs(config)

  await Promise.all([
    composeSchema(config),
    // composeDriver(config)  
  ])
  await preCheckSchema(config);

  await buildEverything(config)

  watchEverything(config)

  const next = resolveNext(config)

  next({ 
    dev: true,
    port: 
  })
}
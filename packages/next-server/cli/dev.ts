import * as path from 'path'
import chokidar from 'chokidar'
import { IConfig, IWatcherConfig, buildModelIndexes, composeDriver, composeSchema, generateLayoutTypes, generateModelTypes, generateModelTypes2, generateSignalMap, generateViewFromModule, preCheckSchema, readConfig, watchByConfig } from '../src'

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

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
  })

  await Promise.all([
    composeSchema(config),
    // composeDriver(config)  
  ])
  await preCheckSchema(config);

  await buildEverything(config)

  watchEverything(config)
}
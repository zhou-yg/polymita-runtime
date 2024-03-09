import * as path from 'path'
import exitHook from 'exit-hook'
import chokidar, { FSWatcher } from 'chokidar'
import * as prismaInternals from '@prisma/internals'
import chalk from 'chalk'
import { IConfig, IWatcherConfig, generateSignalMap, readConfig, watchByConfig } from '../src'

const chokidarOptions = () => ({
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

function watchEverything (c: IConfig) {
  const driversGroup = [
    path.join(c.cwd, c.signalsDirectory),
  ]
  const driversWatcher = chokidar.watch(driversGroup, chokidarOptions())

  const config: IWatcherConfig[] = [
    {
      watcher: driversWatcher,
      name: 'drivers',
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

  watchEverything(config)
}
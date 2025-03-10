import { chokidarOptions, IConfig, IWatcherConfig, logFrame, readConfig, reduceScopePrefix, sleep, watchByConfig, zipOutput } from '../src'
import * as path from 'path'
import chokidar from 'chokidar'
import { linkToLocal } from './upload'
import zipCli from './zip'

function watchEverything (c: IConfig, callback: () => void) {
  const signalsGroup = [
    path.join(c.cwd, c.signalsDirectory),
  ]
  const modelsGroup = [
    // watch *.prisma
    path.join(c.cwd, c.modelsDirectory, '*.' + c.model.engine),
  ]
  const modulesGroup = [
    path.join(c.cwd, c.modulesDirectory),
  ]
  const overridesGroup = [
    path.join(c.cwd, c.overridesDirectory),
  ]
  const modelsWatcher = chokidar.watch(modelsGroup, chokidarOptions())
  const signalsWatcher = chokidar.watch(signalsGroup, chokidarOptions())
  const modulesWatcher = chokidar.watch(modulesGroup, chokidarOptions())
  const overridesWatcher = chokidar.watch(overridesGroup, chokidarOptions())

  const config: IWatcherConfig[] = [
    {
      watcher: signalsWatcher,
      name: 'signals-change',
      event: 'change',
      callbackMode: 'sequence',
      callbacks: [callback],
    },
    {
      watcher: modelsWatcher,
      name: 'models-add-unlink',
      event: ['add', 'unlink'],
      callbackMode: 'concurrent',
      callbacks: [callback],
    },
    {
      watcher: modulesWatcher,
      name: 'modules-add-change-unlink',
      event: ['add', 'change', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [callback],
    },
    {
      watcher: overridesWatcher,
      name: 'overrides-add-change-unlink',
      event: ['add', 'change', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [callback],
    },
  ]

  watchByConfig(c.cwd, config)
}


async function linkTask(cwd: string, options: {
  localPort: number
})  {

  const config = await zipCli(cwd)

  await sleep(500)

  try {
    await linkToLocal(config, options.localPort)
  } catch (e) {
    console.error(e)
  }

  return config
}


export default async (cwd: string, options: {
  localPort: number
}) => {
  const config = await linkTask(cwd, options)

  watchEverything(config, () => {
    linkTask(cwd, options)
  })
}
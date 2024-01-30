import * as path from 'path'
import exitHook from 'exit-hook'
import chokidar, { FSWatcher } from 'chokidar'
import * as prismaInternals from '@prisma/internals'
import chalk from 'chalk'
import {
  IConfig,
  readConfig,
  http,
  composeSchema,
  composeDriver,
  buildEntryServer, buildDrivers, buildServerRoutes,
  generateHookDeps,
  emptyDirectory, logFrame, tryMkdir, time, buildModelIndexes,
  generateClientRoutes,
  generateServerRoutes,
  watchServerRoutes,
  getEntryFile,
  contextServerRoutes,
  generateModelTypes,
  runPrismaDev,
} from "../src/";

import * as desktop from '../desktopSrc/dev'
import rimraf from 'rimraf';
import { existsSync, readFileSync } from 'node:fs';
import { exec, spawn } from 'child_process'

export async function buildEverything (c: IConfig) {
  
  const cost = time()

  await buildModelIndexes(c).then(() => {
    logFrame(`build modelIndexes end. cost ${chalk.green(cost())} sec`)
  })

  await buildDrivers(c).then(() => {
    generateHookDeps(c)
    logFrame(`build drivers end. cost ${chalk.green(cost())} sec`)
  })

  await Promise.all([
    generateClientRoutes(c).then(() => {
      logFrame(`generate routes(client) end. cost ${chalk.green(cost())} sec`)
    }),
    generateServerRoutes(c).then(() => {
      logFrame(`generate routes(server) end. cost ${chalk.green(cost())} sec`)
    })
  ])

  // must execute after driver building
  await Promise.all([
    // buildServerRoutes(c).then(() => {
    //   logFrame(`build routes(server) end. cost ${chalk.green(cost())} sec`)
    // }),
    buildEntryServer(c).then(() => {
      logFrame(`build entryServer end. cost ${chalk.green(cost())} sec`)
    })
  ])
}

export function prepareDir (c: IConfig) {
  emptyDirectory(c.pointFiles.outputDir)

  // append
  tryMkdir(path.join(c.pointFiles.outputClientDir, c.driversDirectory))
  tryMkdir(path.join(c.pointFiles.outputServerDir, c.driversDirectory))
  
  Object.entries(c.pointFiles).forEach(([name, path]) => {
    if (/Dir$/.test(name)) {
      tryMkdir(path)
    }
  })
}

export const chokidarOptions = () => ({
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

interface IWatcherConfig {
  watcher: chokidar.FSWatcher
  name: string
  event: 'add' | 'change' | 'error' | 'unlink'
  callbacks: (((c: IConfig) => Promise<void>) | (() => void))[]
  callbackMode?: 'cocurrent' | 'sequence'
}

export function watchByConfig (cwd: string, config: IWatcherConfig[]) {
  const eventCallbackRunningState = new Map<FSWatcher, Map<string, boolean>>()

  const eventCalbackLastWaiter = new Map<FSWatcher, Map<string, true>>()
  
  async function existsLastWaiterAndCallback (wc: IWatcherConfig, newConfig: IConfig) {
    const { watcher, name, event, callbacks } = wc
    const queue = eventCalbackLastWaiter.get(watcher) || new Map()
    const hasLastWaiter = queue.get(event) || false

    const state = eventCallbackRunningState.get(watcher) || new Map()

    if (hasLastWaiter) {
      queue.set(event, false)
      /**
       * 有新加了文件没监听到，需要重新读下配置
       */
      const newConfig = await readConfig({ cwd });
      existsLastWaiterAndCallback(wc, newConfig)
    } else {
      state.set(event, true)
      const cost = time()
      if (wc.callbackMode === 'sequence') {
        await callbacks.reduce((p, cb) => {
          return p.then(() => cb(newConfig))
        }, Promise.resolve());

        logFrame(`[${name}.${event}] end. cost ${chalk.green(cost())} sec`)
        state.set(event, false)
      } else {
        await Promise.all(callbacks.map(cb => cb(newConfig)));

        logFrame(`[${name}.${event}] end. cost ${chalk.green(cost())} sec`)
        state.set(event, false)
      }
    }
  }

  async function executeCallbacks (wc: IWatcherConfig) {
    const { watcher, name, event } = wc

    const state = eventCallbackRunningState.get(watcher) || new Map()
    const isRunning = state.get(event) || false

    if (isRunning) {
      const queue = eventCalbackLastWaiter.get(watcher) || new Map()
      queue.set(event, true)
      return
    }
    const newConfig = await readConfig({ cwd });
    existsLastWaiterAndCallback(wc, newConfig)
  }

  config.forEach((wc) => {
    const { watcher, name, event } = wc
    watcher.on(event, (path) => {
      if (/(\.css|\.less|\.scss)$/.test(path)) {
        logFrame(`[${name}.${event}] ignored by "${path}"`)
        return
      }
      logFrame(`[${name}.${event}] trigger by "${path}"`)
      executeCallbacks(wc)
    })
  })

  exitHook(() => {
    console.log('[startCompile] exithook callback')
    config.forEach((wc) => {
      wc.watcher.close()
    })
  }) 
}

function watchEverything (c: IConfig) {
  const serverEntry = getEntryFile(c)

  const appGroup = [
    path.join(c.cwd, c.appDirectory), // -> client routes
  ]
  const appServerEntry = serverEntry?.file ? [
    path.join(c.cwd, c.appDirectory, serverEntry.file),
  ] : []
  const viewsGroup = [
    path.join(c.cwd, c.viewsDirectory),
    path.join(c.cwd, c.modulesDirectory),
  ]
  const driversGroup = [
    path.join(c.cwd, c.driversDirectory),
    path.join(c.cwd, c.modelsDirectory, c.targetSchemaPrisma)
  ]

  const appWatcher = chokidar.watch(appGroup, chokidarOptions())
  const entryServerWatcher = chokidar.watch(appServerEntry, chokidarOptions())
  const viewsWatcher = chokidar.watch(viewsGroup, chokidarOptions())
  const driversWatcher = chokidar.watch(driversGroup, chokidarOptions())
  const serverRoutesWatcher = chokidar.watch(c.pointFiles.autoGenerateServerRoutes, chokidarOptions())

  const rebuildServerRoutes = contextServerRoutes(c)
  rebuildServerRoutes()

  const config: IWatcherConfig[] = [
    {
      watcher: serverRoutesWatcher,
      name: 'serverRoutes',
      event: 'change',
      callbacks: [rebuildServerRoutes]
    },
    {
      watcher: appWatcher,
      name: 'app',
      event: 'change',
      callbacks: [generateServerRoutes]
    },
    {
      watcher: appWatcher,
      name: 'app',
      event: 'add',
      callbacks: [generateClientRoutes]
    },
    {
      watcher: appWatcher,
      name: 'app',
      event: 'unlink',
      callbacks: [generateClientRoutes]
    },
    {
      watcher: entryServerWatcher,
      name: 'entryServer',
      event: 'change',
      callbacks: [buildEntryServer]
    },
    {
      watcher: entryServerWatcher,
      name: 'entryServer',
      event: 'add',
      callbacks: [buildEntryServer]
    },
    {
      watcher: entryServerWatcher,
      name: 'entryServer',
      event: 'unlink',
      callbacks: [
        async (c: IConfig) => {
          const { distEntryJS }  = c.pointFiles
          rimraf.sync(distEntryJS)
        }
      ]
    },
    {
      watcher: viewsWatcher,
      name: 'views',
      event: 'change',
      callbacks: [generateServerRoutes]
    },
    {
      watcher: driversWatcher,
      name: 'drivers',
      event: 'change',
      callbackMode: 'sequence',
      callbacks: [buildDrivers, generateServerRoutes],
    },
  ]

  watchByConfig(c.cwd, config)

  // watchServerRoutes(c);
}

async function startCompile (c: IConfig) {

  logFrame('prepare')

  prepareDir(c)

  await buildEverything(c)

  watchEverything(c)
}

async function preCheckSchema(c: IConfig) {
  const schemaFile = path.join(c.cwd, c.modelsDirectory, c.targetSchemaPrisma)
  const schemaContent = readFileSync(schemaFile, 'utf-8');
  const model = await prismaInternals.getDMMF({
    datamodel: schemaContent
  })
  const gen = await prismaInternals.getGenerator({
    schemaPath: schemaFile,
    dataProxy: false
  })

  const config = await prismaInternals.getConfig({
    datamodel: schemaContent
  })
  const file = config.datasources[0].url.value;
  const relativeDbPath = file?.replace('file:', '')
  if (relativeDbPath) {
    const dbPath = path.join(c.cwd, c.modelsDirectory, relativeDbPath)
    const dbExists = existsSync(dbPath)
    if (!dbExists) {
      console.log(`[preCheckSchema] error, db file not found: ${dbPath}`)
      await runPrismaDev(c)
    }
  }
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
  })

  const prodDir = config.buildPointFiles.outputDir
  if (existsSync(prodDir)) {
    rimraf.sync(prodDir)
  }

  await Promise.all([
    composeSchema(config),
    composeDriver(config)  
  ])
  await preCheckSchema(config);

  await generateModelTypes(config);
  
  await startCompile(config)

  await http.createDevServer(config)

  switch (config.platform) {
    case 'browser': 
      break;
    case 'desktop':
      await desktop.createDevClient(config);
      break;
  }
}

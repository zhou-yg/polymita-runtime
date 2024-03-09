import chokidar, { FSWatcher } from 'chokidar'
import { IConfig, readConfig } from '../config'
import { logFrame, time } from '../util'
import chalk from 'chalk'
import exitHook from 'exit-hook'

export interface IWatcherConfig {
  watcher: chokidar.FSWatcher
  name: string
  event: 'add' | 'change' | 'error' | 'unlink'
  callbacks: (((c: IConfig) => Promise<void>) | (() => void) | ((c: IConfig) => void))[]
  callbackMode?: 'cocurrent' | 'sequence'
}

export const chokidarOptions = () => ({
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

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
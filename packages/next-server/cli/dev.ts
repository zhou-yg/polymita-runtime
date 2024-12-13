import * as path from 'path'
import * as fs from 'fs'
import chokidar from 'chokidar'
import {
  IConfig, IWatcherConfig, buildModelIndexes, composeSignal, composeSchema, generateLayoutTypes, generateModelTypes2, generateSignalMap, generateViewFromModule, preCheckSchema, readConfig, watchByConfig,
  createDevNextServer,
  logFrame,
  time,
  errorFrame,
  generateSignalsAndDeps,
  copyContextFiles,
  generateScripts,
  emptyDirectory,
  generateViewFromOverrides,
  createDevViteServer,
  generateClientRoutes,
  loadThirdPart,
} from '../src'

const chokidarOptions = () => ({
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

async function buildEverything (c: IConfig) {
  // generateSignalMap(c)
  // copyContextFiles(c)
  
  generateScripts(c)

  await Promise.all([
    generateViewFromModule(c),
    generateViewFromOverrides(c),
    generateSignalsAndDeps(c),
    generateClientRoutes(c),
  ])
  
  generateLayoutTypes(c)

  await Promise.all([
    buildModelIndexes(c),
    generateModelTypes2(c),
    
  ])
}

function watchEverything (c: IConfig) {
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
  const appGroup = [
    path.join(c.cwd, c.appDirectory),
  ]
  const modelsWatcher = chokidar.watch(modelsGroup, chokidarOptions())
  const signalsWatcher = chokidar.watch(signalsGroup, chokidarOptions())
  const modulesWatcher = chokidar.watch(modulesGroup, chokidarOptions())
  const overridesWatcher = chokidar.watch(overridesGroup, chokidarOptions())
  const appWatcher = chokidar.watch(appGroup, chokidarOptions())

  const config: IWatcherConfig[] = [
    {
      watcher: appWatcher,
      name: 'app-change',
      event: ['add', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [generateClientRoutes],
    },
    {
      watcher: signalsWatcher,
      name: 'signals-change',
      event: 'change',
      callbackMode: 'sequence',
      callbacks: [generateSignalsAndDeps],
    },
    {
      watcher: modelsWatcher,
      name: 'models-add-unlink',
      event: ['add', 'unlink'],
      callbackMode: 'concurrent',
      callbacks: [buildModelIndexes, generateModelTypes2],
    },
    {
      watcher: modulesWatcher,
      name: 'modules-add-change-unlink',
      event: ['add', 'change', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [generateViewFromModule, generateLayoutTypes],
    },
    {
      watcher: overridesWatcher,
      name: 'overrides-add-change-unlink',
      event: ['add', 'change', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [generateViewFromOverrides],
    },
  ]

  watchByConfig(c.cwd, config)
}

function prepareDirs(c: IConfig) {
  if (fs.existsSync(c.pointFiles.generates.root)) {
    emptyDirectory(c.pointFiles.generates.root)
  } else {
    fs.mkdirSync(c.pointFiles.generates.root, { recursive: true })
  }
}

export default async (cwd: string) => {
  const config = await readConfig({
    cwd,
  })

  let t1 = time()

  prepareDirs(config)

  await Promise.all([
    composeSchema(config),
    composeSignal(config),
  ])
  await preCheckSchema(config);

  logFrame(`compose schema in ${t1()}s`)

  t1 = time()

  await buildEverything(config)

  logFrame(`build everything in ${t1()}s`)

  watchEverything(config)

  try{
    loadThirdPart(config)
  }catch (e) {
    errorFrame(e)
  }

  createDevViteServer(config)
}
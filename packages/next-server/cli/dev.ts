import * as path from 'path'
import * as fs from 'fs'
import chokidar from 'chokidar'
import {
  IConfig, IWatcherConfig, buildModelIndexes, composeDriver, composeSchema, generateLayoutTypes, generateModelTypes2, generateSignalMap, generateViewFromModule, preCheckSchema, readConfig, watchByConfig,
  createDevServer,
  logFrame,
  time,
  errorFrame,
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
  const modelsGroup = [
    // watch *.prisma
    path.join(c.cwd, c.modelsDirectory, '*.' + c.model.engine),
  ]
  const modulesGroup = [
    path.join(c.cwd, c.modulesDirectory),
  ]
  const modelsWatcher = chokidar.watch(modelsGroup, chokidarOptions())
  const driversWatcher = chokidar.watch(driversGroup, chokidarOptions())
  const modulesWatcher = chokidar.watch(modulesGroup, chokidarOptions())

  const config: IWatcherConfig[] = [
    {
      watcher: driversWatcher,
      name: 'signals-c',
      event: 'change',
      callbackMode: 'sequence',
      callbacks: [generateSignalMap],
    },
    {
      watcher: modelsWatcher,
      name: 'models-au',
      event: ['add', 'unlink'],
      callbackMode: 'concurrent',
      callbacks: [buildModelIndexes, generateModelTypes2],
    },
    {
      watcher: modulesWatcher,
      name: 'modules-acu',
      event: ['add', 'change', 'unlink'],
      callbackMode: 'sequence',
      callbacks: [generateViewFromModule, generateLayoutTypes],
    },
  ]

  watchByConfig(c.cwd, config)
}

function prepareDirs(c: IConfig) {
  if (!fs.existsSync(c.generateFiles.root)) {
    fs.mkdirSync(c.generateFiles.root, { recursive: true })
  }
}

function loadThirdPart(c: IConfig) {
  if (fs.existsSync(c.thirdPartEntry)) {
    logFrame(`find third entry:${c.thirdPartEntry}`)
    require(c.thirdPartEntry)(c)
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
    // composeDriver(config)  
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

  createDevServer(config)
}
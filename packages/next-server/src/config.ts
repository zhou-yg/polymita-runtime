import * as path from 'path'
import * as fs from 'fs'
import l from 'lodash'
import { defineRoutesTree, readViews } from './config/routes'
import { IFile, isFileEmpty, loadJSON, logFrame, traverse, traverseDir } from './util'
import chalk from 'chalk'
import { findDependencies } from './config/deps'
import type { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package'
const { merge } = l
import getPort, { makeRange as portNumbers } from "get-port";

export { IViewConfig } from './config/routes'

export const defaultConfig = () => ({
  //
  platform: 'web', // 'desktop'

  // client about
  viewsDirectory: 'views', // in tarat the display unit maybe page or component, they should belong to "views"
  signalsDirectory: 'signals',
  composeDriversDirectory: 'compose',
  modelsDirectory: 'models',
  appDirectory: 'app',
  pageDirectory: 'pages',
  modulesDirectory: 'modules', // for polymita module dir
  testDirectory: 'test',

  publicDirectory: 'public',

  entry: 'entry', // jsx|tsx|css|less|json

  /**
   * https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration#migrating-_documentjs-and-_appjs
   */
  appRoot: 'layout', // the app root that extension in jsx|tsx

  generateRoot: 'polymita',
  generateSignalsMap: 'signalsMap',

  entryServer: 'entry.server', // .(j|t)sx in app
  routesServer: 'routes.server', // serve for tarat self
  routes: 'routes', // serve for tarat self

  ts: false,

  devCacheDirectory: '.tarat', // in cwd
  buildDirectory: 'dist', // in cwd
  testCacheDirectory: '.test', // in cwd

  clientDir: 'client',
  serverDir: 'server',

  appClientChunk: 'chunks',

  cjsDirectory: 'cjs',
  esmDirectory: 'esm',

  modelEnhance: 'model.enhance.json',
  prismaModelPart: 'part.prisma', // postfix
  targetSchemaPrisma: 'schema.prisma',
  schemaIndexes: 'indexes.json',
  schemaIndexesTypes: 'indexesTypes.d.ts',

  // server side
  apiPre: '_hook',

  diffPath: '_diff',

  port: 9100,
  model: {
    engine: 'prisma'
  },

  // compose
  compose: []
})

export type IDefaultConfig = ReturnType<typeof defaultConfig> & {
  cjsDirectory: 'cjs',
  esmDirectory: 'esm',
  model?: {
    engine: 'prisma' | 'er'
  }
} & UserCustomConfig


const configFile = 'polymita.config.js'

function readPages (viewDir: string, dir: string) {
  const pages = readViews(viewDir, dir)

  return pages
}

export interface IServerHookConfig {
  filePath: string
  file: string
  name: string
  dir: string
}

export function readDrivers(dir: string) {
  if (!fs.existsSync(dir)) {
    return []
  }
  const drivers = fs.readdirSync(dir)

  const hookConfigs: IServerHookConfig[] = []
  // check drivers
  drivers.forEach(f => {
    const p = path.join(dir, f)
    if (fs.lstatSync(p).isDirectory()) {
      const children = readDrivers(p)
      hookConfigs.push(...children)
    }
  })
  
  const hookConfigs2 = drivers.filter(f => {
    const filePath = path.join(dir, f)
    return fs.lstatSync(filePath).isFile()
  }).map(f => {

    const filePath = path.join(dir, f)
    const name = f.replace(/\.\w+/, '')

    const code = fs.readFileSync(filePath).toString()
    const empty = isFileEmpty(code)
    if (!empty) {
      const exportDefaultNames = code.match(/export default (function [A-Za-z0-9_]+;?|[A-Za-z0-9_]+);?/)
      const exportDefaultAuto = code.match(/export { default }/)
      if (exportDefaultNames) {
        if (exportDefaultNames[1] !== name && exportDefaultNames[1] !== `function ${name}`) {
          logFrame(
            `The default export name mismatch file name
            export default name is ${chalk.red(exportDefaultNames[1])}
            file name is ${chalk.green(name)}`
          )
          throw new Error('[readDrivers] error 2')  
        }
      } else if (!exportDefaultAuto) {
  
        logFrame(`Must have a default export in ${filePath}`)
        throw new Error('[readDrivers] error 1')
      }
    }

    return {
      dir,
      filePath,
      file: f,
      name,
    }
  })

  hookConfigs.push(...hookConfigs2)

  return hookConfigs
}

type UnPromisify<T> = T extends Promise<infer R> ? R : T;

type IReadConfigResult = UnPromisify<ReturnType<typeof readConfig>>

export interface IConfig extends IReadConfigResult{
  model: {
    engine: 'prisma' | 'er'
  }
}

function getOutputFiles (config: IDefaultConfig, cwd:string, outputDir: string) {
  const { esmDirectory, cjsDirectory } = config

  const outputClientDir = path.join(outputDir, config.clientDir)
  const outputServerDir = path.join(outputDir, config.serverDir)

  const outputAppServerDir = path.join(outputServerDir, config.appDirectory)
  const outputAppClientDir = path.join(outputClientDir, config.appDirectory)

  const filePostfix = config.ts ? '.tsx' : '.jsx'

  return {
    outputDir, 
    outputClientDir,
    outputServerDir,
    // source
    viewsDir: path.join(cwd, config.viewsDirectory),
    modulesDir: path.join(cwd, config.modulesDirectory),
    modelsDir: path.join(cwd, config.modelsDirectory),
    driversDir: path.join(cwd, config.signalsDirectory),
    appDir: path.join(cwd, config.appDirectory),

    // prisma
    outputModelsDir: path.join(outputDir, config.modelsDirectory),
    outputModelSchema: path.join(outputDir, config.modelsDirectory, config.targetSchemaPrisma),
    modelEnhanceFile: path.join(cwd, config.modelsDirectory, config.modelEnhance),
    modelTargetFile: path.join(cwd, config.modelsDirectory, config.targetSchemaPrisma),
    // views/modules/drivers
    outputViewsDir: path.join(outputDir, config.viewsDirectory),
    outputDriversDir: path.join(outputDir, config.signalsDirectory),
    outputModulesDir: path.join(outputDir, config.modulesDirectory),
    
    /** server */

    // app
    outputAppServerDir,
    // router
    autoGenerateServerRoutes: path.join(outputAppServerDir, `${config.routesServer}${filePostfix}`),    
    distServerRoutes: path.join(outputAppServerDir, `${config.routesServer}.js`),
    distServerRoutesCSS: path.join(outputAppServerDir, `${config.routesServer}.css`),
    // entry
    distEntryJS: path.join(outputAppServerDir, `${config.entryServer}.js`),
    distEntryCSS: path.join(outputAppServerDir, `${config.entryServer}.css`),
    // drivers
    outputServerDriversDir: path.join(outputServerDir, config.signalsDirectory, cjsDirectory),
    outputServerDriversESMDir: path.join(outputServerDir, config.signalsDirectory, esmDirectory),

    /** client */

    // app
    outputAppClientDir,
    appClientEntry: path.join(cwd, config.appDirectory, `${config.entry}${filePostfix}`),
    // router
    autoGenerateClientRoutes: path.join(outputAppClientDir, `${config.routes}${filePostfix}`),
    clientRoutes: path.join(outputAppClientDir, 'routes.js'),
    clientRoutesCSS: path.join(outputAppClientDir, 'routes.css'),
    // drivers
    outputClientDriversDir: path.join(outputClientDir, config.signalsDirectory, esmDirectory),
    outputClientDriversCJSDir: path.join(outputClientDir, config.signalsDirectory, cjsDirectory),
  }
}

function getGenerateFiles(config: IDefaultConfig, cwd:string) {

  const generateRootPath = path.join(cwd, config.appDirectory, config.generateRoot)

  const ext = config.ts ? '.ts' : '.js'

  return {
    root: generateRootPath,
    signalMap: path.join(generateRootPath, `${config.generateSignalsMap}${ext}`),
    viewsDir: path.join(generateRootPath, config.viewsDirectory),
  }
}

function readEntryCSS (pre: string, ) {
  const postfix = ['less', 'css']
  let r = ''
  postfix.forEach(p => {
    const f = `${pre}.${p}`
    if(fs.existsSync(f)) {
      if (r) {
        throw new Error(`[config.readEntryCSS] should not have duplcate style file from ${postfix}`)
      } else {
        r = f
      }
    }
  })
  return r
}

export interface IPackageJSON {
  name: string
}

function getAppRootFile (cwd: string, c: IDefaultConfig) {
  let f = path.join(cwd, c.appDirectory, c.appRoot)

  const tsx = '.tsx'
  const jsx = '.jsx'

  if (c.ts && fs.existsSync(`${f}${tsx}`)) {
    return {
      file: `${f}${tsx}`,
      path: f,
      name: c.appRoot,
      ext: tsx
    }
  }
  if (!c.ts && fs.existsSync(`${f}${jsx}`)) {
    return {
      file: `${f}${jsx}`,
      path: f,
      name: c.appRoot,
      ext: jsx
    }
  }
}

function readdirDepth (dir: string) {
  if (!fs.existsSync(dir)) {
    return []
  }
  const files: IFile[] = []
  traverseDir(dir, (f) => {
    if (!f.isDir) {
      files.push(f)
    }
  })

  return files
}

interface UserCustomConfig {
  platform: 'browser' | 'desktop'
  ts?: boolean
  debugLog?: boolean
}

function readModules (dir: string) {
  const modules: IFile[] = []

  traverseDir(dir, f => {
    if (/\.tsx/.test(f.path)) {
      modules.push(f)
    }
  })

  return modules
}

export async function readConfig (arg: {
  cwd: string,
  isProd?: boolean | 'prod' | 'dev' | 'test',
  port?: number
}) {
  const { cwd, isProd } = arg
  const configFileInPath = path.join(cwd, configFile)

  let config = defaultConfig() as IDefaultConfig
  if (fs.existsSync(configFileInPath)) {
    const configInFile: UserCustomConfig = require(configFileInPath)
    merge(config, configInFile)
  }

  const project = path.parse(cwd).name

  const packageJSONPath = path.join(cwd, 'package.json')
  const packageJSON: null | JSONSchemaForNPMPackageJsonFiles = fs.existsSync(packageJSONPath) ? loadJSON(packageJSONPath) : null

  const viewsDirectory = path.join(cwd, config.viewsDirectory)
  const signalsDirectory = path.join(cwd, config.signalsDirectory)
  const appDirectory = path.join(cwd, config.appDirectory)
  const pagesDirectory = path.join(appDirectory, config.pageDirectory)
  const modulesDirectory = path.join(cwd, config.modulesDirectory)
  const modelsDirectory = path.join(cwd, config.modelsDirectory)

  const views = readViews(viewsDirectory, '/')
  views.forEach(c => {
    c.file = path.join('./', config.viewsDirectory, c.file)
  })

  const pages = readPages(pagesDirectory, '/')

  const modules = readModules(modulesDirectory)

  // complement page file with page directory
  pages.forEach(c => {
    c.file = path.join('./', config.appDirectory, config.pageDirectory, c.file)
  })

  const drivers = readDrivers(signalsDirectory).map(d => {
    return {
      ...d,
      relativeDir: path.relative(signalsDirectory, d.dir)
    }
  })

  const currentFiles = {
    viewsDirectory,
    signalsDirectory,
    appDirectory,
    pagesDirectory,
    modulesDirectory,
    configFile: configFileInPath,
    schemaIndexes: path.join(modelsDirectory, config.schemaIndexes),
    schemaIndexesTypes: path.join(modelsDirectory, config.schemaIndexesTypes),
    targetSchemaPrisma: path.join(modelsDirectory, config.targetSchemaPrisma),
  }

  const entryCSS = readEntryCSS(path.join(cwd, config.appDirectory, config.entry))

  const devPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.devCacheDirectory))
  const buildPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.buildDirectory))
  const testPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.testCacheDirectory))
  // default to "dev"
  const pointFiles = isProd === 'test' ? testPointFiles : isProd ? buildPointFiles : devPointFiles

  const generateFiles = getGenerateFiles(config, cwd)

  const dependencyModules = findDependencies(cwd, packageJSON)

  const appRootFile = getAppRootFile(cwd, config)

  const routesTree = defineRoutesTree(pages)

  const port = await getPort({
    port: arg.port || (config.port ? config.port : process.env.PORT ? Number(process.env.PORT) : portNumbers(9000, 9100))
  })

  return {
    ...config,
    project,
    port,
    appRootFile,
    routesTree,
    packageJSON,
    isProd,
    entryCSS,
    pointFiles,
    generateFiles,
    currentFiles,
    devPointFiles,
    buildPointFiles,
    cwd,
    drivers,
    views,
    pages,
    dependencyModules,
    modules,
  }
}

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

  thirdPartDir: 'third_part',

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
  /** full path */
  filePath: string
  file: string
  name: string
  dir: string
}

export function readSignals(dir: string) {
  if (!fs.existsSync(dir)) {
    return []
  }
  const drivers = fs.readdirSync(dir)

  const hookConfigs: IServerHookConfig[] = []
  // check drivers
  drivers.forEach(f => {
    const p = path.join(dir, f)
    if (fs.lstatSync(p).isDirectory()) {
      const children = readSignals(p)
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
          throw new Error('[readSignals] error 2')  
        }
      } else if (!exportDefaultAuto) {
  
        logFrame(`Must have a default export in ${filePath}`)
        throw new Error('[readSignals] error 1')
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

  return {
    outputDir, 
    // prisma
    outputModelsDir: path.join(outputDir, config.modelsDirectory),
    outputSchemaPrisma: path.join(outputDir, config.modelsDirectory, config.targetSchemaPrisma),
    outputSchemaIndexes: path.join(outputDir, config.modelsDirectory, config.schemaIndexes),
    // views/modules/drivers
    outputViewsDir: path.join(outputDir, config.viewsDirectory),
    outputSignalsDir: path.join(outputDir, config.signalsDirectory),
    outputModulesDir: path.join(outputDir, config.modulesDirectory),    
    //
    outputCSS: path.join(outputDir, 'index.css'),    
  }
}

function getGenerateFiles(config: IDefaultConfig, cwd:string) {

  const generateRootPath = path.join(cwd, config.appDirectory, config.generateRoot)

  const ext = config.ts ? '.ts' : '.js'

  return {
    root: generateRootPath,
    signalMap: path.join(generateRootPath, `${config.generateSignalsMap}${ext}`),
    viewsDir: path.join(generateRootPath, config.viewsDirectory),
    signalsDir: path.join(generateRootPath, config.signalsDirectory),

    hooksFile: path.join(generateRootPath, 'hooks.ts'),
    actionsFile: path.join(generateRootPath, 'actions.ts'),
    connectFile: path.join(generateRootPath, 'connect.ts'),
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

function filterComposeSignals(
  cwd: string,
  config: IDefaultConfig,
  signals: ReturnType<typeof readSignals>
) {

  const composeDir = path.join(cwd, config.signalsDirectory, config.composeDriversDirectory)

  return signals.filter(obj => !obj.filePath.startsWith(composeDir))
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

function getTailwindConfigPath(cwd: string) {
  const pathPrefix = path.join(cwd, 'tailwind.config')
  if (fs.existsSync(pathPrefix + '.js')) {
    return pathPrefix + '.js'
  }
  if (fs.existsSync(pathPrefix + '.ts')) {
    return pathPrefix + '.ts'
  }
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

  const signals = filterComposeSignals(
    cwd,
    config,
    readSignals(signalsDirectory).map(d => {
      return {
        ...d,
        relativeDir: path.relative(signalsDirectory, d.dir)
      }
    })
  )

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

  const buildPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.buildDirectory))
  const devPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.appDirectory, config.generateRoot))

  const pointFiles = isProd ? buildPointFiles : devPointFiles

  const generateFiles = getGenerateFiles(config, cwd)

  const dependencyModules = findDependencies(cwd, packageJSON)

  const appRootFile = getAppRootFile(cwd, config)

  const routesTree = defineRoutesTree(pages)

  const port = await getPort({
    port: arg.port || (config.port ? config.port : process.env.PORT ? Number(process.env.PORT) : portNumbers(9000, 9100))
  })

  const thirdPartEntry = path.join(cwd, config.thirdPartDir)

  const modelDir = path.join(cwd, config.modelsDirectory)
  const modelEnhance = path.join(modelDir, config.modelEnhance)
  const schemaPrisma = path.join(modelDir, config.targetSchemaPrisma)
  const partSchemaPrisma = path.join(modelDir, config.prismaModelPart)
  const schemaIndexes = path.join(modelDir, config.schemaIndexes)

  const tailwindConfigPath = getTailwindConfigPath(cwd)

  return {
    ...config,
    modelFiles: {
      modelDir,
      modelEnhance,
      schemaPrisma,
      schemaIndexes,
      partSchemaPrisma,
    },
    tailwindConfigPath,
    project,
    port,
    appRootFile,
    routesTree,
    packageJSON,
    isProd,
    entryCSS,
    generateFiles,
    currentFiles,
    pointFiles,
    cwd,
    signals,
    views,
    pages,
    dependencyModules,
    modules,
    thirdPartEntry,
  }
}

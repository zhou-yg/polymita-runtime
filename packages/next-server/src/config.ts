import * as path from 'path'
import * as fs from 'fs'
import l from 'lodash'
import { IFile, isFileEmpty, loadJSON, logFrame, traverse, traverseDir, traverseFirstDir } from './util'
import chalk from 'chalk'
import { findDependencies, findDepLibs, findStaticDeps } from './config/deps'
import type { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package'
const { merge } = l
import getPort, { makeRange as portNumbers } from "get-port";
import { Request, Response } from 'koa'

export { IViewConfig } from './config/routes'

export const defaultConfig = () => ({
  app: {
    title: 'polymita',
  },

  //
  platform: 'web', // 'desktop'

  // client about
  viewsDirectory: 'views', // in polymita the display unit maybe page or component, they should belong to "views"
  signalsDirectory: 'signals',
  composeDriversDirectory: 'compose',
  modelsDirectory: 'models',
  appDirectory: 'app',
  pageDirectory: 'pages',
  modulesDirectory: 'modules', // for polymita module dir
  testDirectory: 'test',
  scriptDirectory: 'scripts', // for js script
  publicDirectory: 'public',
  overridesDirectory: 'overrides',
  configDirectory: 'config',
  contextDirectory: 'contexts',

  thirdPartDir: 'third_part',

  entry: 'entry', // jsx|tsx|css|less|json

  outputIndex: 'index.js',
  outputApp: 'app.js',
  outputAppCSS: 'app.css',

  appRoot: 'layout', // the app root that extension in jsx|tsx

  generateRoot: 'polymita',
  generateSignalsMap: 'signalsMap',

  entryServer: 'entry.server', // .(j|t)sx in app
  routesServer: 'routes.server', // serve for polymita self
  routes: 'routes', // serve for polymita self

  ts: false,

  electtronMainJs: 'main.js',
  electtronMainMenu: 'menu.js',
  electtronIndexHtml: 'index.html',
  electtronPreload: 'preload.js',

  devCacheDirectory: '.polymita', // in cwd
  buildDirectory: 'dist', // in cwd
  releaseDirectory: 'release', // in cwd
  testCacheDirectory: '.test', // in cwd

  composeDir: 'compose',
  clientDir: 'client',
  edgeDir: 'edge',
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
  apiPre: '/api/prisma',

  diffPath: '_diff',

  port: 9100,
  model: {
    engine: 'prisma'
  },

  // compose
  compose: []
})

interface ServerScriptConfig {
  runtime: 'server',
  onMounted: (req: Request, res: Response) => void;
}
interface EdgeScriptConfig {
  runtime: 'edge',
  onMounted: () => void;
}

export type ScriptConfig = EdgeScriptConfig | ServerScriptConfig

export type IDefaultConfig = ReturnType<typeof defaultConfig> & {
  cjsDirectory: 'cjs',
  esmDirectory: 'esm',
  model?: {
    engine: 'prisma' | 'er'
  }
} & UserCustomConfig


const configFile = 'polymita.config.js'
export const configFileName = 'polymita.config.js'

/**
 * app/page -> /
 * app/xxx/page -> /xxx
 */
const definePage = (f: IFile, viewDir: string) => {
  const isRoot = viewDir === f.dir

  const parsedDir = path.parse(f.dir)
  const prefix = f.dir.replace(viewDir, '')

  const name = isRoot ? '' : parsedDir.name

  const parentRouterPath = prefix.split('/').slice(0, -1).join('/')

  return {
    name: isRoot ? '' : name,
    parentRouterPath: isRoot ? '' : parentRouterPath || '/',
    routerPath: prefix || '/',
    path: f.path,
    relativeImportPath: path.join('./', f.relativeFile.replace(/\.\w+$/, '')),
    relativeLayoutImportPath: path.join('./', replaceToLayout(f.relativeFile)),
    layout: replaceToLayout(f.path),
    layoutExists: fs.existsSync(replaceToLayout(f.path)),
  }
};

export type PageConfig = ReturnType<typeof definePage>

export type IRouteChild = {
  routerPath: string
  pageConfig?: PageConfig,
  children: IRouteChild[]
}

export interface IRoutesTree {
  [k: string]: IRouteChild
}

function defineRoutesTree (pages: PageConfig[]) {
  const routesMap: IRoutesTree = {}
  pages.forEach(p => {
    if (!routesMap[p.parentRouterPath]) {
      routesMap[p.parentRouterPath] = {
        routerPath: p.parentRouterPath,
        children: []
      }
    }
    if (routesMap[p.routerPath]) {
      routesMap[p.routerPath].pageConfig = p
    } else {
      routesMap[p.routerPath] = {
        routerPath: p.routerPath,
        pageConfig: p,
        children: []
      }
    }
    const child = routesMap[p.parentRouterPath]
    const current = routesMap[p.routerPath]
    child.children.push(current)
  })
  const root = routesMap['/']

  return root;
}

const isPageFile = (f: string) => /page\.(j|t)sx$/.test(f)
const replaceToLayout = (f: string) => f.replace(/page\.(\w+)$/, `layout.$1`)

function readPages (config: IDefaultConfig, viewDir: string) {

  const pages: Array<PageConfig> = []

  traverseDir(viewDir, (f) => {
    if (!f.relativeFile.includes(config.generateRoot)) {
      if (isPageFile(f.file)) {
        pages.push(definePage(f, viewDir))
      }
    }
  })

  return pages
}

export interface IServerHookConfig extends IFile{
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
      isDir: false,
      path: filePath,
      relativeFile: filePath.replace(dir, '')
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

/**
 * building: output files
 * dev and building: generate files
 * 
 * relationships:
 *  dev -> m
 *  dev -> m -(g)-> app
 *  dev -> app 
 *  start -> app -(b)-> dist
 *  start -> m -(b)-> dist
 *  pkg(or release) -> ?
 * 
 * so: 
 *   any file -(dev/prod/release) -> mapping path
 */
function getOutputFiles (cwd: string, config: IDefaultConfig, isProd: boolean, isRelease: boolean) {
  const outputDir = isRelease
    ? path.join(cwd, config.releaseDirectory, config.appDirectory, config.buildDirectory)
    : path.join(cwd, config.buildDirectory)
  
  const generateRootPath = path.join(cwd, config.appDirectory, config.generateRoot)

  const appDir = path.join(cwd, config.appDirectory)

  const entryCSS = readEntryCSS(path.join(appDir, config.entry));
  
  const configFileInPath = path.join(cwd, configFile)

  const electronAppDir = path.join(cwd, config.releaseDirectory, config.appDirectory)

  const viewsDirectory = path.join(cwd, config.viewsDirectory)
  const signalsDirectory = path.join(cwd, config.signalsDirectory)
  const appDirectory = path.join(cwd, config.appDirectory)
  const pagesDirectory = path.join(appDirectory, config.pageDirectory)
  const modulesDirectory = path.join(cwd, config.modulesDirectory)
  const overridesDirectory = path.join(cwd, config.overridesDirectory)
  const modelsDirectory = path.join(cwd, config.modelsDirectory)
  const scriptsDirectory = path.join(cwd, config.scriptDirectory)
  const contextsDirectory = path.join(cwd, config.contextDirectory)
  
  const modelDir = path.join(cwd, config.modelsDirectory)
  const modelEnhance = path.join(modelDir, config.modelEnhance)
  const schemaPrisma = path.join(modelDir, config.targetSchemaPrisma)
  const partSchemaPrisma = path.join(modelDir, config.prismaModelPart)
  const schemaIndexes = path.join(modelDir, config.schemaIndexes)
  const schemaIndexesTypes = path.join(modelDir, config.schemaIndexesTypes)

  const modelFiles = {
    modelDir,
    modelEnhance,
    schemaPrisma,
    schemaIndexes,
    partSchemaPrisma,
    schemaIndexesTypes,
  }

  const currentFiles = {
    appDirectory,
    pagesDirectory,
    viewsDirectory,
    signalsDirectory,
    scriptsDirectory,
    scriptsServerDirectory: path.join(scriptsDirectory, config.serverDir),
    scriptsClientDirectory: path.join(scriptsDirectory, config.edgeDir),
    modulesDirectory,
    modelsDirectory,
    overridesDirectory,
    configFile: configFileInPath,
    modelFiles,
    contextsDirectory,
    node_modules: path.join(cwd, 'node_modules'),
  }  

  return {
    

    output: {
      root: outputDir, 
      virtualIndex: path.join(outputDir, 'index.ts'),
      index: path.join(outputDir, config.outputIndex),

      node_modules: path.join(outputDir, 'node_modules'),

      app: path.join(outputDir, config.outputApp),
      appCSS: path.join(outputDir, config.outputAppCSS),

      configFile: path.join(outputDir, config.configDirectory, configFile),
      contextDir: path.join(outputDir, config.contextDirectory),
      // prisma
      modelsDir: path.join(outputDir, config.modelsDirectory),
      schemaPrisma: path.join(outputDir, config.modelsDirectory, config.targetSchemaPrisma),
      schemaIndexes: path.join(outputDir, config.modelsDirectory, config.schemaIndexes),
      // views/modules/drivers
      viewsDir: path.join(outputDir, config.viewsDirectory),
      signalsDir: path.join(outputDir, config.signalsDirectory),
      modulesDir: path.join(outputDir, config.modulesDirectory),    
      overridesDir: path.join(outputDir, config.overridesDirectory),    
      //
      css: path.join(outputDir, 'index.css'),
      //
      scriptsDir: path.join(outputDir, config.scriptDirectory),    
      serverScriptsDir: path.join(outputDir, config.scriptDirectory, config.serverDir),    
      edgeScriptsDir: path.join(outputDir, config.scriptDirectory, config.edgeDir),    
    },

    app: {
      root: appDir,
      entryCSS,
      // routes.tsx including react-router
      clientRoutes: path.join(appDir, `${config.routes}.tsx`),
      // entry.tsx including app entry
      appClientEntry: path.join(appDir, `${config.entry}.tsx`),
    },
    currentFiles,

    generates: {
      // for electron
      electronAppDir,
      app: {
        pkgJSON: path.join(electronAppDir, 'package.json'),
        indexHtml: path.join(electronAppDir, config.electtronIndexHtml),
        preload: path.join(electronAppDir, 'main',config.electtronPreload),
        main: path.join(electronAppDir, 'main', config.electtronMainJs),
        menu: path.join(electronAppDir, 'main', config.electtronMainMenu),
        staticResourcesDir: path.join(electronAppDir, 'static'),
      },
      //
      root: generateRootPath,
      signalMap: path.join(generateRootPath, `${config.generateSignalsMap}.ts`),
      viewsDir: path.join(generateRootPath, config.viewsDirectory),
      signalsDir: path.join(generateRootPath, config.signalsDirectory),
  
      hooksFile: path.join(generateRootPath, 'hooks.ts'),
      actionsFile: path.join(generateRootPath, 'actions.ts'),
      connectFile: path.join(generateRootPath, 'connect.ts'),
      serverScriptsFile: path.join(generateRootPath, 'serverScripts.ts'),
      edgeScriptsFile: path.join(generateRootPath, 'edgeScripts.ts'),
    }
  }
}

function getEnvFiles (files: ReturnType<typeof getOutputFiles>, isProd: boolean, isRelease: boolean) {
  return {
    get serverScriptsIndex() {
      return isProd 
        ? path.join(files.output.serverScriptsDir, 'index.js')
        : path.join(files.currentFiles.scriptsDirectory, 'index.js')
    },
    get viewsDir () {
      return isProd
        ? files.output.viewsDir
        : files.generates.viewsDir
    }
  }
}

function readEntryCSS (pre: string, ) {
  const postfix = ['less', 'css']
  let r = ''
  postfix.forEach(p => {
    const f = `${pre}.${p}`
    if(fs.existsSync(f)) {
      if (r) {
        throw new Error(`[config.readEntryCSS] should not have duplicate style file from ${postfix}`)
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

function readContexts (dir: string) {

  const result: IFile[] = []

  traverseFirstDir(dir, (f) => {
    if (/\.(t|j)s(x?)/.test(f.path)) {
      result.push(f)
    }
  })

  return result
}

function readScripts (dir: string) {
  const result = {
    server: [] as IFile[],
    edge: [] as IFile[]
  }

  const serverDir = path.join(dir, 'server')
  const edgeDir = path.join(dir, 'edge')

  ;[serverDir, edgeDir].forEach(dir => {
    traverseFirstDir(dir, (f) => {
      if (/\.(t|j)s(x?)/.test(f.path) || f.dir) {
        if (f.path.startsWith(edgeDir)) {
          result.edge.push(f)
        } else {
          /**
           * by default, all files treated as server runtime script
           */
          result.server.push(f)
        }
      }
    })
  })

  return result
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
  isProd?: boolean,
  isRelease?: boolean,
  port?: number
}) {
  const { cwd, isProd, isRelease } = arg
  const configFileInPath = path.join(cwd, configFile)

  let config = defaultConfig() as IDefaultConfig
  if (fs.existsSync(configFileInPath)) {
    const configInFile: UserCustomConfig = require(configFileInPath)
    merge(config, configInFile)
  }

  const project = path.parse(cwd).name

  const packageJSONPath = path.join(cwd, 'package.json')
  const packageJSON: null | JSONSchemaForNPMPackageJsonFiles = fs.existsSync(packageJSONPath) ? loadJSON(packageJSONPath) : null

  const pointFiles = getOutputFiles(cwd, config, isProd, isRelease)

  const {
    appDirectory,
    modulesDirectory,
    overridesDirectory,
    scriptsDirectory,
    contextsDirectory,
    signalsDirectory,
  } = pointFiles.currentFiles


  const envFiles = getEnvFiles(pointFiles, isProd, isRelease)

  // to next@14
  // complement page file with page directory
  const pages = readPages(config, appDirectory)

  const modules = readModules(modulesDirectory)
  const overrides = readModules(overridesDirectory)

  const scripts = readScripts(scriptsDirectory)

  const contexts = readContexts(contextsDirectory)

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

  /**
   * @polymita/* business modules
   */
  const dependencyModules = findDependencies(cwd, configFileName, packageJSON)
  const staticDeps = findStaticDeps(isProd, cwd, dependencyModules)
  
  const dependencyLibs = findDepLibs(packageJSON)
  
  const appRootFile = getAppRootFile(cwd, config)

  const routesTree = defineRoutesTree(pages)

  const port = await getPort({
    port: arg.port || (config.port ? config.port : process.env.PORT ? Number(process.env.PORT) : portNumbers(9000, 9100))
  })

  const thirdPartEntry = path.join(cwd, config.thirdPartDir)

  const tailwindConfigPath = getTailwindConfigPath(cwd)

  const rootTsconfig = path.join(cwd, 'tsconfig.json');

  const preservedDirs = [
    config.viewsDirectory,
    config.signalsDirectory,
    config.composeDriversDirectory,
    config.modelsDirectory,
    config.appDirectory,
    config.pageDirectory,
    config.modulesDirectory,
    config.overridesDirectory,
    config.testDirectory,
    config.scriptDirectory,
    config.publicDirectory,
    config.thirdPartDir,
    config.entry,
    config.appRoot,
    config.devCacheDirectory,
    config.buildDirectory,
    config.testCacheDirectory,
  ]

  return {
    ...config,
    configFile,
    tailwindConfigPath,
    project,
    port,
    scripts,
    appRootFile,
    routesTree,
    packageJSON,
    isProd,
    pointFiles,
    envFiles,
    cwd,
    signals,
    contexts,
    pages,
    dependencyModules,
    dependencyLibs,
    modules,
    overrides,
    thirdPartEntry,
    preservedDirs,
    rootTsconfig,
    configFileName,
    staticDeps,
    packageJSONPath,
  }
}

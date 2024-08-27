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
    title: '',
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
  /**
   * https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration#migrating-_documentjs-and-_appjs
   */
  appRoot: 'layout', // the app root that extension in jsx|tsx

  generateRoot: 'polymita',
  generateSignalsMap: 'signalsMap',

  entryServer: 'entry.server', // .(j|t)sx in app
  routesServer: 'routes.server', // serve for polymita self
  routes: 'routes', // serve for polymita self

  ts: false,

  devCacheDirectory: '.polymita', // in cwd
  buildDirectory: 'dist', // in cwd
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

  const parentPath = prefix.split('/').slice(0, -1).join('/')

  return {
    name: isRoot ? 'root' : name,
    parentPath: isRoot ? '' : parentPath || '/',
    routerPath: prefix || '/',
    path: f.path,
    relativeImportPath: path.join('./', f.relativeFile.replace(/\.\w+$/, '')),
    layout: replaceToLayout(f.path),
    layoutExists: fs.existsSync(replaceToLayout(f.path)),
  }
};

export type PageConfig = ReturnType<typeof definePage>

export type IRouteChild = {
  routerPath: string
  children: PageConfig[]
}

export interface IRoutesTree {
  [k: string]: IRouteChild
}

function defineRoutesTree (pages: PageConfig[]) {
  const routesMap: IRoutesTree = {}
  pages.forEach(p => {
    routesMap[p.parentPath] = {
      routerPath: p.parentPath,
      children: []
    }
  })

  pages.forEach(p => {
    if (p.parentPath) {
      const child = routesMap[p.parentPath]
      child.children.push(p)
    }
  })

  return Object.values(routesMap)
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

function getEntry (cwd: string, config: IDefaultConfig, isProd: boolean) {

  // {cwd}/dist or {cwd}/app
  const dir = path.join(cwd, config.appDirectory)

  const entryCSS = readEntryCSS(path.join(dir, config.entry));

  const serverScripts = isProd 
    ? path.join(cwd, config.buildDirectory, config.scriptDirectory, 'server/index.js')
    : path.join(cwd, config.scriptDirectory, 'server/index.js')

  return {
    entryCSS,
    // routes.tsx including react-router
    clientRoutes: path.join(dir, `${config.routes}.tsx`),
    // entry.tsx including app entry
    appClientEntry: path.join(dir, `${config.entry}.tsx`),

    serverScripts,
  }
}

function getOutputFiles (config: IDefaultConfig, cwd:string, outputDir: string) {

  return {
    outputDir, 
    // output index
    outputVirtualIndex: path.join(outputDir, 'index.ts'),
    outputIndex: path.join(outputDir, config.outputIndex),
    outputApp: path.join(outputDir, config.outputApp),
    configFile: path.join(outputDir, config.configDirectory, configFile),
    //
    outputContextDir: path.join(outputDir, config.contextDirectory),

    // prisma
    outputModelsDir: path.join(outputDir, config.modelsDirectory),
    outputSchemaPrisma: path.join(outputDir, config.modelsDirectory, config.targetSchemaPrisma),
    outputSchemaIndexes: path.join(outputDir, config.modelsDirectory, config.schemaIndexes),
    // views/modules/drivers
    outputViewsDir: path.join(outputDir, config.viewsDirectory),
    outputSignalsDir: path.join(outputDir, config.signalsDirectory),
    outputModulesDir: path.join(outputDir, config.modulesDirectory),    
    outputOverridesDir: path.join(outputDir, config.overridesDirectory),    
    //
    outputCSS: path.join(outputDir, 'index.css'),
    //
    outputScriptsDir: path.join(outputDir, config.scriptDirectory),    
    outputServerScriptsDir: path.join(outputDir, config.scriptDirectory, config.serverDir),    
    outputEdgeScriptsDir: path.join(outputDir, config.scriptDirectory, config.edgeDir),    
    // scripts
    scriptsServerEntry: path.join(cwd, )
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
    serverScriptsFile: path.join(generateRootPath, 'serverScripts.ts'),
    edgeScriptsFile: path.join(generateRootPath, 'edgeScripts.ts'),
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
  const overridesDirectory = path.join(cwd, config.overridesDirectory)
  const modelsDirectory = path.join(cwd, config.modelsDirectory)
  const scriptsDirectory = path.join(cwd, config.scriptDirectory)
  const contextsDirectory = path.join(cwd, config.contextDirectory)

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
    schemaIndexes: path.join(modelsDirectory, config.schemaIndexes),
    schemaIndexesTypes: path.join(modelsDirectory, config.schemaIndexesTypes),
    targetSchemaPrisma: path.join(modelsDirectory, config.targetSchemaPrisma),
  }

  const entryFiles = getEntry(
    cwd, 
    config,
    isProd,
  );

  const buildPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.buildDirectory))
  const devPointFiles = getOutputFiles(config, cwd, path.join(cwd, config.appDirectory, config.generateRoot))
  const pointFiles = isProd ? buildPointFiles : devPointFiles
  const generateFiles = getGenerateFiles(config, cwd)

  /**
   * @polymita/* business modules
   */
  const dependencyModules = findDependencies(cwd, configFileName, packageJSON)
  const dependencyLibs = findDepLibs(packageJSON)
  const staticDeps = findStaticDeps(isProd, cwd, dependencyModules)

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
    modelFiles: {
      modelDir,
      modelEnhance,
      schemaPrisma,
      schemaIndexes,
      partSchemaPrisma,
    },
    configFile,
    tailwindConfigPath,
    project,
    port,
    scripts,
    appRootFile,
    routesTree,
    packageJSON,
    isProd,
    generateFiles,
    currentFiles,
    pointFiles,
    entryFiles,
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
  }
}

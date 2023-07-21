import * as prismaInternals from '@prisma/internals'
import acorn, { parse as acornParse } from 'acorn'
import { hookFactoryFeatures, modelHookFactoryFeatures, set } from '@polymita/signal-model'
import * as walk from 'acorn-walk'
import { IConfig, IViewConfig } from "../config";
import * as fs from 'fs'
import * as path from 'path'
import { compile, name } from 'ejs'
import { watch as rollupWatch, InputOptions, ModuleFormat, OutputOptions, Plugin, rollup, RollupBuild, RollupWatchOptions } from 'rollup' 
import resolve from '@rollup/plugin-node-resolve';
import { babel  } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json'
import commonjs from "@rollup/plugin-commonjs";
import postcss from 'rollup-plugin-postcss'
import tsPlugin from 'rollup-plugin-typescript2'
import * as prettier from 'prettier'
import * as esbuild from 'esbuild';
import { defineRoutesTree, IRouteChild } from "../config/routes";
import autoExternal from 'rollup-plugin-auto-external';
import replace from '@rollup/plugin-replace';
import rollupAlias from '@rollup/plugin-alias'
import dts from "rollup-plugin-dts"
import { generateDtsBundle } from 'dts-bundle-generator'
import { emptyDirectory, loadJSON, logFrame, lowerFirst, readFiles, traverseDir } from "../util";
import chalk from "chalk";
import { cp, mkdir, rm } from "shelljs";
import { ArrowFunctionExpression, CallExpression, FunctionExpression, Identifier, ImportDeclaration, Program } from 'estree';
import { traverse, last } from '../util';
import aliasDriverRollupPlugin from './plugins/rollup-plugin-alias-driver';
import { findDependentPrisma, readCurrentPrisma, readExsitPrismaPart, transformModelName } from './compose';
import { upperFirst } from 'lodash';
import { generateHookDeps } from './dependenceGraph';
import esbuildPluginPostcss from './plugins/esbuild-plugin-postcss';
import clearFunctionBodyEsbuildPlugin from './plugins/esbuild-clear-function-body';
import aliasAtCodeToCwd from './plugins/esbuild-alias-at';
import esbuildPluginAliasDriver from './plugins/esbuild-alias-driver';

const templateFile = './routesServerTemplate.ejs'
const templateFilePath = path.join(__dirname, templateFile)

const templateClientFile = './routesClientTemplate.ejs'
const templateClientFilePath = path.join(__dirname, templateClientFile)

const defaultTsconfigJSON = path.join(__dirname, './defaultTsconfig.json')

const routesTemplate = compile(fs.readFileSync(templateFilePath).toString())
const routesClientTemplate = compile(fs.readFileSync(templateClientFilePath).toString())


export interface IBuildOption {
  input: InputOptions
  output: OutputOptions
}

/**
 * searches for tsconfig.json file starting in the current directory, if not found
 * use the default tsconfig.json provide by tarat
 */
export function getTSConfigPath (cwd: string) {
  const tsconfigFile = path.join(cwd, 'tsconfig.json')
  if (fs.existsSync(tsconfigFile)) {
    return tsconfigFile
  }
  return defaultTsconfigJSON
}

function getPostCssConfigPath (c: IConfig) {
  let pp = ''
  fs.readdirSync(c.cwd).forEach(f => {
    if (/postcss\.config/.test(f)) {
      if (pp) {
        throw new Error(`[getPostCssConfigPath] duplicate postcsss.config file exist in ${c.cwd}`)
      } else {
        pp = path.join(c.cwd, f)
      }
    }
  })
  if (pp && fs.existsSync(pp)) {
    return pp
  }
}

export async function build (c: IConfig, op: IBuildOption) {
  const bundle = await rollup(op.input)
  await generateOutput(c, bundle, op.output)
  await bundle?.close()
}

async function generateOutput(c: IConfig, bundle: RollupBuild, op: IBuildOption['output']) {
  const { output } = await bundle.generate({
    exports: 'named',
    ...op,
  })
  for (const chunkOrAsset of output) {

    if (chunkOrAsset.type === 'asset') {
      const target = path.join(op.dir || c.pointFiles.outputDir, chunkOrAsset.fileName)
      fs.writeFileSync(target, chunkOrAsset.source)

    } else if (chunkOrAsset.type === 'chunk') {
      let dir = op.dir
      if (!op.dir) {
        dir = op.file?.replace(chunkOrAsset.fileName, '')
      }
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      if (op.file) {
        fs.writeFileSync(op.file, chunkOrAsset.code)
      } else {
        fs.writeFileSync(path.join(dir!, chunkOrAsset.fileName), chunkOrAsset.code)
      }
    }
  }
}



export function getPlugins (input: {
  css: string | boolean,
  mode: 'dev' | 'build',
  target?: 'browser' | 'node' | 'unit',
  alias?: { [k: string]: string },
  runtime?: 'server' | 'client'
}, c: IConfig) {
  const { runtime, alias, css, mode, target = 'node' } = input
  const plugins = [
    runtime ? aliasDriverRollupPlugin(c, runtime) : undefined,
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': mode === 'build' ? '"production"' : '"development"'
    }),
    rollupAlias({
      entries: {
        '@': c.cwd,
        ...(alias || {}),
      }
    }),
    json(),
    commonjs({
      // extensions: ['.js', '.ts'],
    }),
    resolve({
      browser: target === 'browser',
      extensions: ['.jsx', '.tsx', '.js', '.cjs', '.mjs', '.ts', '.json'],
      
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['@babel/preset-react']
    }),
    postcss({
      config: {
        path: getPostCssConfigPath(c),
        ctx: {}
      },
      extract: typeof css === 'string'  ? css.replace(c.pointFiles.outputDir, '').replace(/^\//, '') : css, // only support relative path
    }),
    autoExternal({
      peerDependencies: target !== 'browser', // only under browser need bundle all dependencies
      dependencies: mode === 'dev' && target !== 'browser'
    }),
    c.ts ? tsPlugin({
      clean: true,
      tsconfig: getTSConfigPath(c.cwd)
    }) : undefined,
  ].filter(Boolean)

  return plugins as Plugin[]
}


export function getEntryFile (c: IConfig) {
  let f = path.join(c.cwd, c.appDirectory, c.entryServer)

  const tsx = '.tsx'
  const jsx = '.jsx'

  if (c.ts && fs.existsSync(`${f}${tsx}`)) {
    return {
      file: `${f}${tsx}`,
      ext: tsx
    }
  }
  if (!c.ts && fs.existsSync(`${f}${jsx}`)) {
    return {
      file: `${f}${jsx}`,
      ext: jsx
    }
  }
}

function upperFirstVariable (s: string = '') {
  s = s.replace(/\:|-/g, '_').replace(/^_/, '')
  return s ? (s[0].toUpperCase() + s.substring(1)) : ''
}

function generateRoutesContent (routes: IRouteChild[], depth = 0, parentNmae = ''): string {
  const pathObj: { [p: string]: IRouteChild } = {}
  routes.forEach(r => {
    if (pathObj[r.path]) {
      const exist = pathObj[r.path]
      if (exist.dir) {
        Object.assign(exist, {
          dir: false,
          file: r.file,
          id: r.id
        })
      } else {
        Object.assign(exist, {
          dir: false,
          children: r.children
        })
      }
    } else {
      pathObj[r.path] = Object.assign({}, r)
    }
  })


  const routeArr = Object.values(pathObj).map((r, i) => {
    let Cpt = ''
    let element = ''

    if (r.dir) {
    } else {
      if (r.file) {
        Cpt = `${upperFirstVariable(parentNmae)}${upperFirstVariable(r.name)}`
      } else {
        const childIndex = r.children.find(c => c.index)
        Cpt = childIndex ? `${upperFirstVariable(parentNmae)}${upperFirstVariable(r.name) || '/'}${upperFirstVariable(childIndex.name)}` : ''
      }
      if (Cpt) {
        element = `element={<${Cpt} />}`
      }
    }

    return [
      r.index ? `<Route index ${element} >` : `<Route path="${r.name}" ${element} >`,
      r.children.length > 0 ? generateRoutesContent(r.children, depth + 1, r.name) : '',
      `</Route>`
    ].join('\n');
  })

  return routeArr.join('\n')
}

function generateRoutesImports (routes: IRouteChild[], parentNmae = '') {
  let importsArr: [string, string][] = []
  routes.forEach(r => {
    if (!r.dir && r.file) {
      importsArr.push([
        `${upperFirstVariable(parentNmae)}${upperFirstVariable(r.name)}`,
        r.file,
      ])
    }
    if (r.children) {
      const childImports = generateRoutesImports(r.children, r.name)
      importsArr.push(...childImports)
    }
  })

  return importsArr
}

function implicitImportPath (path: string, ts: boolean) {
  if (ts) {
    return path.replace(/\.ts(x?)$/, '')
  }

  return path
}

export async function generateClientRoutes(c: IConfig) {
  const {
    autoGenerateClientRoutes,
    appClientEntry,
  } = c.pointFiles

  const {
    appRootFile,
    routesTree: routesTreeArr,
  } = c
  // imports
  const imports = generateRoutesImports(routesTreeArr)
  const r = generateRoutesContent(routesTreeArr)

  const importsWithAbsolutePathClient = imports.map(([n, f]) => {
    return `import ${n} from '${implicitImportPath(path.join(c.cwd, f), c.ts)}'`
  }).join('\n')

  // app info
  const rootName = upperFirstVariable(appRootFile?.name)
  const rootAppInfo = {
    rootPath: appRootFile?.path,
    rootName,
    rootStart: appRootFile?.name ? `<${rootName}>` : '',
    rootEnd: appRootFile?.name ? `</${rootName}>` : ''
  }

  // model indexes
  const modelIndexesJSON = path.join(c.cwd, c.modelsDirectory, c.schemaIndexes)
  let modelIndexes = '{}'
  if (fs.existsSync(modelIndexesJSON)) {
    modelIndexes = fs.readFileSync(modelIndexesJSON).toString()
  }

  // entry file
  let clientEntry: {name: string, path: string }
  if (fs.existsSync(appClientEntry)) {
    clientEntry = {
      name: 'ClientEntry',
      path: appClientEntry.replace(/\.(j|t)s(x?)$/, '')
    }
  }

  const routesStr2 = routesClientTemplate({
    ...rootAppInfo,
    imports: importsWithAbsolutePathClient,
    routes: r,
    modelIndexes,
    clientEntry
  })
  // generate for vite.js so that this file doesn't need to be compiled to js
  fs.writeFileSync(autoGenerateClientRoutes, await prettier.format(routesStr2, { parser: 'typescript' }))
}

export async function generateServerRoutes(c: IConfig) {
  const {
    autoGenerateServerRoutes,
  } = c.pointFiles

  const {
    appRootFile,
    routesTree: routesTreeArr,
  } = c

  const imports = generateRoutesImports(routesTreeArr)
  const r = generateRoutesContent(routesTreeArr)

  const importsWithAbsolutePathServer = imports.map(([n, f]) => {
    return `import ${n} from '${implicitImportPath(path.join(c.cwd, f), c.ts)}'`
  }).join('\n')


  let entryCSSPath = ''
  if (c.entryCSS) {
    entryCSSPath = `import "${c.entryCSS}"`
  }

  const rootName = upperFirstVariable(appRootFile?.name)
  const rootAppInfo = {
    rootPath: appRootFile?.path,
    rootName,
    rootStart: appRootFile?.name ? `<${rootName}>` : '',
    rootEnd: appRootFile?.name ? `</${rootName}>` : ''
  }
  
  const modelIndexesJSON = path.join(c.cwd, c.modelsDirectory, c.schemaIndexes)
  let modelIndexes = '{}'
  if (fs.existsSync(modelIndexesJSON)) {
    modelIndexes = fs.readFileSync(modelIndexesJSON).toString()
  }
  
  const routesStr = routesTemplate({
    ...rootAppInfo,
    imports: importsWithAbsolutePathServer,
    entryCSSPath,
    routes: r,
    modelIndexes
  })
  fs.writeFileSync(autoGenerateServerRoutes, await prettier.format(routesStr, { parser: 'typescript' }))
}

export function contextServerRoutes(c: IConfig) {
  const {
    autoGenerateServerRoutes,
    distServerRoutes,
  } = c.pointFiles

  console.log('\nautoGenerateServerRoutes: ', autoGenerateServerRoutes, '\n');
  let ctxPromise = esbuild.context({
    entryPoints: [autoGenerateServerRoutes],
    outfile: distServerRoutes,
    format: 'cjs',
    bundle: true,
    platform: 'node',
    plugins: [
      esbuildPluginAliasDriver(c, 'server'),
      aliasAtCodeToCwd(c.cwd),
      esbuildPluginPostcss({
        cwd: c.cwd
      }),
    ],
    external: [
      ...generateExternal(c),
    ]
  });

  return async () => {
    return ctxPromise.then(ctx => {
      return ctx.rebuild()
    })
  }
}

export function watchServerRoutes(c: IConfig) {
  const {
    autoGenerateServerRoutes,
    distServerRoutes,
    distServerRoutesCSS
  } = c.pointFiles

  const myPlugins = getPlugins({
    css: `${c.routesServer}.css`,
    mode: 'dev',
    runtime: 'server',
  }, c)
  /**
   * compile routes.server to js
   * routes.client doesnt need becase of vite
   */
  const inputOptions: RollupWatchOptions = {
    input: autoGenerateServerRoutes,
    plugins: myPlugins,
    external: [
      '@polymita/signal-model',
      '@polymita/signal',
      '@polymita/renderer',
      '@polymita/connect',
      'react',
      '@mui/material',
      'polymita'
    ],
    output: {
      file: distServerRoutes,      
      exports: 'named',
      format: 'commonjs',
    }
  }
  
  const watcher = rollupWatch(inputOptions)
  watcher.on('change', (id, { event }) => {
    console.log('rollup watcher change ', event, id,)
  })
  watcher.on('restart', () => {
    console.log('rollup watcher restart')
  })
  return watcher
}

export async function buildServerRoutes(c: IConfig) {
  const {
    autoGenerateServerRoutes,
    distServerRoutes,
    distServerRoutesCSS
  } = c.pointFiles

  const myPlugins = getPlugins({
    css: distServerRoutesCSS,
    mode: 'dev',
    runtime: 'server',
  }, c)
  /**
   * compile routes.server to js
   * routes.client doesnt need becase of vite
   */
  const inputOptions: IBuildOption = {
    input: {
      input: autoGenerateServerRoutes,
      plugins: myPlugins,
      external: [
        '@polymita/signal-model',
        '@polymita/signal',
        '@polymita/renderer',
        '@polymita/connect',
        'react',
        '@mui/material',
        'polymita',
      ],
    },
    output: {
      file: distServerRoutes,      
      format: 'commonjs',
    }
  }
  await build(c, inputOptions)
}

export async function buildEntryServer (c: IConfig) {

  const r = getEntryFile(c)
  
  if (r?.file) {
    const { distEntryJS: distEntry }  = c.pointFiles

    // const inputOptions: IBuildOption = {
    //   input: {
    //     input: r.file,
    //     plugins: getPlugins({
    //       mode: 'dev',
    //       css: c.pointFiles.distEntryCSS,
    //       runtime: 'server'
    //     }, c),
        
    //   },
    //   output: {
    //     file: distEntry,
    //     format: 'commonjs',
    //   },
    // }

    // await build(c, inputOptions)

    await esbuild.build({
      entryPoints: [r.file],
      bundle: false,
      outfile: distEntry,
      platform: 'node',
      treeShaking: true,
      format: 'cjs',
      plugins: [
        aliasAtCodeToCwd(c.cwd),
      ]
    })
  }
}

/**
 * make sure hook will import the same module type and same envirnment (eg. client or server)
 */
export function replaceImportDriverPath (
  config: IConfig,
  sourceFile: string,
  format: esbuild.Format,
  env: 'client' | 'server',
) {
  const reg = /from (?:'|")([@\w\/-]*)(?:'|")/g
  const reg2 = /require\((?:'|")([@\w\/-]*)(?:'|")/g

  const { dependencyModules, buildDirectory, driversDirectory } = config

  const code = fs.readFileSync(sourceFile).toString()
  const r = code.match(reg)
  const r2 = code.match(reg2)
  const importModules = r || r2

  const modulePathRegExp = new RegExp(`(${dependencyModules.join('|')})/(${buildDirectory})/(${driversDirectory})/([\\w-]+)`, 'g')

  const condition = 
    importModules && importModules.length > 0 &&
    importModules.some(m => modulePathRegExp.test(m))
      
  if (condition) {  
    const c2 = code.replace(
      modulePathRegExp,
      `$1/$2/${env}/$3/${format}/$4`)
    fs.writeFileSync(sourceFile, c2)
  }
}

/**
 * under ESM remove all unused imports and directly import
 * ```
 * import 'foo'
 * import XX from 'foo'
 * import XX, { a } from 'foo'
 * import { a } from 'foo'
 * import * as XX from 'foo'
 * ```
 * @param sourceFile 
 */
export function removeUnusedImports(sourceFile: string) {
  const code = fs.readFileSync(sourceFile).toString()

  let ast: ReturnType<typeof acornParse>
  try {
    ast = acornParse(code, { sourceType: 'module', ecmaVersion: 'latest' });
  } catch (e) {
    console.error(`[removeUnusedImports] acorn parse error in ${sourceFile}:`, e)
    return
  }
  const removeImportRange: [number, number][] = []
  if (ast.type === 'Program') {
    ast.body.forEach((n) => {
      switch (n.type) {
        case 'ImportDeclaration':
          {
            const w2 = n.specifiers.map(s => s.local.name)
            let r = false
            walk.simple(ast as any, {
              Identifier (n: any) {
                r = r || w2.includes((n as Identifier).name)
              },
              ExportNamedDeclaration (n: any) {
                traverse(n, (pathArr: string[], value: Identifier) => {
                  if (value.type === 'Identifier' && last(pathArr) === 'local') {
                    r = r || w2.includes(value.name)
                  }
                })    
              }
            })
            if (!r) {
              removeImportRange.push([n.start, n.end])
            }  
          }
          break
      }
    })
  }

  let gap = 0
  let newCode = code
  removeImportRange.forEach(([st, ed]) => {
    newCode = 
      newCode.substring(0, st - gap) + 
      newCode.substring(ed - gap);
    gap += ed - st
  })

  fs.writeFileSync(sourceFile, newCode)
}

async function esbuildDrivers (
  config: IConfig,
  inputs: string[],
  outputDir: string,
  options: {
    format: esbuild.Format,
    env?: 'client' | 'server',
    bundle?: boolean,
  },
) {
  const { drivers, ts, packageJSON, cwd, pointFiles } = config
  const { bundle, format, env } = options

  const buildOptions: esbuild.BuildOptions = {
    entryPoints: inputs,
    /**
     * because of removing unused module in the intact file and three-shaking
     */
    bundle,
    external: bundle ? [
      ...Object.keys(packageJSON.dependencies || {}),
      ...Object.keys(packageJSON.devDependencies || {}),
      ...Object.keys(packageJSON.peerDependencies || {}),
      'drivers/*',
      '@polymita/*',
      'node:*',
    ] : undefined,
    allowOverwrite: true,
    outdir: outputDir,
    platform: env === 'client' ? 'browser' : 'node',
    format,
    treeShaking: true,
    plugins: [
      aliasAtCodeToCwd(cwd)
    ],

  }

  let cacheFilesByPlugin: string[] = []
  if (env === 'client') {
    buildOptions.plugins.push(
      clearFunctionBodyEsbuildPlugin(outputDir, modelHookFactoryFeatures.serverOnly, cacheFilesByPlugin)
    )
  }

  // check tsconfig
  if (ts) {
    buildOptions.tsconfig = getTSConfigPath(cwd)
  }

  await esbuild.build(buildOptions)

  cacheFilesByPlugin.forEach(f => {
    /**
     * maybe deleted by another tarat process
     */
    if (fs.existsSync(f)) {
      fs.unlink(f, e => {
        if (e) {
          throw e
        }
      })
    }
  });
  cacheFilesByPlugin = []

  if (fs.existsSync(outputDir)) {
    traverseDir(outputDir, (obj) => {
      // not ts file
      if (!obj.isDir) {
        if (/\.ts$/.test(obj.path)) {
          fs.rmSync(obj.path)
        } else if (/\.js$/.test(obj.path)) {
          removeUnusedImports(obj.path)
          if (env) {
            replaceImportDriverPath(config, obj.path, format, env)
          }  
        }
      }
    })
  }
}

export function buildDTS (c: IConfig, filePath: string, outputFile: string) {
  const tsconfigPath = getTSConfigPath(c.cwd)
  const json = loadJSON(tsconfigPath)

  const options: IBuildOption = {
    input: {
      input: filePath,
      plugins: [
        dts({
          compilerOptions: json,
        }),
        rollupAlias({
          entries: {
            '@': c.cwd,
          }
        }),
      ]
    },
    output: {
      file: outputFile,
      format: 'esm'
    }
  }

  return build(c, options)
}

export async function buildDTSFiles (c: IConfig, filePaths: { filePath: string, outFile: string }[]) {
  const tsconfigPath = getTSConfigPath(c.cwd)
  
  const entries = filePaths.map(({ filePath }) => ({ filePath }))

  const outputTexts = generateDtsBundle(
    entries,
    {
      preferredConfigPath: tsconfigPath,
      followSymlinks: true,
    }
  )

  await Promise.all(outputTexts.map((tsdCode, i) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePaths[i].outFile, tsdCode, e => {
        if (e) {
          reject(e)
        } else {
          resolve(0)
        }
      })
    })
  }))
}

export async function driversType(c: IConfig, outputDir: string) {
  const { drivers, driversDirectory } = c
  const cwdDirversDir = path.join(c.cwd, driversDirectory)

  // const generateFiles = []
  // await Promise.all(drivers.filter(({ filePath }) => /\.ts$/.test(filePath)).map(async h => {
  //   const { filePath, name , dir } = h
  //   const relativePath = path.relative(cwdDirversDir, dir)
  //   const destDir = path.join(outputDir, relativePath)
  //   const destFile = path.join(destDir, `${name}.d.ts`)
  //   generateFiles.push({
  //     name,
  //     destDir,
  //     relativePath,
  //     destFile,
  //   })
  //   await buildDTS(c, filePath, destFile)
  // }))
  const generateFiles = drivers.filter(({ filePath }) => /\.ts$/.test(filePath)).map((h) => {
    const { filePath, name , dir } = h
    const relativePath = path.relative(cwdDirversDir, dir)
    const destDir = path.join(outputDir, relativePath)
    const outFile = path.join(destDir, `${name}.d.ts`)
    return ({
      name,
      filePath,
      destDir,
      relativePath,
      outFile,
    })
  })

  await buildDTSFiles(c, generateFiles)

  return generateFiles
}

/**
 * 将 @/drivers 编译到 dist/drivers
 */
export async function transformCommonDriver (c: IConfig) {
  const {
    outputDriversDir,
  } = c.pointFiles

  const inputs = c.drivers.filter(({ filePath }) => /\.(ts|js|mjs)$/.test(filePath)).map(({ filePath }) => filePath)
  await esbuildDrivers(c, inputs, outputDriversDir, { format: 'esm' })

  generateHookDeps(c)
}

/**
 * for server side running
 * 将 @/drivers 分布编译到2份产物, dist/server, dist/client 
 * 生成ts声明文件
 */
export async function buildDrivers (c: IConfig) {
  const {
    outputClientDriversDir,
    outputServerDriversDir,
    outputServerDriversESMDir,
    outputDriversDir,
  } = c.pointFiles

  await transformCommonDriver(c)

  const compiledFiles = readFiles(outputDriversDir, '.js')

  await Promise.all([
    // cjs
    esbuildDrivers(c, compiledFiles, path.join(outputServerDriversDir), { format: 'cjs', env: 'server', bundle: true }),
    esbuildDrivers(c, compiledFiles, outputServerDriversESMDir, { format: 'esm', env: 'server', bundle: true }),
    // esm
    esbuildDrivers(c, compiledFiles, path.join(outputClientDriversDir), { format: 'esm', env: 'client', bundle: true }),
  ])

  if (c.ts) {
    try {
      const files = await driversType(c, outputDriversDir)
      files.forEach(({ name, outFile, relativePath }) => {
        [outputClientDriversDir, outputServerDriversDir].forEach(outputEnvDir => {
          const dir = path.join(outputEnvDir, relativePath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
          }
          cp(outFile, dir)
        })
      })
    } catch (e) {
      console.error(e)
      logFrame(chalk.red('build hook dts fail'))
    }
  }
}

interface IModelIndexesBase {
  [k: string]: string | IModelIndexesBase
}


function findDependentIndexes (c: IConfig) {
  const schemaFiles: Array<{
    moduleName: string
    indexes: IModelIndexesBase
  }> = []

  c.dependencyModules.forEach(moduleName => {
    const dir = path.join(c.cwd, 'node_modules', moduleName)

    const depSchemaPath = path.join(dir, c.buildDirectory, c.modelsDirectory, c.schemaIndexes)
    const r2 = fs.existsSync(depSchemaPath)

    if (r2) {
      schemaFiles.push({
        moduleName,
        indexes: JSON.parse(fs.readFileSync(depSchemaPath).toString())
      })
    }
  })

  return schemaFiles
}

function deepInsertName (moduleName: string, indexes: IModelIndexesBase) {
  const dependentIndexesWithNamespace: IModelIndexesBase = {}
  traverse(indexes, (keys, val: string | IModelIndexesBase) => {
    if (typeof val === 'string') {
      set(dependentIndexesWithNamespace, keys, transformModelName(`${moduleName}_${upperFirst(val)}`))
    } else {
      set(dependentIndexesWithNamespace, keys, deepInsertName(moduleName, val))
    }
  })
  return dependentIndexesWithNamespace
}

export async function buildModelIndexes(c: IConfig) {
  if (c.model.engine === 'prisma') {

    const dependentIndexes = findDependentIndexes(c)

    let existPrismaPart = readExsitPrismaPart(c)
    if (existPrismaPart.length <= 0) {
      existPrismaPart = [].concat(readCurrentPrisma(c))
    }

    const schemaIndexesFile = path.join(c.cwd, c.modelsDirectory, c.schemaIndexes)

    const objArr = await Promise.all(existPrismaPart.map(async ({ content }) => {
      const model = await prismaInternals.getDMMF({
        datamodel: content
      })
      const models = model.datamodel.models
      const r: Record<string, string | Record<string, string>> = {}
      models.forEach(m => {
        r[lowerFirst(m.name)] = lowerFirst(m.name)
      })
      return r
    }))
    const mergedObj: IModelIndexesBase = objArr.reduce((p, n) => Object.assign(p, n), {})

    dependentIndexes.forEach(obj => {
      const dependentIndexesWithNamespace = deepInsertName(obj.moduleName, obj.indexes)

      mergedObj[obj.moduleName] = dependentIndexesWithNamespace
    })

    /**
     * eg
     * mergedObj = {
     *   modelA: string
     *   anyModule: {
     *     modelA: `anyModule`_modelA
     *   }
     * }
     */
    fs.writeFileSync(schemaIndexesFile, JSON.stringify(mergedObj, null, 2))
  }
}

/**
 * auto generate externals for esbuild
 */
export function generateExternal (c: IConfig) {
  const { packageJSON } = c;

  const internalPackages = [
    '@polymita/connect',
    '@polymita/signal-model',
    '@polymita/renderer',
    '@polymita/signal',
    // '@polymita/*',
    // 'polymita',
  ];

  if (packageJSON.peerDependencies) {
    internalPackages.push(
      ...Object.keys(packageJSON.peerDependencies),
    );
  }

  return internalPackages;
}

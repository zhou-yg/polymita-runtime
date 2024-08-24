import * as fs from 'fs'
import * as path from 'path'
import { compile } from 'ejs'
import shelljs from 'shelljs'
import rimraf from 'rimraf'
import * as prettier from 'prettier'

import { equalFileContent, implicitImportPath, loadJSON, removeExt, traverseDir, tryMkdir, upperFirstVariable } from "../../../util";
import { IConfig, IRouteChild, PageConfig } from '../../../config';
import { camelCase, upperFirst } from 'lodash';
import { buildDTS } from '../../bundleUtility'

const { cp } = shelljs;

const signalMapTemplateFile = './signalsMapTemplate.ejs'
const signalMapTemplateFilePath = path.join(__dirname, signalMapTemplateFile)

const scriptsTemplateFile = './scriptsTemplate.ejs'
const scriptsTemplateFilePath = path.join(__dirname, scriptsTemplateFile)

const templateClientFile = './routesClientTemplate.ejs'
const templateClientFilePath = path.join(__dirname, templateClientFile)

const signalMapTemplate = compile(fs.readFileSync(signalMapTemplateFilePath).toString())
const scriptsTemplate = compile(fs.readFileSync(scriptsTemplateFilePath).toString())
const routesClientTemplate = compile(fs.readFileSync(templateClientFilePath).toString())

const moduleRenderToReactFile = './moduleRenderToReact.ejs'
const moduleRenderToReactFilePath = path.join(__dirname, moduleRenderToReactFile)
const moduleRenderToReactFilePathTemplate = compile(fs.readFileSync(moduleRenderToReactFilePath).toString())


export function copyContextFiles (c: IConfig) {
  tryMkdir(c.generateFiles.root)

  const r2 = fs.existsSync(c.modelFiles.schemaPrisma)

  const files = [
    [
      r2 ||  c.dependencyLibs.signalModel,
      path.join(__dirname, './actionsTemplate.ejs'),
      c.generateFiles.actionsFile
    ],
    [
      r2,
      path.join(__dirname, './connectTemplate.ejs'),
      c.generateFiles.connectFile
    ],
    [
      c.dependencyLibs.signalModel,
      path.join(__dirname, './hooksTemplate.ejs'),
      c.generateFiles.hooksFile
    ],
  ] as [boolean, string, string][];

  files
    .forEach(([s, from, to]) => {
      if (s) {
        cp(from, to)
      } else if (fs.existsSync(to)) {
        fs.unlinkSync(to)
      }
    })
}

export function generateSignalMap (c: IConfig) {
  const signalsDir = path.join(c.cwd, c.signalsDirectory)
  const relativeSignals: { name: string, filePath: string }[] = []

  if (fs.existsSync(signalsDir)) {
    traverseDir(signalsDir,(f) => {
      if (!f.isDir) {
        const relativePath = `./signals/${f.relativeFile}`
        const name = /^compose\//.test(f.relativeFile) ? `compose${upperFirst(f.name)}` : f.name
        relativeSignals.push({
          name,
          filePath: relativePath.replace(/\.\w+$/, '')
        })
      }
    })
  }
  const signalMapFileContent = signalMapTemplate({ files: relativeSignals })

  fs.writeFileSync(
    path.join(c.generateFiles.signalMap),
    signalMapFileContent
  )
}

export function generateScripts(c: IConfig) {
  const { scripts } = c;
  
  const arr = [
    [c.serverDir, scripts.server, c.generateFiles.serverScriptsFile], 
    [c.edgeDir, scripts.edge, c.generateFiles.edgeScriptsFile],
  ] as const;
  
  arr.forEach(([serverOrEdge, files, destFile]) => {
    if (files.length) {
      const f = files.map(f => ({
        name: camelCase(f.name),
        path: removeExt(path.join('@/scripts/', serverOrEdge, f.relativeFile)),
      }))
      const content = scriptsTemplate({
        scripts: f
      })
      fs.writeFileSync(destFile, content)
    } else {
      rimraf.sync(destFile)
    }
  })
}


function generateRoutesImports (routes: IRouteChild[], parentName = '') {
  let importsArr: [string, string][] = []
  routes.forEach(r => {
    r.children.forEach(r => {
      if (r.path) {
        importsArr.push([
          `${upperFirstVariable(parentName)}${upperFirstVariable(r.name)}`,
          r.path,
        ])
      }
    })
  })

  return importsArr
}

function generateRoutesContent (routes: IRouteChild[], depth = 0, parentName = ''): string {

  const routeArr = routes.map((r, i) => {
    let element = ''

    const child = r.children.map(p => {
      const Cpt = `${upperFirstVariable(parentName)}${upperFirstVariable(p.name)}`
      if (Cpt) {
        element = `element={<${Cpt} />}`
      }
  
      return [
        `<Route path="${p.routerPath}" ${element} >`,
        `</Route>`
      ].join('\n');
    }).join('\n')

    return child
  })

  return routeArr.join('\n')
}

export async function generateClientRoutes(c: IConfig) {
  const {
    clientRoutes,
    appClientEntry,
  } = c.entryFiles

  const {
    appRootFile,
    routesTree: routesTreeArr,
  } = c
  // imports
  const imports = generateRoutesImports(routesTreeArr)
  const r = generateRoutesContent(routesTreeArr)

  const importsWithAbsolutePathClient = imports.map(([n, f]) => {
    return `import ${n} from '${implicitImportPath(f, c.ts)}'`
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
  fs.writeFileSync(clientRoutes, await prettier.format(routesStr2, { parser: 'typescript' }))
}

export async function generateBuildingIndex(c: IConfig) {
  const exportModulesConfig = [
    ['modules', c.pointFiles.outputModulesDir, c.modules],
    ['overrides', c.pointFiles.outputOverridesDir, c.overrides],
    ['scriptsClient', c.pointFiles.outputEdgeScriptsDir, c.scripts.edge],
    ['signals', c.pointFiles.outputSignalsDir, c.signals],
    ['contexts', c.pointFiles.outputContextDir, c.contexts],
  ] as const;
  
  const contents: string[] = []
  const tail: string[] = []

  exportModulesConfig.forEach(([exportName, dir, files]) => {
    console.log('[generateBuildingIndex]', exportName, fs.existsSync(dir) , files.length);
    if (fs.existsSync(dir) && files.length) {
      const relativeDir = path.relative(c.pointFiles.outputDir, dir)

      files.forEach((f) => {
        if (exportName === 'signals') {
          contents.push(
            `import ${f.name} from './${path.join(relativeDir, removeExt(f.relativeFile))}'`
          )
        } else {
          contents.push(
            `import * as ${f.name} from './${path.join(relativeDir, removeExt(f.relativeFile))}'`
          )
        }
      })
      tail.push(`export const ${exportName} = { ${files.map(f => f.name).join(', ')} }`)
    }
  })

  tryMkdir(c.pointFiles.outputDir)

  const viewsContent = moduleRenderToReactFilePathTemplate({
    names: [
      ...c.modules.map(f => f.name),
    ],
    overrides: [
      ...c.overrides.map(f => f.name),
    ]
  })

  contents.push(viewsContent)
  contents.push(...tail)

  fs.writeFileSync(c.pointFiles.outputVirtualIndex, contents.join('\n'))
}
import * as fs from 'fs'
import * as path from 'path'
import { compile } from 'ejs'
import shelljs from 'shelljs'
import rimraf from 'rimraf'
import * as prettier from 'prettier'

import { convertModuleNameToVariableName, equalFileContent, implicitImportPath, loadJSON, removeExt, traverseDir, tryMkdir, upperFirstVariable } from "../../../util";
import { IConfig, IDynamicModule, IRouteChild, PageConfig } from '../../../config';
import { camelCase, upperFirst } from 'lodash';

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

const schemaTemplateFile = './schemaTemplate.ejs'
const schemaTemplateFilePath = path.join(__dirname, schemaTemplateFile)
const schemaTemplate = compile(fs.readFileSync(schemaTemplateFilePath).toString())

export function copyContextFiles (c: IConfig) {
  tryMkdir(c.pointFiles.output.root)

  const r2 = fs.existsSync(c.pointFiles.currentFiles.modelFiles.schemaPrisma)

  const files = [
    [
      r2 ||  c.dependencyLibs.signalModel,
      path.join(__dirname, './actionsTemplate.ejs'),
      c.pointFiles.generates.actionsFile
    ],
    [
      r2,
      path.join(__dirname, './connectTemplate.ejs'),
      c.pointFiles.generates.connectFile
    ],
    [
      c.dependencyLibs.signalModel,
      path.join(__dirname, './hooksTemplate.ejs'),
      c.pointFiles.generates.hooksFile
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
    path.join(c.pointFiles.generates.signalMap),
    signalMapFileContent
  )
}

export function generateScripts(c: IConfig) {
  const { scripts } = c;
  
  const arr = [
    [c.serverDir, scripts.server, c.pointFiles.generates.serverScriptsFile], 
    [c.edgeDir, scripts.edge, c.pointFiles.generates.edgeScriptsFile],
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

function getRouteElementName(route: IRouteChild, parentName = '') {
  return route?.pageConfig?.name 
    ? `${upperFirstVariable(parentName)}${upperFirstVariable(route.pageConfig.name)}` 
    : 'Root';
}

function generateRoutesImports (routes: IRouteChild) {
  const importsArr: [string, string][] = []

  function traverseRoutes(route: IRouteChild, parentName = '') {
    if (route.pageConfig) {
      const name = getRouteElementName(route, parentName);
      if (!route.pageConfig.isLayout) {
        importsArr.push([name, `./${route.pageConfig.relativeImportPath}`]);
      }
      if (route.pageConfig.layoutExists) {
        importsArr.push([`${name}Layout`, `./${route.pageConfig.relativeLayoutImportPath}`]);
      }
    }

    route.children.forEach(childRoute => {
      traverseRoutes(childRoute, parentName + (route.pageConfig?.name || ''));
    });
  }

  traverseRoutes(routes);

  return importsArr
}

interface IRouteObject {
  index?: boolean;
  path?: string;
  element: string | null;
  children?: IRouteObject[];
}

function generateJSONRoutes (routes: IRouteChild, depth = 0, parentName = ''): IRouteObject {

  const generateRouteObject = (route: IRouteChild, parentName = '') => {
    const name = getRouteElementName(route, parentName);
    
    const layoutName = `${name}Layout`;

    let routeObject: IRouteObject = {
      path: route.routerPath,
      element: route?.pageConfig?.layoutExists ? `<${layoutName} />` : null,
      children: [
        name && !route?.pageConfig?.isLayout &&  {
          element: `<${name} />`,
          index: true,
        }
      ].filter(Boolean) as IRouteObject[],
    };

    if (route.children.length > 0) {
      const childrenRoutes = route.children
        .map(child => generateRouteObject(child, parentName + (route.pageConfig?.name || '')))
      
      routeObject.children = (routeObject.children || []).concat(childrenRoutes)
    }

    return routeObject;
  };

  const result = generateRouteObject(routes);

  return result;
}


function generateRoutesCode (routes: IRouteObject) {
  const code = JSON.stringify(routes, null, 2).replaceAll('"<', '<').replaceAll('>"', '>');
  return code;
}

export async function generateClientRoutes(c: IConfig) {
  const {
    clientRoutes,
    appClientEntry,
  } = c.pointFiles.app

  const {
    routesTree,
  } = c

  console.log('routesTree: ', routesTree);

  const imports = routesTree ? generateRoutesImports(routesTree) : []

  const routesJSONTree = routesTree ? generateJSONRoutes(routesTree) : undefined

  // const routesJSONTreeWithDynamic = appendDynamicModulesToRoutes(c.dynamicModules, routesJSONTree);

  const routesCode = routesJSONTree ? generateRoutesCode(routesJSONTree) : ''

  const importsWithAbsolutePathClient = imports.map(([n, f]) => {
    return `import ${n} from '${implicitImportPath(f, c.ts)}'`
  }).join('\n')

  const modelIndexesJSON = path.join(c.cwd, c.modelsDirectory, c.schemaIndexes)
  let modelIndexes = '{}'
  if (fs.existsSync(modelIndexesJSON)) {
    modelIndexes = fs.readFileSync(modelIndexesJSON).toString()
  }

  const routesStr2 = routesClientTemplate({
    /** import all pages */
    imports: importsWithAbsolutePathClient,

    /** all page routes tree */
    routes: routesCode,
    // 
  })

  fs.writeFileSync(clientRoutes, await prettier.format(routesStr2, { parser: 'typescript' }))
  // fs.writeFileSync(clientRoutes, routesStr2)
}

export async function generateBuildingIndex(c: IConfig) {
  const exportModulesConfig = [
    ['modules', c.pointFiles.output.modulesDir, c.pointFiles.currentFiles.moduleFiles],
    ['overrides', c.pointFiles.output.overridesDir, c.pointFiles.currentFiles.overridesFiles],
    ['scriptsClient', c.pointFiles.output.edgeScriptsDir, c.scripts.edge],
    ['signals', c.pointFiles.output.signalsDir, c.signals],
    ['contexts', c.pointFiles.output.contextDir, c.contexts],
  ] as const;
  
  const contents: string[] = []
  const tail: string[] = []

  exportModulesConfig.forEach(([exportName, dir, files]) => {
    console.log('[generateBuildingIndex]', exportName, fs.existsSync(dir) , files.length);
    if (fs.existsSync(dir) && files.length) {
      const relativeDir = path.relative(c.pointFiles.output.root, dir)

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

  tryMkdir(c.pointFiles.output.root)

  const viewsContent = moduleRenderToReactFilePathTemplate({
    names: [
      ...c.pointFiles.currentFiles.moduleFiles.map(f => f.name),
    ],
    overrides: [
      ...c.pointFiles.currentFiles.overridesFiles.map(f => f.name),
    ]
  })

  contents.push(viewsContent)
  contents.push(...tail)

  fs.writeFileSync(c.pointFiles.output.virtualIndex, contents.join('\n'))
}


export function initBlankSchemaPart (c: IConfig) {

  tryMkdir(c.pointFiles.currentFiles.modelsDirectory)

  fs.writeFileSync(
    c.pointFiles.currentFiles.modelFiles.partSchemaPrisma,
    schemaTemplate()
  )
}


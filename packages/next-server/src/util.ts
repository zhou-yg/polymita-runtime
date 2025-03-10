import * as fs from 'fs'
import * as path from 'path'
import rimraf from 'rimraf'
import { IConfig, IViewConfig } from './config'
import os from "os";
import { BM, isEqual } from "@polymita/signal-model";
import { spawn, SpawnOptions } from 'child_process';
import chalk from 'chalk';
import tar from 'tar'
import AdmZip from 'adm-zip'

export function loadJSON (f: string) {
  if (!fs.existsSync(f)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(f).toString())
  } catch (e) {
    return {}
  }
}

export function writeJSON(p: string, obj: Record<string, any>) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2))
}

export function emptyDirectory (dir: string) {
  if (fs.existsSync(dir)) {
    rimraf.sync(dir)
  }

  fs.mkdirSync(dir, { recursive: true })
}

export function tryUnlinkSync (f: string) {
  if (fs.existsSync(f))  {
    fs.unlinkSync(f)
   }
}

export function lowerFirst (s: string) {
  return s[0].toLowerCase() + s.substring(1)
}

export function isComposedDriver (f: BM) {
  return !!(f as any).__polymita_compose__
}

export function tryMkdir(dir: string) {
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })
}

export function getDefaultRoute (pages: IViewConfig[]) {
  let root: IViewConfig = pages[0]
  pages.forEach(p => {
    const p1 = p.path.split('/')
    const p2 = root.path.split('/')
    if (p1.length <= p2.length) {
      if (p1.length === p2.length) {
        root = p.index ? p : root
      } else {
        root = p
      }
    }
  })

  return root.name === 'index' ? '' : root.name
}

const LOG_PREFIX = 'polymita'

// export function logFrame (content: string, length = 100) {
//   const lineArr = new Array(9).fill('-')  
//   const line2 = lineArr.join('')

//   const title = ` ${LOG_PREFIX} `
//   lineArr.splice(1, 0, title)
//   const line1 = lineArr.slice(0, -title.length).join('')

//   const rows = content.split('\n').map(c => {
//     return c.trim().match(new RegExp(`.{1,${length - 4}}`, 'g'))
//   }).filter(Boolean).flat()
  
//   const padLen = length - 4

//   return console.log(`${chalk.blue('polymita')}: `, content);
// }
export function logFrame (...content: any[]) {
  return console.log(`| ${chalk.blue(LOG_PREFIX)}: `, ...content);
}
export function errorFrame (...content: any[]) {
  return console.error(`| ${chalk.red(LOG_PREFIX)}: `, ...content);
}

export function statusFrame (topic: string, ...content: any[]) {
  return {
    success () {
      return logFrame(chalk.green(topic), ...content)
    },
    fail () {
      return logFrame(chalk.red(topic), ...content)
    },
  }
}

export function getAddress() {
  const address =
    process.env.HOST ||
    Object.values(os.networkInterfaces())
      .flat()
      .find((ip) => ip?.family === "IPv4" && !ip.internal)?.address;

  return address
}

export function equalFileContent(c1: string, c2: string) {
  return isEqual(
    c1.split('\n').map(r => r.trim()).filter(Boolean),
    c2.split('\n').map(r => r.trim()).filter(Boolean),
  )
}

export function isFileEmpty (code: string) {
  return code.replace(/\n/g, '').trim().length === 0
}

export interface IFile {
  /**
   * pure name without ext
   */
  name: string

  isDir: boolean
  /**
   * absolute path
   */
  path: string
  /**
   * file name with ext
   */
  file: string
  /**
   * absolute parent directory path
   */
  dir: string
  /**
   * relative path for first argument
   */
  relativeFile: string
}
export function traverseDir (
  dir: string,
  callback: (f: IFile) => void | false,
  relativeBase = '',
  cache = new Map<string, boolean>()
) {
  if (!fs.existsSync(dir)) {
    return
  }
  if (cache.has(dir)) {
    return
  }
  cache.set(dir, true)
  const files = fs.readdirSync(dir)
  files.forEach(f => {
    const p = path.join(dir, f)

    const isDir = fs.lstatSync(p).isDirectory()
    const continueFlag = callback({
      isDir,
      name: f.replace(/\.\w+$/, ''),
      dir,
      file: f,
      relativeFile: path.join(relativeBase, f),
      path: p
    })
    if (isDir && continueFlag !== false) {
      traverseDir(p, callback, path.join(relativeBase, f), cache)
    }
  })
}
export function traverseFirstDir (dir: string, callback: (f: IFile) => void, relativeBase = '') {
  if (!fs.existsSync(dir)) {
    return
  }
  const files = fs.readdirSync(dir)
  files.forEach(f => {
    const p = path.join(dir, f)
    const dirIndex = path.join(f, 'index.ts')
    const indexP = path.join(dir, dirIndex)
    const isDir = fs.lstatSync(p).isDirectory()
    const name = f.replace(/\.\w+$/, '')
    const fileObj = {
      isDir,
      name,
      dir,
      file: f,
      relativeFile: path.join(relativeBase, f),
      path: p
    }
    if (isDir && fs.existsSync(indexP)) {
      Object.assign(fileObj, {
        isDir: false,
        name,
        dir: p,
        file: `${dirIndex}.ts`,
        relativeFile: path.join(relativeBase, dirIndex),
        path: indexP,
      })
    }
    callback(fileObj)
  })
}

export function time (sec = true) {
  let st = Date.now()
  return () => {
    const now = Date.now()
    const v = now - st
    return sec ? Math.floor(v / 1000) : v
  }
}

export function __aa () {

}


export function traverse(
  target: Record<string, any>,
  callback: (arrPath: string[], value: any) => void,
  parentKeys?: string[]
) {
  if (!parentKeys) {
    parentKeys = []
  }
  Object.entries(target).forEach(([key, value]) => {
    const currentKeys = parentKeys!.concat(key)
    value && callback(currentKeys, value)
    if (typeof value === 'object' && value) {
      traverse(value, callback, currentKeys)
    }
  })
}

export function last<T> (arr: T[]):T {
  return arr[arr.length - 1]
}


// read all files in directory
export function readFiles (dir: string, ext: string = '') {
  // check file
  if (fs.lstatSync(dir).isFile()) {
    return dir.endsWith(ext) ? [dir] : []
  }

  const files: string[] = []
  traverseDir(dir, (file) => {
    if (!file.isDir) {
      if (ext) {
        if (file.file.endsWith(ext)) {
          files.push(file.path)
        }
      } else {
        files.push(file.path)
      }
    }
  })
  return files
}

export type ConnectModelMiddlewareContext = {
  [k: string]: any
}

export type ConnectModelMiddleware = (ctx: ConnectModelMiddlewareContext, next: () => Promise<void>) => Promise<void>

export function connectModel () {
  const middlewareArr: ConnectModelMiddleware[] = []
  return {
    use (fn: ConnectModelMiddleware, options?: {
      enforce?: 'pre'
    }) {
      if (options?.enforce === 'pre') {
        middlewareArr.unshift(fn)
      } else {
        middlewareArr.push(fn)
      }
    },
    start (ctx: ConnectModelMiddlewareContext = {}) {
      const tail = async (ctx: ConnectModelMiddlewareContext) => {}

      const composedChain = middlewareArr.reduceRight((current, prev) => {
        return (ctx) => {
          return prev(ctx, current.bind(null, ctx))
        }
      }, tail) as (ctx: ConnectModelMiddlewareContext) => Promise<void>

      return composedChain(ctx)
    }
  }
}

export function startElectronProcess () {
  spawn('electron', [], {
    cwd: '',
    stdio: ['pipe', process.stdout, process.stderr]
  })  
}

export function runSpawn (args: any[], op?: SpawnOptions) {  
  return new Promise<void>((resolve, reject) => {
    let [
      cmd,
      ...rest
    ] = args

    const destBin = path.join(String(op?.cwd || './'), 'node_modules/.bin', cmd);
    if (fs.existsSync(destBin)) {
      cmd = destBin
    }

    const ps = spawn(cmd, rest, {
      stdio: 'inherit',
      ...op
    });

    ps.on('close', () => {
      resolve();
    });
    ps.on('error', (e) => {
      reject(e)
    })
  })
}


/**
 * Convert some global absolute paths in the config to relative paths for the current project
 */
export function projectRelativePath (c: IConfig, p: string) {
  return p.replace(c.cwd, '')
}

export function removeExt(s: string) {
  return s.replace(/\.\w+/, '')
}


export function upperFirstVariable (s: string = '') {
  s = s.replace(/\]|\[|\:|-/g, '_').replace(/^_/, '')
  return s ? (s[0].toUpperCase() + s.substring(1)) : ''
}

export function implicitImportPath (path: string, ts: boolean) {
  if (ts) {
    return path.replace(/\.ts(x?)$/, '')
  }

  return path
}

export function isBlankObject (obj: any) {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0
}

/**
 * decompress zip or tar.gz file
 */
export async function decompress (zipPath: string, destDir: string) {
  if (zipPath.endsWith('.tar.gz')) {
    await tar.x({
      file: zipPath,
      cwd: destDir,
    })
    return
  }
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(destDir, true)
}

export function convertModuleNameToVariableName(f: string) {
  return f.replace(/@|-|\//g, '_')
}

export function compressZip(files: [string, string][], dest: string) {
  const zip = new AdmZip()
  files.forEach(file => {
    if (fs.lstatSync(file[1]).isDirectory()) {
      zip.addLocalFolder(file[1], file[0], file => !file.endsWith('.zip'))
    } else if (!file[1].endsWith('.zip')) {
      zip.addLocalFile(file[1], file[0])
    }
  })
  return zip.writeZipPromise(dest)
}

export const isNonNullable = <T>(value: T): value is NonNullable<T> => Boolean(value);

export const reduceScopePrefix = (name: string) => name.replace(/^@\w+\//, '')


export const assignCommandsToProject = (
  cwd: string, 
  cmds: (string | [string, string])[]
) => {
  const pkgJSON = loadJSON(path.join(cwd, 'package.json'))
  if (!pkgJSON.scripts) {
    pkgJSON.scripts = {}
  }

  cmds.forEach(cli => {
    const name = typeof cli === 'string' ? cli : cli[0]
    const scriptCli = typeof cli === 'string' ? `polymita ${cli}` : cli[1]

    if (pkgJSON.scripts[name]) {
      if (!pkgJSON.scripts[name].includes(scriptCli)) {
        console.error(`Unexpected cli command "${pkgJSON.scripts[name]}"`) 
      }
    } else {
      pkgJSON.scripts[name] = scriptCli
    }
  })

  writeJSON(path.join(cwd, 'package.json'), pkgJSON)
}


export function transformPkgName(str: string) {
  return str.replace(/^@/, '').replace(/\/|@|-/g, '_')
}


export function sortByDependency(arr: string[], relation: [string, string][]) {
  // Create a graph to store nodes and their dependencies
  const graph = new Map();
  const inDegree = new Map<string, number>();

  // Initialize the graph and in-degree map
  for (const node of arr) {
      graph.set(node, []);
      inDegree.set(node, 0);
  }

  // Build the graph and in-degree map
  for (const [current, dep] of relation) {
      if (graph.has(dep)) {
          graph.get(dep).push(current);
          inDegree.set(current, (inDegree.get(current) || 0) + 1);
      }
  }

  // Find all nodes with in-degree 0 (nodes with no dependencies)
  const queue: string[] = [];
  for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
          queue.push(node);
      }
  }

  // Perform topological sorting
  const sorted: string[] = [];
  while (queue.length > 0) {
      const node = queue.shift();
      if (!node) {
        break
      }
      sorted.push(node);

      // Reduce the in-degree of nodes that depend on the current node
      for (const neighbor of graph.get(node)) {
          inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
          if (inDegree.get(neighbor) === 0) {
              queue.push(neighbor);
          }
      }
  }

  // If the length of the sorted array does not match the original array, there is a cyclic dependency
  if (sorted.length !== arr.length) {
      throw new Error('Cyclic dependency detected, cannot sort');
  }

  return sorted;
}

export function sleep (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
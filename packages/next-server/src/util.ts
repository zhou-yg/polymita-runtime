import * as fs from 'fs'
import * as path from 'path'
import rimraf from 'rimraf'
import { IConfig, IViewConfig } from './config'
import os from "os";
import { BM, isEqual } from "@polymita/signal-model";
import { spawn } from 'child_process';
import chalk from 'chalk';
import { pick } from 'lodash';

export function loadJSON (f: string) {
  if (!fs.existsSync(f)) {
    return {}
  }
  return JSON.parse(fs.readFileSync(f).toString())
}

export function emptyDirectory (dir: string) {
  if (fs.existsSync(dir)) {
    rimraf.sync(dir)
  }

  fs.mkdirSync(dir)
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
  return console.log(`${chalk.blue('polymita')}: `, LOG_PREFIX, ...content);
}
export function errorFrame (...content: any[]) {
  return console.error(`${chalk.red('polymita')}: `, LOG_PREFIX, ...content);
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
export function traverseDir (dir: string, callback: (f: IFile) => void, relativeBase = '') {
  if (!fs.existsSync(dir)) {
    return
  }
  const files = fs.readdirSync(dir)
  files.forEach(f => {
    const p = path.join(dir, f)
    const isDir = fs.lstatSync(p).isDirectory()
    callback({
      isDir,
      name: f.replace(/\.\w+$/, ''),
      dir,
      file: f,
      relativeFile: path.join(relativeBase, f),
      path: p
    })
    if (isDir) {
      traverseDir(p, callback, path.join(relativeBase, f))
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
    const currentKeys = parentKeys.concat(key)
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
      const tail = (ctx: ConnectModelMiddlewareContext) => null

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


export function resolveNodeModulesLib (cwd: string, lib: string) {
  return path.join(cwd, 'node_modules/@polymita/server/dist', lib)
}
/**
 * 将config的一些全局绝对路径转换为当前项目工程的相对路径
 */
export function projectRelativePath (c: IConfig, p: string) {
  return p.replace(c.cwd, '')
}

export function removeExt(s: string) {
  return s.replace(/\.\w+/, '')
}
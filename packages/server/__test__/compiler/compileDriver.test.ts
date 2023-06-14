import {
  removeUnusedImports,
  removedFunctionBodyPlaceholder,
  removeFunctionBody
} from '../../src'

import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { driverFilesMap } from '../mockUtil'
import { modelHookFactoryFeatures } from '@polymita/signal-model'

describe('compile driver result', () => {

  describe('compile driver result', () => {
    beforeEach(() => {
      Object.entries(driverFilesMap).forEach(([name, content]) => {
        writeFileSync(`./${name}.js`, content)
      })
    })
    afterAll(() => {
      Object.entries(driverFilesMap).forEach(([name, content]) => {
        unlinkSync(`./${name}.js`)
      })
    })
  
    it('remove unused in driver', () => {
      const file = './imports.js'
      removeUnusedImports(file)
  
      const r = `
        import BB, { aa } from 'foo'
        import { bb } from 'foo'

        function aFunc() { 
          aa()
        }
        bb()
        const d = cc.aa.bb
      `
      expect(readFileSync(file).toString().replace(/\s/g, '')).toBe(r.replace(/\s/g, ''))
    })
  
    it('remove export', () => {
      const file = './withExport.js'
      removeUnusedImports(file)
      const r = `
  import d2 from './a'
  
  export { d2 as default }`
      expect(readFileSync(file).toString().replace(/\s/g, '')).toBe(r.replace(/\s/g, ''))
    })
    it('remove export', () => {
      const file = './withExport2.js'
      removeUnusedImports(file)
      const r = `
  
  import d2 from './a'
  export default { d2 }`
      expect(readFileSync(file).toString().replace(/\s/g, '')).toBe(r.replace(/\s/g, ''))
    })
  })


  describe('esbuild driver:clear function body', () => {
    it('simple', () => {
      const code = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(() => a() + 1)
      `
      const r = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(${removedFunctionBodyPlaceholder})
      `
      const r0 = removeFunctionBody(code, ['computedInServer'])
      expect(r0).toBe(r)
    })  
    it('generate function', () => {
      const code = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(function * () {
          const file = inputFile()
        })`
      const r = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(${removedFunctionBodyPlaceholder})`
      const r0 = removeFunctionBody(code, ['computedInServer'])
      expect(r0).toBe(r)
    })  
    it('generate with generics', () => {
      const code = `
      function XX<T = any> () {
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer<T extends any[] ? string : () => void>(function * (a: S) {
          const file = inputFile()
        })
      }`
      const r = `
      function XX<T = any> () {
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer<T extends any[] ? string : () => void>(${removedFunctionBodyPlaceholder})
      }`
      const r0 = removeFunctionBody(code, ['computedInServer'])
      expect(r0).toBe(r)
    })
    it('prisma second param', () => {
      const code = `
        const m = prisma('xx', () => {
          return {}
        }, [])
      `
      const r = `
        const m = prisma('xx',${removedFunctionBodyPlaceholder}, [])
      `
      const r0 = removeFunctionBody(code, modelHookFactoryFeatures.serverOnly)
      expect(r0).toBe(code)
    })
    it('generate with complex generics', () => {
      const code = `
        const inputFile = state<{ name: string }>()
        const OSSLink3 = computedInServer<T extends object? (number) : (string) >
        (function * () {
          if (file) {
            return 'a'
          }
        })
      `
      const r = `
        const inputFile = state<{ name: string }>()
        const OSSLink3 = computedInServer<T extends object? (number) : (string) >
        (${removedFunctionBodyPlaceholder})
      `
      const r0 = removeFunctionBody(code, ['computedInServer'])
      expect(r0).toBe(r)
    })
    it('real case2', () => {
      const code = `
import {
  computed,
  state,
  computedInServer,
  prisma,
} from 'tarat/core'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

export default function uploader<T> () {
  // only in browser
  const inputFile = state<{
    name: string, filepath?: string, newFilename?: string, originalFilename?: string
    _writeStream: WritableStream
  }>()
  // save in local
  const OSSLink = computedInServer(function * () {
    const file = inputFile()
    if (file) {
      const publicDir = path.join(process.cwd(), 'public')
      const destFile = path.join(publicDir, file.originalFilename)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir)
      }
      yield new Promise(resolve => {
        fs.createReadStream(file.filepath)
          .pipe(fs.createWriteStream(destFile))
          .on('close', () => resolve(0))
          .on('error', () => { throw new Error('copy file to public dir fail') })
      })
      return /file.originalFilename
    }
  })
  const fileStorage = prisma('fileStorage')
  return {
    inputFile,
    OSSLink
  }
}`
      const r = `
import {
  computed,
  state,
  computedInServer,
  prisma,
} from 'tarat/core'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

export default function uploader<T> () {
  // only in browser
  const inputFile = state<{
    name: string, filepath?: string, newFilename?: string, originalFilename?: string
    _writeStream: WritableStream
  }>()
  // save in local
  const OSSLink = computedInServer(${removedFunctionBodyPlaceholder})
  const fileStorage = prisma('fileStorage')
  return {
    inputFile,
    OSSLink
  }
}`
      const r0 = removeFunctionBody(code,  [ 'inputComputeInServer', 'computedInServer', 'model', 'prisma' ])
      expect(r0).toBe(r)
    })
  })
  describe('esbuild driver:remove function body by ast', () => {
    it('simple', () => {
      const code = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(() => a() + 1)
      `
      const r = `
        const inputFile = state<{ name: string }>()
        const OSSLink = computedInServer(${removedFunctionBodyPlaceholder})
      `
      const r0 = removeFunctionBody(code, ['computedInServer'])
      expect(r0).toBe(r)
    })
  })
})


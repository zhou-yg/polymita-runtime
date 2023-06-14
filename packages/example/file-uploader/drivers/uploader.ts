import {
  computed,
  state,
  computedInServer,
  prisma,
  writePrisma,
  inputComputeInServer,
} from 'tarat/core'
import * as fs from 'node:fs'
import * as path from 'node:path'
import indexes from '@/models/indexes.json'

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
      return {
        name: file.newFilename,
        link: `/${file.originalFilename}`
      }
    }
  })

  const fileStorage = prisma<{ name: string; link: string }[]>(indexes.uploaderItem, () => undefined, {
    immediate: false
  })
  const writeFileStroage = writePrisma(fileStorage, () => {
    if (OSSLink()) {
      return OSSLink()
    }
  })

  const createStorage = inputComputeInServer(function * () {
    yield writeFileStroage.create()
  })
  const updateStorage = inputComputeInServer(function * (targetId: number) {
    const d = OSSLink()
    if (d) {  
      yield writeFileStroage.update(targetId, {
        ...d
      })
    }
  })
  
  return {
    writeFileStroage,
    updateStorage,
    createStorage,
    inputFile,
    OSSLink
  }
}
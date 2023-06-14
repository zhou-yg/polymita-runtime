import { get, IHookContext, set } from '@polymita/signal-model'
import Application from 'koa'
import { BINARY_FILE_KEY_SPLIT_CHAR, BINARY_FILE_TYPE_PLACEHOLDER, parseWithUndef } from '@polymita/connect'
function hasAnyFiles (req: Application.ExtendableContext['request'] & { body: any, files: any }) {
  return req.files && Object.keys(req.files).length > 0
}

export interface PersistentFile {
  lastModifiedDate: Date,
  filepath: string,
  newFilename: string,
  originalFilename: string,
  mimetype: 'application/octet-stream',
  hashAlgorithm: boolean,
  size: number,
}

export class SimulateBrowserFile implements PersistentFile {
  lastModifiedDate: Date
  filepath: string
  newFilename: string
  originalFilename: string
  mimetype: 'application/octet-stream'
  hashAlgorithm: boolean
  size: number
  name: string
  constructor(f: PersistentFile) {
    Object.assign(this, f)
    this.name = f.originalFilename
  }
}


export function unserializeObjToJSON (obj: Record<string, any>) {
  Object.entries(obj).forEach(([k, v]) => {
    if (!(v instanceof SimulateBrowserFile)) {
      obj[k] = parseWithUndef(v)
    }
  })
  Object.entries(obj).forEach(([k, v]) => {
    if (v instanceof SimulateBrowserFile) {
      const kArr = k.split(BINARY_FILE_KEY_SPLIT_CHAR)
      const placeholderValue = get(obj, kArr)
      if (placeholderValue === BINARY_FILE_TYPE_PLACEHOLDER) {
        set(obj, kArr, v)
        delete obj[k]
      }
    }
  })
  return obj
}

/**
 * prevent File from sending to client side
 */
export function filterFileType (c: IHookContext): IHookContext {

  const data = c.data.map(v => {
    if (v[1] instanceof SimulateBrowserFile) {
      return ['unserialized']
    }
    return v
  })
  return Object.assign({}, c, {
    data
  })
}

export default function unserializeWithFile (): Application.Middleware {
  return async (ctx, next) => {
    const valid = hasAnyFiles(ctx.request as any)
    if (valid) {
      const { body, files } = ctx.request as any
      console.log('files: ', files);
      Object.entries(files).forEach(([k, v]: [string, PersistentFile]) => {
        body[k] = new SimulateBrowserFile(v)
      })
      
      const newBody = unserializeObjToJSON({...body});
      (ctx.request as any).body = newBody
    }
    await next()
  }
}

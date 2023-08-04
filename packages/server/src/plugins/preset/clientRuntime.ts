import { clearPlugins, loadPlugin, set } from "@polymita/signal"
import { ModelEvent, setGlobalModelEvent } from "@polymita/signal-model"

export const UNDEF_TAG = '__tarat_undefined_placeholder_tag__'

export function stringifyWithUndef(data: object) {
  return JSON.stringify(data, (k, v) => {
    return v === undefined ? UNDEF_TAG : v
  })
}

export function parseWithUndef(str: string) {
  return JSON.parse(str, (k, v) => {
    if (v === UNDEF_TAG) {
      return undefined
    }
    return v
  })
}


function traverse(
  target: Record<string, any>,
  callback: (arrPath: string[], value: any) => void,
  parentKeys?: string[]
) {
  if (!parentKeys) {
    parentKeys = []
  }
  Object.entries(target).forEach(([key, value]) => {
    const currentKeys = parentKeys.concat(key)
    callback(currentKeys, value)
    if (typeof value === 'object' && value) {
      traverse(value, callback, currentKeys)
    }
  })
}

export const BINARY_FILE_TYPE_PLACEHOLDER = '@binary:FILE'
export const BINARY_FILE_KEY_SPLIT_CHAR = '.'

export function isBinaryType(v: any) {
  // @ts-ignore
  if (typeof File === 'undefined') {
    return false
  }
  // @ts-ignore
  return v instanceof File
}

/**
 * @TODO support more data type: Blob, ArrayBuffer
 * 
 * { [object.path]: BrowserFile } ==> transform to { [object.path]: '@binary:FILE', [object.path.tempKey]: File in FormData }
 * 
 * 支持context在 c -> s 之间能够传输文件
 */
export function serializeJSON(obj: Record<string, any>) {
  let hasBinary = false
  traverse(obj, (kArr, value) => {
    hasBinary = hasBinary || isBinaryType(value)
  })
  // transform it to FormData
  if (hasBinary) {
    // @ts-ignore
    const fileKeysMap: Array<[(string | number)[], File]> = []
    traverse(obj, (kArr, value) => {
      if (isBinaryType(value)) {
        fileKeysMap.push([kArr, value])
      }
    })
    fileKeysMap.forEach(([kArr, value]) => {
      set(obj, kArr, BINARY_FILE_TYPE_PLACEHOLDER)
      const binaryTempKey = kArr.join(BINARY_FILE_KEY_SPLIT_CHAR)
      obj[binaryTempKey] = value
    })
    // @ts-ignore
    const fd = new FormData()

    Object.entries(obj).forEach(([k, v]) => {
      if (isBinaryType(v)) {
        fd.append(k, v)
      } else {
        fd.append(k, stringifyWithUndef(v))
      }
    })
    return fd
  }
  return stringifyWithUndef(obj)
}

export function clientRuntime(c: {
  modelConfig?: any
  host?: string
} = {}) {
  clearPlugins()

  // @ts-ignore
  if (typeof window === 'undefined') {
    throw new Error('must under browser runtime')
  }

  const { host = '/' } = c

  const me = new ModelEvent()
  setGlobalModelEvent(me)

  // @ts-ignore
  const hostConfig = `${host}${(window as any).taratConfig?.apiPre || '_hook'}`
  // @ts-ignore
  const diffPath = `${host}${(window as any).taratConfig?.diffPath || '_diff'}`

  loadPlugin('Model', {
    async find(e, w) {
      return []
    },
    async update(e, w) {
      return []
    },
    async remove(e, d) {
      return []
    },
    async create(e, d) {
      return {}
    },
    async executeDiff(d) {},
  })

  loadPlugin('Context', {
    async postDiffToServer(entity, diff) {
      // @ts-ignore
      await fetch(`${diffPath}`, {
        method: 'POST',
        body: stringifyWithUndef({
          entity,
          diff
        })
      })
    },
    async postComputeToServer(c) {
      // @ts-ignore
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        method: 'POST',
        body: serializeJSON(c)
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
    async postQueryToServer(c) {
      // @ts-ignore
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        method: 'POST',
        body: serializeJSON(c)
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
  })

  loadPlugin('Cache', {
    async getValue(k, f) {
      throw new Error('no config cache')
      return undefined
    },
    async setValue(k, v, f) {},
    clearValue(k, f) {}
  })
}

/**
 * runtime for "test" command
 */
function clientTestingRuntime(optiosn: {
  port: number
  host?: string // defaults to "localhost"
}) {
  loadPlugin('Model', {
    async find(e, w) {
      return []
    },
    async update(e, w) {
      return []
    },
    async remove(e, d) {
      return []
    },
    async create(e, d) {
      return {}
    },
    async executeDiff(d) {},
  })

  loadPlugin('Context', {
    async postDiffToServer(entity, diff) {
      // @ts-ignore
      await fetch(`${diffPath}`, {
        method: 'POST',
        body: stringifyWithUndef({
          entity,
          diff
        })
      })
    },
    async postComputeToServer(c) {
      // @ts-ignore
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        method: 'POST',
        body: serializeJSON(c)
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
    async postQueryToServer(c) {
      // @ts-ignore
      const newContext = await fetch(`${hostConfig}/${c.name}`, {
        method: 'POST',
        body: serializeJSON(c)
      })
        .then(r => r.text())
        .then(parseWithUndef)

      return newContext
    },
  })

  loadPlugin('Cache', {
    async getValue(k, f) {
      throw new Error('no config cache')
      return undefined
    },
    async setValue(k, v, f) {},
    clearValue(k, f) {}
  })
}
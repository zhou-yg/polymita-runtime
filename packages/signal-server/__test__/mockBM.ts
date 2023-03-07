import {
  state,
  model,
  inputCompute,
  after,
  before,
  freeze,
  inputComputeInServer,
  computed,
  cache,
  IHookContext,
  combineLatest,
  CurrentRunnerScope,
  Runner,
  BM,
  compose,
  connectModel,
  progress,
  writeModel,
  prisma,
  writePrisma,
  computedInServer,
  createPrisma,
  updatePrisma,
  removePrisma,
  injectWrite,
  injectModel,
  loadPlugin,
} from '../src/'

function injectExternalDescription(f: Function, arr: [any, any]) {
  Object.assign(f, {
    __names__: arr[0],
    __deps__: arr[1]
  })
}

initModelConfig()

export function enterClient() {
  process.env.TARGET = 'client'
  return () => {
    process.env.TARGET = ''
  }
}
export function enterServer() {
  process.env.TARGET = 'server'
  return () => {
    process.env.TARGET = ''
  }
}

export function initContext(arg: {
  name?: IHookContext['name']
  data?: IHookContext['data']
  index: number | undefined
}): IHookContext {
  return {
    initialArgList: [],
    name: arg.name || '',
    data: arg.data || [],
    index: arg.index,
    args: []
  }
}

export function initModelConfig(obj: any = {}) {
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
    ...obj
  })
  loadPlugin('Context', {
    async postDiffToServer(d) {},
    async postComputeToServer(c) {
      return []
    },
    async postQueryToServer(c) {
      return []
    },
    ...obj
  })
  const cacheMap = new Map<CurrentRunnerScope<any> | null, Map<string, any>>()
  const cacheKVMap = new Map<CurrentRunnerScope<any> | null, Map<string, any>>()
  loadPlugin('cookie', {
    async get(scope, key) {
      return cacheMap.get(scope)?.get(key)
    },
    async set(scope, k, v) {
      if (!cacheMap.get(scope)) {
        cacheMap.set(scope, new Map())
      }
      cacheMap.get(scope)?.set(k, v)
    },
    clear() {
      cacheMap.clear()
    }
  })
  loadPlugin('regularKV', {
    async get(scope, key) {
      return cacheKVMap.get(scope)?.get(key)
    },
    async set(scope, k, v) {
      if (!cacheKVMap.get(scope)) {
        cacheKVMap.set(scope, new Map())
      }
      cacheKVMap.get(scope)?.set(k, v)
    },
    clear() {
      cacheKVMap.clear()
    }
  })
}

export function useSimpleServerMiddleware(bm: BM) {
  initModelConfig({
    async postComputeToServer(c: IHookContext) {
      process.env.TARGET = 'server'
      const serverRunner = new Runner(bm)
      serverRunner.init(c.initialArgList as [any, any], c)

      if (c.index) {
        await serverRunner.callHook(c.index, c.args)
      }
      const context = serverRunner.scope.createActionContext()

      process.env.TARGET = ''

      return context
    }
  })
}

export function wait(ms: number = 15) {
  return new Promise(r => setTimeout(r, ms))
}

export function blank() {}
export function returnArg(arg: any) {
  return arg
}

/**
 * 
 * computed.server
 * 
 */
export function simpleComputedInServer() {
  const s1 = state(0)
  const c = computedInServer(() => {
    return s1()
  })
  return { c }
}
injectExternalDescription(simpleComputedInServer, [
  [0, 's1', 1, 'c'],
  [['h', 1, [0]]]
])
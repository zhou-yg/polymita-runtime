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
  ModelRunner,
  EnumWriteMethods,
} from '../src'
import * as immer from 'immer'

const { enablePatches } = immer
enablePatches()

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

const sequenceITCache: Record<string, Promise<void>[]> = {}

export function createSequenceIT (name: string, deps?: string[]) {
  return function newIT (description: string, cb: () => Promise<void>, timeout?: number) {
    let resolve: Function
    const lockPromise = new Promise<void>(r => {
      resolve = r;
    })
    if (!sequenceITCache[name]) {
      sequenceITCache[name] = []
    }
    sequenceITCache[name].push(lockPromise)
    console.log('sequenceITCache: ', sequenceITCache);
    
    it(description, async () => {
      if (deps?.length) {
        for (const depName of deps) {
          if (sequenceITCache[depName]) {
            await Promise.all(sequenceITCache[depName])
          }
        }
      }
      await cb()
      resolve()
    }, timeout)
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
      const serverRunner = new ModelRunner(bm)
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

export function plainObjectState(obj1: { [key: string]: any }, num2: number) {
  const s1 = state(obj1)
  const s2 = state(num2)

  return {
    s1,
    s2
  }
}

export function subPackageDriver() {
  const m1 = prisma('item')

  return {
    m1
  }
}
Object.assign(subPackageDriver, {
  __names__: [[0, 'm1']],
  __namespace__: 'sub/package'
})

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

/**
 * 
 * inputCompute.server
 * 
 */
export function changeStateInputComputeServer(
  obj1: { num1: number },
  num2: number
) {
  const ps = plainObjectState(obj1, num2)

  const { s1, s2 } = ps

  const changeS1 = inputComputeInServer((v: number) => {
    s1(draft => {
      draft.num1 = v
    })
  })

  return {
    ...ps,
    changeS1
  }
}
Object.assign(changeStateInputComputeServer, {
  __deps__: [['h', 2, [], [0]]]
})

export function changeStateInputComputeServer3() {
  const s1 = state(false)
  const s2 = state(0)

  const changeS2 = inputComputeInServer((v: number) => {
    if (s1()) {
      s2(() => v)
    }
  })

  return {
    s1,
    s2,
    changeS2
  }
}

/**
 * 
 * model.client
 * 
 */
export function userModelClient() {
  const num = state(1)
  const users = prisma(
    'item',
    () => ({
      where: {
        id: num()
      }
    }),
    { immediate: true, pessimisticUpdate: true }
  )

  return {
    num,
    users
  }
}
Object.assign(userModelClient, {
  __deps__: [['h', 1, [0]]],
})

export function writeModelWithSource() {
  const items = model<{ id?: number; name: string }[]>('item', () => ({}))
  const writeItems = writeModel(items, () => {
    return {
      name: name()
    }
  })
  const name = state('')

  const createItem = inputComputeInServer(async (name: string) => {
    if (name) {
      await writeItems.create({ name })
    } else {
      await writeItems.create()
    }
  })

  return {
    items,
    name,
    createItem
  }
}

/**
 * 
 * 
 * model.server
 * 
 * 
 */

export function userPessimisticModel() {
  const users = model('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  return {
    users
  }
}

export function useUpdateManyModel () {
  const users = prisma('item', () => ({}));

  const w = writePrisma(users);

  const updateName = inputCompute(async (ids: number[], name: string) => {
    await w.updateMany(ids, { name })
  })
  return {
    users,
    updateName
  }
}

export function userInjectFindModel() {
  const users = model<{ id: number; name: string }[]>('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  injectModel(users, () => {
    return {
      where: {
        name: 'b'
      }
    }
  })

  return {
    users
  }
}

export function userModelComputedQuery() {
  const targetName = state('')
  const users = model(
    'item',
    () => ({
      where: {
        name: targetName()
      }
    }),
    { immediate: true, pessimisticUpdate: true }
  )

  return {
    users,
    targetName
  }
}

export function modelInComputed() {
  const targetName = state('')
  const users = prisma<Array<{ id: number; name: string }>>(
    'item',
    () => ({
      where: {
        name: targetName()
      }
    }),
    { immediate: false }
  )
  const userNames = computed(() => {
    return users()?.map(obj => obj.name) || []
  })

  const usersProgress = progress(users)

  return {
    usersProgress,
    users,
    userNames,
    targetName
  }
}




export function userModelInputeCompute() {
  const items = model<{ id: number; name?: string }[]>('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  const fn = async (id: number, name: string) => {
    const exist = await items.exist({ name })
    if (!exist) {
      await items(arr => {
        if (arr) {
          arr.push({ id, name })
        }
      })
    }
  }
  const createItem = inputCompute(fn)

  return {
    items,
    createItem
  }
}


export function composeDriverWithNamespace() {
  const m1 = prisma('item')

  const composeResult = compose(subPackageDriver)

  return {
    m1,
    cm1: composeResult.m1
  }
}

export function multiPatchesInputCompute() {
  const s1 = state(0)
  const item = prisma<{ id?: number; name: string }[]>('item')
  const writeItem = writePrisma(item)

  const ic = inputCompute(function* () {
    yield new Promise<void>(resolve => {
      s1(v => v + 1)
      resolve()
    })

    yield writeItem.create({ id: 3, name: String(s1()) })

    yield writeItem.update(item()[0].id, { name: 'updated' })
  })

  return {
    ic,
    item,
    writeItem,
    s1
  }
}


export function writeWritePrisma() {
  const id = state(10)
  const name = state('aa')
  const p1 = prisma('item', () => ({}))

  const wp1 = writePrisma(p1, () => ({
    id: id()
  }))
  injectWrite(wp1, EnumWriteMethods.create, () => ({
    name: name()
  }))

  const ic = inputCompute(function* () {
    yield wp1.create()
  })

  const itemsLength = computed(() => {
    return p1().length
  })

  return {
    itemsLength,
    p1,
    ic
  }
}


export function writeModelByQuickCommand() {
  const items = model<{ id?: number; name: string }[]>('item', () => ({}))
  const name = state('')
  const ci = createPrisma(items, () => ({
    name: name()
  }))

  injectWrite(ci, () => ({
    name: `${name()}${name()}`
  }))

  const ui = updatePrisma(items, () => ({
    name: name()
  }))
  const ri = removePrisma(items)

  const createItem = inputComputeInServer(() => ci())
  const updateItem = inputComputeInServer(id => ui(id))
  const removeItem = inputComputeInServer(id => ri(id))

  return {
    items,
    name,
    createItem,
    updateItem,
    removeItem
  }
}

/**
 * 
 * 
 * context
 * 
 * 
 */

export function oneModel() {
  const m1 = model('test-model', () => ({}))
  return {
    m1
  }
}


export function changeStateInputComputeServer2() {
  const s1 = state({ num: 0 })
  const s2 = state(1)

  const c1 = computed(
    jest.fn(() => {
      return s1().num * 2
    })
  )
  const c2 = computed(() => {
    return s2() * 2
  })
  /* 4 */
  const changeS1 = inputComputeInServer((v: number) => {
    s1(draft => {
      draft.num = v
    })
  })

  return {
    s1,
    s2,
    c1,
    c2,
    changeS1
  }
}
Object.assign(changeStateInputComputeServer2, {
  __deps__: [
    ['h', 2, [0], []],
    ['h', 3, [1], []],
    ['h', 4, [], [0]]
  ]
})

export function changeOver3ChainDriver() {
  const s1 = state(0)
  const s2 = state(1)
  const s3 = state(2)

  const m1 = prisma('item')
  const m2 = prisma('item')
  const m3 = prisma('item')
  const m4 = prisma('item')
  const m5 = prisma('item')
  const m6 = prisma('item')

  const c1 = computed(() => {})
  const s4 = state(3)

  const ic1 = inputComputeInServer((v: number) => {})

  return {
    ic1
  }
}
Object.assign(changeOver3ChainDriver, {
  __names__: [
    [0, 's1'],
    [1, 's2'],
    [2, 's3'],
    [3, 'm1'],
    [4, 'm2'],
    [5, 'm3'],
    [6, 'm4'],
    [7, 'm5'],
    [8, 'm6'],
    [9, 'c1'],
    [10, 's4'],
    [11, 'ic1']
  ],
  __deps__: [
    ['h', 11, [6, 9], [1, 2]],
    ['h', 9, [3, 4]],
    ['h', 3, [5]],
    ['h', 6, [7, 8]],
    ['h', 8, [7]],
    ['h', 7, [10]]
  ]
})

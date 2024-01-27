import {
  ISource,
  Computed,
  CurrentRunnerScope,
  AsyncState,
  Hook,
  ReactiveChain,
  Watcher,
  log,
  InputCompute,
  ComputedInitialSymbol,
  isDataPatch,
  IDataPatch,
  getCurrentReactiveChain,
  get,
  THookDeps,
  THookNames,
  RunnerContext,
  Driver,
  IHookContext,
  getPlugin,
  getCurrentInputCompute,
  getCurrentRunnerScope,
  EHookEvents,
  FComputedFuncGenerator,
  FComputedFuncAsync,
  FComputedFunc,
  updateValidation,
  InputComputeFn,
  AsyncInputComputeFn,
  GeneratorInputComputeFn,
  checkFreeze,
  isFunc,
  shallowCopy,
  IModifyFunction,
  underComputed,
  mountHookFactory,
  inputCompute,
  Runner,
  produceWithPatches,
  applyPatches
} from '@polymita/signal'
import { 
  IModelIndexesBase, IModelOption,
  IModelPatch,
  IModelPatchRecord,
  IModelQuery,
  IPatch,
  IModelHookContext,
  IModelPatchCreate,
  IModelPatchUpdate,
  IModelPatchRemove,
  IModelRunnerOptions,
  IModelData
} from './types'
import { merge } from './lib/merge'
import {
  calculateDiff,
  checkQueryWhere, 
  constructDataGraph, getRelatedIndexes, getShallowDependentPrevNodes,
  getShallowRelatedIndexes,
  isModelPatch
} from './util'


export class ModelRunner<T extends Driver> extends Runner<T> {
  ScopeConstructor: typeof RunnerModelScope = RunnerModelScope
  scope: RunnerModelScope = null
  constructor(public driver: T, options?: IModelRunnerOptions) {
    super(driver, options)
  }
  override prepareScope (args?: Parameters<T>, initialContext?: IHookContext) {
    return super.prepareScope(args, initialContext) as RunnerModelScope;
  }
}


let GlobalModelEvent: ModelEvent | null = null

export function getGlobalModelEvent() {
  return GlobalModelEvent
}
export function setGlobalModelEvent(me: ModelEvent | null) {
  GlobalModelEvent = me
}

type TModelEntity = string

export class ModelEvent {
  private data = new Map<TModelEntity, IModelPatchRecord[]>()
  listeners: Function[] = []

  subscribe(f: () => void) {
    this.listeners.push(f)
    return () => {
      const i = this.listeners.indexOf(f)
      this.listeners.splice(i, 1)
    }
  }

  from(arr: IModelHookContext['patch']) {
    this.data.clear()
    arr.forEach(([entity, record]) => {
      this.data.set(entity, record)
    })
    this.listeners.forEach(f => f())
  }
  toArray() {
    const arr: IModelHookContext['patch'] = []
    this.data.forEach((v, k) => {
      arr.push([k, v])
    })
    return arr
  }

  getRecord(m: { entity: string }) {
    return this.data.get(m.entity)
  }
  pushPatch(m: { entity: string }, p: IModelPatch<any>[]) {
    let record = this.data.get(m.entity)
    if (!record) {
      record = []
      this.data.set(m.entity, record)
    }
    record.push({
      timing: Date.now(),
      patch: p
    })
  }
}

export function getModelRunnerScope () {
  return getCurrentRunnerScope() as RunnerModelScope | null
}

export class RunnerModelScope<T extends Driver = any> extends CurrentRunnerScope<T> {
  // set by this.setOptions
  modelIndexes: IModelIndexesBase | undefined = undefined
  modelIndexesPath: string[] = []

  modelPatchEvents: ModelEvent

  modelHookFactory = mountModelHookFactory

  constructor (
    public runnerContext: RunnerContext<T>,
    public initialContextDeps: THookDeps,
    public initialContextNames: THookNames,
  ) {
    super(runnerContext, initialContextDeps, initialContextNames)

    this.modelPatchEvents =
      process.env.TARGET === 'server' || !GlobalModelEvent
        ? new ModelEvent()
        : GlobalModelEvent

    this.disposeFuncArr.push(
      this.modelPatchEvents.subscribe(() => {
        this.notifyAllModel()
      })
    )

    if (runnerContext.withInitialContext) {
      this.modelHookFactory = updateModelHookFactory
    }
  }

  readyRelated(h: Hook) {
    const hi = this.getRelatedIndexesByHook(h, true)
    return this.ready(hi)
  }

  private notifyAllModel() {
    this.hooks.forEach(h => {
      if (h instanceof Model) {
        h.checkAndRefresh()
      }
    })
  }

  getRealEntityName(entityKey: string) {
    let result = entityKey
    if (this.modelIndexes) {
      /**
       * @TODO 当前工程下生成的modelIndex默认没有modelIndexesPath
       */
      const subIndexes = get(this.modelIndexes, this.modelIndexesPath)
      result = subIndexes?.[entityKey] || entityKey
    }

    log(
      `[getRealEntityName] entityKey=${entityKey} mi=${!!this
        .modelIndexes} result=${result}`
    )

    return result
  }

  override applyContextFromServer(c: IModelHookContext) {
    super.applyContextFromServer(c)
    if (c.patch?.length) {
      this.modelPatchEvents.from(c.patch)
    }
  }
  override triggerEnterComposeDriver(driverNamespace: string, driverName: string) {
    this.modelIndexesPath.push(driverNamespace)
    const leave = super.triggerEnterComposeDriver(driverNamespace, driverName)
    return () => {
      this.modelIndexesPath.pop()
      leave()
    }
  }

    // transform compose deps to number index that will be convenient for next steps
    hookNumberIndexDeps() {
      const hookIndexDeps: THookDeps = this.initialContextDeps.map(
        ([name, hi, getD, setD]) => {
          const [newGetD, newSetD] = [getD, setD].map(dependencies => {
            return dependencies
              ?.map(numOrArr => {
                if (Array.isArray(numOrArr) && numOrArr[0] === 'c') {
                  const [_, composeIndex, variableName] = numOrArr
                  const setterGetterFunc: { _hook: Hook } | undefined =
                    this.composes[composeIndex]?.[variableName]
                  if (setterGetterFunc?._hook) {
                    return this.findHookIndex(setterGetterFunc._hook)
                  }
                }
                return numOrArr
              })
              .filter(v => v !== undefined)
          })
          return [name, hi, newGetD, newSetD]
        }
      )
      return hookIndexDeps
    }
  
    /**
     * get all related hook index according to passive hookIndex
     * design logic:
     * 1.getD -> getD -> getD
     * 2.setD in who's getD -> getD
     */
    getRelatedHookIndexes(hookIndex: number): Set<number> {
      if (!this.initialContextDeps) {
        return new Set()
      }
  
      const hookIndexDeps = this.hookNumberIndexDeps()
      /**
       * for the special performance case:
       * query on any async and client state eg: Client Model, ClientCache, ComputedInServer
       *  that will batch notify all watchers of it and
       *  doing these all operations in single request
       */
      const isModel = this.hooks[hookIndex] instanceof AsyncState
      if (isModel) {
        const indexArr: number[] = []
        hookIndexDeps.forEach(([_, i, get, set]) => {
          if (get.includes(hookIndex)) {
            indexArr.push(i)
          }
        })
        return getRelatedIndexes(indexArr, hookIndexDeps)
      }
      return getRelatedIndexes(hookIndex, hookIndexDeps)
    }
    getShallowRelatedHookIndexes(hookIndex: number): Set<number> {
      if (!this.initialContextDeps) {
        return new Set()
      }
      const hookIndexDeps = this.hookNumberIndexDeps()
      const tailIndexes = getShallowRelatedIndexes(hookIndex, hookIndexDeps)
      return tailIndexes
    }
    getDependenceByModel(indexes: Set<number>) {
      const result = new Set<number>()
  
      const hookIndexDeps = this.hookNumberIndexDeps()
      const rootNodes = constructDataGraph(hookIndexDeps)
  
      const task = (currentIndexes: Set<number>) => {
        if (currentIndexes.size <= 0) {
          return
        }
  
        const modelHookIndexes = new Set<number>()
        currentIndexes.forEach(i => {
          if (this.hooks[i] instanceof Model) {
            modelHookIndexes.add(i)
          }
        })
        if (modelHookIndexes.size > 0) {
          const nextModelIndexes = new Set<number>()
          modelHookIndexes.forEach(i => {
            getShallowDependentPrevNodes(rootNodes, { id: i }).forEach(n => {
              const r = result.has(n.id)
              result.add(n.id)
              if (this.hooks[n.id] instanceof Model && !r) {
                nextModelIndexes.add(n.id)
              }
            })
          })
          task(nextModelIndexes)
        }
      }
  
      task(indexes)
  
      return result
    }
  
    createBaseContext() {
      const { hooks } = this
      return this.runnerContext.serializeBase(hooks)
    }
    getRelatedIndexesByHook(h: Hook, excludeSelf?: boolean) {
      const { hooks } = this
      const hookIndex = this.findHookIndex(h)
  
      let deps = this.getRelatedHookIndexes(hookIndex)
      if (excludeSelf) {
        deps.delete(hookIndex)
      }
      return deps
    }
    /**
     * as a response while receive a input context
     */
    createPatchContext(): IModelHookContext {
      const { hooks, modelPatchEvents} = this
      const context =  this.runnerContext.serializePatch(hooks)
      return {
        ...context,
        patch: modelPatchEvents.toArray()
      }
    }
    /**
     * as a input of other's Runner and trigger
     * need deliver context principles, sort by priority:
     * 1.model/cache(server) needn't
     * 2.state
     * 3.related set/get
     */
    createActionContext(h?: Hook, args?: any[]): IHookContext {
      const { hooks } = this
      const hookIndex = this.findHookIndex(h)
  
      let deps = new Set<number>()
      if (h) {
        deps = this.getRelatedHookIndexes(hookIndex)
      }
  
      return this.runnerContext.serializeAction(
        hooks,
        hookIndex,
        args || [],
        deps
      )
    }
    createShallowActionContext(h?: Hook, args?: any[]): IHookContext {
      const { hooks } = this
      const hookIndex = this.findHookIndex(h)
  
      let deps = new Set<number>()
      if (h) {
        deps = this.getShallowRelatedHookIndexes(hookIndex)
        /** model must need it's shallow dependent */
        if (deps.size > 0) {
          const modelDeps = this.getDependenceByModel(deps)
          modelDeps.forEach(v => {
            deps.add(v)
          })
        }
      }
  
      return this.runnerContext.serializeAction(
        hooks,
        hookIndex,
        args || [],
        deps
      )
    }
    // alias
    createInputComputeContext(h?: Hook, args?: any[]): IHookContext {
      return this.createActionContext(h, args)
    }
}



export abstract class Model<T extends any[]> extends AsyncState<T> {
  queryWhereComputed: Computed<IModelQuery['query'] | void> | null = null
  watcher: Watcher = new Watcher(this)
  entity: string
  findGetters: Array<() => IModelQuery['query'] | undefined> = []
  constructor(
    entity: string,
    getter: (() => IModelQuery['query'] | undefined) | undefined = undefined,
    public options: IModelOption = {},
    public scope: RunnerModelScope
  ) {
    super([] as any)

    this.entity = scope.getRealEntityName(entity)

    if (!getter) {
      getter = () => ({})
    }
    this.queryWhereComputed = new Computed(getter!)
    this.addDep(this.queryWhereComputed)

    // default to immediate
    if (options.immediate || options.immediate === undefined) {
      // do query after driver ready
      scope.effect((reactiveChain?: ReactiveChain) => {
        this.queryWhereComputed.name = `${this.name}.query`

        const newReactiveChain: ReactiveChain<T> | undefined =
          reactiveChain?.add(this)
        this.query(newReactiveChain)
      })
    }
  }

  injectFindGetter(fn: () => IModelQuery['query'] | undefined) {
    this.findGetters.push(fn)
  }

  setGetter(fn: () => IModelQuery['query'] | undefined) {
    this.queryWhereComputed.getter = fn
  }

  addDep(source: ISource<T>, path?: (string | number)[]) {
    this.watcher.addDep(source, path)
  }

  notify(h?: Hook, p?: IPatch[], reactiveChain?: ReactiveChain) {
    log(`[${this.constructor.name}.executeQuery] withChain=${!!reactiveChain}`)
    const newReactiveChain = reactiveChain?.addNotify(this)
    this.executeQuery(newReactiveChain)
  }
  async getQueryWhere(
    reactiveChain?: ReactiveChain
  ): Promise<IModelQuery['query'] | void> {
    if (this.queryWhereComputed.getterPromise) {
      await this.queryWhereComputed!.getterPromise
    }

    const queryWhereValue = ReactiveChain.withChain(reactiveChain, () => {
      return this.queryWhereComputed!.value
    })

    if (queryWhereValue) {
      if (queryWhereValue === ComputedInitialSymbol) {
        // queryWhereComputed hadn't run.
        this.query()
      } else {
        const extra = this.findGetters.map(fn => fn()).filter(Boolean)
        if (extra.length > 0) {
          return extra.reduce((pre, current) => {
            return merge(pre, current)
          }, queryWhereValue as IModelQuery['query'])
        }
        return queryWhereValue as IModelQuery['query']
      }
    }
  }
  override get value(): T {
    if (this.init) {
      this.query(getCurrentReactiveChain())
    }
    return super.value
  }
  async ready() {
    if (this.getterPromise) {
      await this.getterPromise
    }
  }
  query(reactiveChain?: ReactiveChain) {
    log(`[${this.constructor.name}.query]`)

    if (!reactiveChain) {
      reactiveChain = getCurrentReactiveChain()
    }

    if (this.queryWhereComputed) {
      this.queryWhereComputed.tryModify(reactiveChain)
    }
  }
  async enableQuery() {
    const q = await this.getQueryWhere()
    const valid = q && checkQueryWhere(q)
    return !!q
  }
  abstract executeQuery(reactiveChain?: ReactiveChain): Promise<void>
  abstract exist(obj: Partial<T[0]>): Promise<T | undefined>
  abstract refresh(): Promise<void>
  abstract checkAndRefresh(): Promise<void>
  override async applyComputePatches(
    ic: InputCompute,
    reactiveChain?: ReactiveChain
  ) {
    const exist = this.inputComputePatchesMap.get(ic)
    if (exist) {
      this.inputComputePatchesMap.delete(ic)
      // @TODO：可以不用filter，因为已经用字段区分 dataPatch 和 modelPatch
      const patches = exist[1].filter(isDataPatch) as IDataPatch[] 
      const newValue = applyPatches(this._internalValue, patches)
      await this.updateWithPatches(newValue, patches, false, reactiveChain)
    }
  }

  abstract updateWithPatches(
    v: T,
    patches: IDataPatch[],
    silent: boolean,
    reactiveChain?: ReactiveChain
  ): Promise<void>
}


export enum EnumWriteMethods {
  create = 'create', 
  update = 'update', 
  updateMany = 'updateMany',
  upsert = 'upsert',
  remove = 'remove', 
  find = 'find'
}

export const writeInitialSymbol = ('@@writePrismaInitial')

export abstract class WriteModel<T extends any[]> extends AsyncState<
  T | string
> {
  abstract identifier: string
  entity: string = ''
  sourceModel?: Model<T>

  extraGetters: Record<EnumWriteMethods, Array<() => Partial<T[0]>>> = {
    create: [],
    update: [],
    updateMany: [],
    upsert: [],
    remove: [],
    find: [] // useless
  }

  inputComputeModelPatchesMap:Map<InputCompute, [T[0], IModelPatch<T[0]>[]]> = new Map()

  constructor(
    public sourceModelGetter: { _hook: Model<T> } | string,
    public basicGetData: (() => Partial<T[0]>) | undefined,
    protected scope: RunnerModelScope
  ) {
    super(writeInitialSymbol)

    if (!basicGetData) {
      this.setGetter(() => ({} as T[0]))
    }

    if (typeof sourceModelGetter !== 'string') {
      this.sourceModel = sourceModelGetter._hook
      this.entity = sourceModelGetter._hook.entity
    } else {
      this.entity = sourceModelGetter
    }
    this.entity = scope.getRealEntityName(this.entity)
  }
  
  override hasPatches (ic: InputCompute) {
    const r1 = super.hasPatches(ic)
    const arr = this.inputComputeModelPatchesMap.get(ic)
    return r1 || (arr && arr.length > 0)
  }

  refresh(): Promise<void> {
    /**
     * 在client -> server时，sourceModel不一定被同步序列化，而是createUnaccessibleModelGetter得到了一个空的 
     */
    return this.sourceModel?.refresh?.()
  }
  injectGetter(fn: () => Partial<T[0]>, method: EnumWriteMethods) {
    if (method === 'find') {
      if (this.sourceModel instanceof Model) {
        this.sourceModel.injectFindGetter(fn)
      }
    } else {
      this.extraGetters[method].push(fn)
    }
  }
  getData(method: EnumWriteMethods): T[0] {
    const arr = this.extraGetters[method]
    const base = this.basicGetData()
    // iterate array from tail to head
    for (let i = arr.length - 1; i >= 0; i--) {
      const fn = arr[i]
      if (fn) {
        const data = fn()
        Object.assign(base, data)
      }
    }
    return base
  }
  setGetter(fn: () => Partial<T[0]>) {
    this.basicGetData = fn
  }
  abstract createRow(obj?: Partial<T[0]>): Promise<void>
  abstract updateRow(where: number, obj?: { [k: string]: any }): Promise<void>
  abstract updateManyRows(where: number[], obj?: { [k: string]: any }): Promise<void>
  abstract upsertRow(where: number | { [k: string]: any }, obj?: { [k: string]: any }): Promise<void>
  abstract removeRow(where: number): Promise<void>
  abstract executeModelPath(ps: IModelPatch<T[0]>[]): Promise<void>

  addModelPatches(value: T[0], patches: IModelPatch<T[0]>[]) {
    const currentInputCompute = getCurrentInputCompute()
    if (currentInputCompute) {
      let exist = this.inputComputeModelPatchesMap.get(currentInputCompute)
      if (!exist) {
        exist = [value, []]
      }
      exist[0] = value
      /**
       * @TODO：need merging patches
       */
      exist[1] = exist[1].concat(patches)
      this.inputComputeModelPatchesMap.set(currentInputCompute, exist)
    } else {
      throw new Error(
        '[Model.addComputePatches] must invoked under a InputCompute'
      )
    }
  }
  override async applyComputePatches(
    ic: InputCompute,
    reactiveChain?: ReactiveChain
  ) {
    const exist = this.inputComputeModelPatchesMap.get(ic)
    
    if (exist) {
      this.inputComputeModelPatchesMap.delete(ic)
      const patches = exist[1].filter(isModelPatch) as IModelPatch<T[0]>[]
      const { end, valid } = this.startAsyncGetter()
      
      await this.executeModelPath(patches)
      if (!valid()) {
        return
      }

      this.scope.modelPatchEvents.pushPatch(this, patches)
      // TIP: must refresh after patch recording to make sure the modified time of model > patch time

      log('[WriteModel.applyComputePatches]', 'execute patches done')

      await this.refresh()

      log('[WriteModel.applyComputePatches]', 'sourceModel refresh done')

      reactiveChain?.update()

      end()
    }
  }
}
/** TIP: code for example */
export abstract class ClientModel<T extends any[]> extends Model<T> {}
/** TIP: code for example */
export abstract class ClientWriteModel<T extends any[]> extends WriteModel<T> {}

/**
 * only used in writing data to model entity
 */
export const writePrismaInitialSymbol = Symbol.for('@@writePrismaInitial')

export class Prisma<T extends any[]> extends Model<T> {
  identifier = 'prisma'
  async executeQuery(reactiveChain?: ReactiveChain) {
    const { end, valid } = this.startAsyncGetter()
    try {
      // @TODO：要确保时序，得阻止旧的query数据更新
      const q = await this.getQueryWhere(reactiveChain)
      if (!valid()) {
        return
      }

      log(
        `[${this.name || ''} Model.executeQuery] 1 q.entity, q.query: `,
        this.entity,
        q
      )
      let result = [] as T
      if (!!q) {
        if (valid()) {
          result = await getPlugin('Model').find(
            this.identifier,
            this.entity,
            q
          )
          log(`[${this.name || ''} Model.executeQuery] 2 result: `, result)
        }
      }
      if (valid()) {
        this.update(result, [], false, reactiveChain)
      }
    } catch (e) {
      log(`[${this.name || ''} Model.executeQuery] error`)
      console.error(e)
    } finally {
      log(`[${this.name || ''} Model.executeQuery] end`)
      if (valid()) {
        end()
      }
    }
  }
  async exist(obj: Partial<T[0]>) {
    const result: T[] = await getPlugin('Model').find(
      this.identifier,
      this.entity,
      { where: obj }
    )
    return result[0]
  }
  async refresh() {
    await this.executeQuery(getCurrentReactiveChain()?.add(this))
  }
  async updateWithPatches(
    v: T,
    patches: IDataPatch[],
    silent: boolean,
    reactiveChain?: ReactiveChain
  ) {
    const oldValue = this._internalValue
    if (!this.options.pessimisticUpdate) {
      log('[Model.updateWithPatches] update internal v=', v)
      this.update(v, patches, silent, reactiveChain)
    }

    const { end } = this.startAsyncGetter()

    const { entity } = this
    try {
      const diff = calculateDiff(oldValue, patches)
      log('[Model.updateWithPatches] diff: ', diff)
      await getPlugin('Model').executeDiff(this.identifier, entity, diff)
    } catch (e) {
      console.info('[updateWithPatches] postPatches fail', e)
      // @TODO autoRollback value
      // if (this.options.autoRollback) {
      //   this.update(oldValue, [], true)
      // }
    } finally {
      end()
    }
    await this.executeQuery(reactiveChain)
  }
  async checkAndRefresh() {
    // no need in server
  }
}

export class WritePrisma<T extends any[]> extends WriteModel<T> {
  identifier = 'prisma'
  async executeModelPath(ps: IModelPatch<T[0]>[]) {
    const { applyComputeParallel } = this.scope

    const opMap: Record<
      IModelPatch<T[0]>['op'],
      (p: IModelPatch<T[0]>) => Promise<void | number[] | { count: number }>
    > = {
      create: (p: IModelPatchCreate<T[0]>) =>
        getPlugin('Model').create(this.identifier, this.entity, p.value),
      update: (p: IModelPatchUpdate<T[0]>) =>
        getPlugin('Model').update(this.identifier, this.entity, p.value),
      updateMany: (p: IModelPatchUpdate<T[0]>) =>
        getPlugin('Model').updateMany(this.identifier, this.entity, p.value),
      upsert: (p: IModelPatchUpdate<T[0]>) =>
        getPlugin('Model').upsert(this.identifier, this.entity, p.value),
      remove: (p: IModelPatchRemove<T[0]>) =>
        getPlugin('Model').remove(this.identifier, this.entity, p.value)
    }

    let promiseArr: Promise<any>[] = []
        for (const p of ps) {
      getCurrentReactiveChain()?.addCall(this, p.op)
      const r = opMap[p.op](p)
      if (applyComputeParallel) {
        promiseArr.push(r)
      } else {
        await r
      }
    }
    if (promiseArr.length > 0) {
      await Promise.all(promiseArr)
    }
  }
  async createRow(obj?: IModelData<T[0]>['data'], include?: { [k in keyof T[0]]: boolean }) {
    log('[WritePrisma.createRow]')

    const newReactiveChain = getCurrentReactiveChain()?.addCall(this)
    const defaults = ReactiveChain.withChain(newReactiveChain, () => {
      return this.getData(EnumWriteMethods.create)
    })

    if (getCurrentInputCompute()) {
      const d: T[0] = Object.assign(defaults, obj)
      this.addModelPatches(undefined, [
        {
          op: 'create',
          value: {
            data: d,
            include
          }
        }
      ])
    } else {
      throw new Error('[WritePrisma] must invoke "createRow" in a InputCompute')
    }
  }
  async updateManyRows(whereIds: number[], obj?: IModelData<T[0]>['data']) {
    log('[WritePrisma.updateManyRows]');
    if (getCurrentInputCompute()) {
      const newReactiveChain = getCurrentReactiveChain()?.addCall(this)
      const defaults = ReactiveChain.withChain(newReactiveChain, () => {
        return this.getData(EnumWriteMethods.updateMany)
      })
      const d: T[0] = Object.assign(defaults, obj)
      this.addModelPatches(undefined, [
        {
          op: 'updateMany',
          value: {
            where: { id: { in: whereIds } },
            data: d
          }
        }
      ])
    } else {
      throw new Error('[WritePrisma] must invoke "updateManyRows" in a InputCompute')
    }
  }
  async upsertRow(where: (number | Record<string, any>), obj?: IModelData<T[0]>['data']) {
    log('[WritePrisma.upsertRow]');
    if (getCurrentInputCompute()) {
      const newReactiveChain = getCurrentReactiveChain()?.addCall(this)
      const defaults = ReactiveChain.withChain(newReactiveChain, () => {
        return this.getData(EnumWriteMethods.upsert)
      })
      const d: T[0] = Object.assign(defaults, obj);

      const upsertWhere = typeof where === 'number' ? { id: where } : where

      this.addModelPatches(undefined, [
        {
          op: 'upsert',
          value: {
            where: upsertWhere,
            create: d,
            update: d
          }
        }
      ])
    } else {
      throw new Error('[WritePrisma] must invoke "upsertRow" in a InputCompute')
    }
  }
  async updateRow(where: number, obj?: IModelData<T[0]>['data']) {
        log('[WritePrisma.updateRow]')
    if (getCurrentInputCompute()) {
      const newReactiveChain = getCurrentReactiveChain()?.addCall(this)
      const defaults = ReactiveChain.withChain(newReactiveChain, () => {
        return this.getData(EnumWriteMethods.update)
      })
      const d: T[0] = Object.assign(defaults, obj)
      this.addModelPatches(undefined, [
        {
          op: 'update',
          value: {
            where: { id: where },
            data: d
          }
        }
      ])
    } else {
      throw new Error('[WritePrisma] must invoke "updateRow" in a InputCompute')
    }
  }
  async removeRow(where?: number) {
    log('[WritePrisma.removeRow]')
    if (getCurrentInputCompute()) {
      const newReactiveChain = getCurrentReactiveChain()?.addCall(this)
      const defaults = ReactiveChain.withChain(newReactiveChain, () => {
        return this.getData(EnumWriteMethods.remove)
      })
      this.addModelPatches(undefined, [
        {
          op: 'remove',
          value: {
            where: { id: where || (defaults as any)?.id }
          }
        }
      ])
    } else {
      throw new Error('[WritePrisma] must invoke "updateRow" in a InputCompute')
    }
  }
}

export class ClientPrisma<T extends any[]> extends Prisma<T> {
  override async executeQuery() {
    const { end } = this.startAsyncGetter()

    const valid = await this.enableQuery()

    log(
      `[ClientModel.executeQuery] valid=${valid} ignoreClientEnable=${this.options.ignoreClientEnable}`
    )

    // @TODO: ignoreClientEnable will useless
    if (valid || this.options.ignoreClientEnable) {
      const context = this.scope.createActionContext(this)
      log('[ClientModel.executeQuery] before post')
      const result: IHookContext = await getPlugin('Context').postQueryToServer(
        context
      )

      const index = this.scope.findHookIndex(this)
      if (result.data) {
        const d = result.data[index]
        if (d.length >= 2) {
          this.update(d[2])
        }
      }
    }

    end()
  }
  override async updateWithPatches() {
    throw new Error('[ClientPrisma] cant update in client')
  }
  override async checkAndRefresh() {
    const { modifiedTimestamp } = this
    const patchEvent = this.scope.modelPatchEvents.getRecord(this)
    if (
      patchEvent &&
      patchEvent.some(obj => {
        return obj.timing > modifiedTimestamp
      })
    ) {
      this.refresh()
    }
  }
}
/**
 * writePrisma in client will record the changing
 */
export class ClientWritePrisma<T extends any[]> extends WritePrisma<T> {
  override async createRow(obj?: Partial<T[0]>): Promise<void> {
    throw new Error(
      '[ClientWritePrisma] cant invoke "create" directly in client'
    )
  }
  override async updateRow(
    whereId: number,
    obj?: { [k: string]: any }
  ): Promise<void> {
    throw new Error(
      '[ClientWritePrisma] cant invoke "update" directly in client'
    )
  }
  override async updateManyRows(
    whereId: number[],
    obj?: { [k: string]: any }
  ): Promise<void> {
    throw new Error(
      '[ClientWritePrisma] cant invoke "updateManyRows" directly in client'
    )
  }
  override async upsertRow(
    whereId: number | { [k: string]: any },
    obj?: { [k: string]: any }
  ): Promise<void> {
    throw new Error(
      '[ClientWritePrisma] cant invoke "upsertRow" directly in client'
    )
  }
  override async removeRow(whereId: number): Promise<void> {
    throw new Error(
      '[ClientWritePrisma] cant invoke "remove" directly in client'
    )
  }
}

interface AsyncHook<T> {
  init: boolean
  getterPromise: Promise<T> | null
  startAsyncGetter: () => { end: () => void; valid: () => boolean }
  pending: boolean
}

class AsyncInputCompute<T extends any[]>
  extends InputCompute<T>
  implements AsyncHook<T>
{
  init = true
  getterPromise: Promise<T> | null = null
  asyncCount: number = 0

  constructor (
    public getter: InputComputeFn<T> | AsyncInputComputeFn<T> | GeneratorInputComputeFn<T>, 
    public scope: RunnerModelScope
  ) {
    super(getter, scope)
  }

  startAsyncGetter() {
    this.asyncCount++
    let currentCount = this.asyncCount
    this.init = false
    let resolve: Function
    this.getterPromise = new Promise(r => (resolve = r))

    return {
      end: () => {
        resolve()
        this.getterPromise = null
      },
      valid: () => {
        return this.asyncCount <= currentCount
      }
    }
  }
  get pending(): boolean {
    return !!this.getterPromise
  }
}


class InputComputeInServer<P extends any[]> extends AsyncInputCompute<P> {
  async run(...args: any[]): Promise<void> {
    const { end, valid } = this.startAsyncGetter()

    this.emit(EHookEvents.beforeCalling, this)
    if (!checkFreeze({ _hook: this })) {
      /**
       * only icInServer need confirm all related dependencies ready
       * because IC just be manual (by User or System)
       */
      await this.scope.readyRelated(this)

      getCurrentReactiveChain()?.add(this)
      const context = this.scope.createShallowActionContext(this, args)
      const result = await getPlugin('Context').postComputeToServer(context)
      if (valid()) {
        this.scope.applyContextFromServer(result)
      }
    }
    if (valid()) {
      const r = this.inputFuncEnd()
      end()
      return r
    }
  }
}

export class ClientComputed<T> extends Computed<T> {
  constructor (
    public getter:
    | FComputedFunc<T | string>
    | FComputedFuncAsync<T | string>
    | FComputedFuncGenerator<T | string>,

    protected scope: RunnerModelScope
  ) {
    super(getter)
  }
  override run() {
    const { end, valid } = this.startAsyncGetter()
    const context = this.scope.createActionContext(this)
    log('[ComputedInServer.run] before post')
    getPlugin('Context')
      .postComputeToServer(context)
      .then((result: IHookContext) => {
        if (valid()) {
          const index = this.scope.findHookIndex(this)
          if (result.data) {
            const d = result.data[index]
            if (d.length >= 2) {
              this.update(d[2])
            }
          }
          end()
        }
      })
  }
}

/**
 * 
 * 
 * 
 * 
 * 
 * original hooks api for "InServer"
 * 
 * 
 * 
 * 
 * 
 * 
 */


export const mountModelHookFactory = {
  model: mountPrisma,
  prisma: mountPrisma,
  writePrisma: mountWritePrisma,
  writeModel: writeModel,
  // quick command
  createPrisma: mountCreatePrisma,
  updatePrisma: mountUpdatePrisma,
  removePrisma: mountRemovePrisma,

  computedInServer: mountComputedInServer,
  inputComputeInServer: mountInputComputeInServer
}
export const updateModelHookFactory = {
  model: updateCyclePrisma,
  prisma: updateCyclePrisma,
  writePrisma: mountWritePrisma,
  writeModel: writeModel,

  createPrisma: mountCreatePrisma,
  updatePrisma: mountUpdatePrisma,
  removePrisma: mountRemovePrisma,

  computedInServer: updateComputedInServer,
  inputComputeInServer: updateInputComputeInServer
}

export const modelHookFactoryFeatures = {
  /**
   * all hooks name list
   */
  all: Object.keys({...mountHookFactory, ...mountModelHookFactory}),
  /**
   * need other hook as data source
   */
  withSource: [
    'cache',
    'writeModel',
    'writePrisma',
    'createPrisma',
    'updatePrisma',
    'removePrisma'
  ],
  /**
   * manual calling by User or System
   */
  initiativeCompute: [
    'inputCompute',
    'inputComputeInServer',
    'writePrisma',
    'writeModel',
    'createPrisma',
    'updatePrisma',
    'removePrisma'
  ],
  /**
   * only compatibility with server
   * "model" & "prisma" maybe still run in client because of their query compute
   */
  serverOnly: ['inputComputeInServer', 'computedInServer']
}

export const hookFactoryNames = modelHookFactoryFeatures.all
export const hasSourceHookFactoryNames = modelHookFactoryFeatures.withSource
export const initiativeComputeHookFactoryNames = modelHookFactoryFeatures.initiativeCompute


function createUnaccessibleGetter<T>(index: number) {
  const f = () => {
    throw new Error(`[update getter] cant access un initialized hook(${index})`)
  }
  const newF: (() => any) & { _hook: any } = Object.assign(f, {
    _hook: null
  })
  return newF
}
function createUnaccessibleModelGetter<T extends any[]>(
  index: number,
  entity: string
) {
  const f = (): any => {
    throw new Error(`[update getter] cant access un initialized hook(${index})`)
  }
  const newF: any = Object.assign(f, {
    _hook: { entity },
    exist: () => true,
    create: () => {},
    update: () => {},
    remove: () => {},
    refresh: () => {}
  })
  return newF
}

function updateCyclePrisma<T extends any[]>(
  e: string,
  q?: () => IModelQuery['query'] | undefined,
  op?: IModelOption
) {
  const currentRunnerScope = getModelRunnerScope()!
  const { valid, currentIndex } = updateValidation()

  if (!valid) {
    currentRunnerScope!.addHook(undefined)
    return createUnaccessibleModelGetter<T>(currentIndex, e)
  }
  const inServer = process.env.TARGET === 'server'
  const { beleiveContext } = currentRunnerScope!

  const receiveDataFromContext = beleiveContext || !inServer

  op = Object.assign({}, op, {
    immediate: !receiveDataFromContext
  })

  const hook = inServer
    ? new Prisma<T>(e, q, op, currentRunnerScope)
    : new ClientPrisma<T>(e, q, op, currentRunnerScope)

  currentRunnerScope.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  if (receiveDataFromContext) {
    const initialValue: T =
      currentRunnerScope!.runnerContext.initialData![currentIndex]?.[2]
    const timestamp =
      currentRunnerScope!.runnerContext.initialData![currentIndex]?.[3]
    hook.init = false
    hook._internalValue = initialValue || ([] as T)
    if (timestamp) {
      hook.modifiedTimestamp = timestamp
    }
  }

  const setterGetter = createModelSetterGetterFunc<T>(hook)
  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
    exist: hook.exist.bind(hook) as typeof hook.exist,
    refresh: hook.refresh.bind(hook) as typeof hook.refresh
  })

  return newSetterGetter
}

function updateInputComputeInServer(func: any) {
  const currentRunnerScope = getModelRunnerScope()!

  const { hooks, initialHooksSet } = currentRunnerScope!
  const currentIndex = hooks.length
  const valid = !initialHooksSet || initialHooksSet.has(currentIndex)

  if (!valid) {
    currentRunnerScope!.addHook(undefined)
    return createUnaccessibleGetter(currentIndex)
  }
  return mountInputComputeInServer(func)
}

function mountInputComputeInServer(func: any) {
  const currentRunnerScope = getModelRunnerScope()!

  const hook = new InputComputeInServer(func, currentRunnerScope)
  currentRunnerScope.addHook(hook)
  getCurrentReactiveChain()?.add(hook)
  const wrapFunc = (...args: any) => {
    return hook.run(...args)
  }
  wrapFunc._hook = hook

  return wrapFunc
}


function updateComputedInServer<T>(
  fn: FComputedFuncGenerator<T>
): (() => T) & { _hook: Computed<T> }
function updateComputedInServer<T>(
  fn: FComputedFuncAsync<T>
): (() => T) & { _hook: Computed<T> }
function updateComputedInServer<T>(
  fn: FComputedFunc<T>
): (() => T) & { _hook: Computed<T> }
function updateComputedInServer<T>(fn: any): any {
  const currentRunnerScope = getModelRunnerScope()
  const { valid, currentIndex } = updateValidation()

  if (!valid) {
    currentRunnerScope!.addHook(undefined)
    return createUnaccessibleGetter<T>(currentIndex)
  }

  const initialValue: T =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[2]
  const timestamp =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[3]

  const hook =
    process.env.TARGET === 'server'
      ? new Computed<T>(fn)
      : new ClientComputed<T>(fn, currentRunnerScope)

  currentRunnerScope!.addHook(hook)
  /** @TODO: update computed won't trigger */
  hook._internalValue = initialValue
  hook.init = false
  if (timestamp) {
    hook.modifiedTimestamp = timestamp
  }

  getCurrentReactiveChain()?.add(hook)

  const getter = () => {
    return hook.value
  }
  const newGetter = Object.assign(getter, {
    _hook: hook
  })
  return newGetter
}

function mountComputedInServer<T>(
  fn: FComputedFuncGenerator<T>
): (() => T) & { _hook: Computed<T> }
function mountComputedInServer<T>(
  fn: FComputedFuncAsync<T>
): (() => T) & { _hook: Computed<T> }
function mountComputedInServer<T>(
  fn: FComputedFunc<T>
): (() => T) & { _hook: Computed<T> }
function mountComputedInServer<T>(fn: any): any {

  const currentRunnerScope = getModelRunnerScope()!

  const hook =
    process.env.TARGET === 'server'
      ? new Computed<T>(fn)
      : new ClientComputed<T>(fn, currentRunnerScope)
  currentRunnerScope!.addHook(hook)

  getCurrentReactiveChain()?.add(hook)

  const getter = () => {
    return hook.value
  }
  const newGetter = Object.assign(getter, {
    _hook: hook
  })
  return newGetter
}


/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * hooks api
 * 
 * 
 * 
 * 
 * 
 * 
 */

function createModelSetterGetterFunc<T extends any[]>(
  m: Model<T>
): {
  (): T
  (parameter: IModifyFunction<T>): [T, IDataPatch[]]
} {
  return (parameter?: any): any => {
    if (parameter && isFunc(parameter)) {
      const currentInputCompute = getCurrentInputCompute()

      const [result, patches] = produceWithPatches<T>(
        shallowCopy(m.value),
        parameter
      )
      log(
        '[model setter] result, patches: ',
        !!currentInputCompute,
        JSON.stringify(patches, null, 2)
      )

      if (currentInputCompute) {
        m.addComputePatches(result, patches)
      } else {
        const reactiveChain: ReactiveChain<T> | undefined =
          getCurrentReactiveChain()?.addUpdate(m)

        const isUnderComputed = underComputed()
        m.updateWithPatches(result, patches, isUnderComputed, reactiveChain)
      }
      return [result, patches]
    }
    if (getCurrentReactiveChain()) {
      return ReactiveChain.withChain(getCurrentReactiveChain().addCall(m), () => {
        return m.value
      })
    }
    return m.value
  }
}

function mountPrisma<T extends any[]>(
  e: string,
  q?: () => IModelQuery['query'] | undefined,
  op?: IModelOption
) {
  const currentRunnerScope = getModelRunnerScope()!
  const hook =
    process.env.TARGET === 'server'
      ? new Prisma<T>(e, q, op, currentRunnerScope!)
      : new ClientPrisma<T>(e, q, op, currentRunnerScope!)

  currentRunnerScope.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  const setterGetter = createModelSetterGetterFunc<T>(hook)
  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
    exist: hook.exist.bind(hook) as typeof hook.exist,
    refresh: hook.refresh.bind(hook) as typeof hook.refresh
  })

  return newSetterGetter
}
// TIP: "function updateWritePrisma" same as mountWritePrisma
function mountWritePrisma<T extends any[]>(source: { _hook: Model<T> } | string, q: () => Partial<T[0]>) {
  const currentRunnerScope = getModelRunnerScope()!

  const hook =
    process.env.TARGET === 'server'
      ? new WritePrisma(source, q, currentRunnerScope)
      : new ClientWritePrisma(source, q, currentRunnerScope)

  currentRunnerScope!.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  const getter = () => {
    throw new Error('[writePrisma] cant get data from writePrisma')
  }
  const newGetter = Object.assign(getter, {
    _hook: hook,
    create: hook.createRow.bind(hook) as typeof hook.createRow,
    update: hook.updateRow.bind(hook) as typeof hook.updateRow,
    updateMany: hook.updateManyRows.bind(hook) as typeof hook.updateManyRows,
    upsert: hook.upsertRow.bind(hook) as typeof hook.upsertRow,
    remove: hook.removeRow.bind(hook) as typeof hook.removeRow
  })

  return newGetter
}

function mountCreatePrisma<T extends any[]>(
  source: { _hook: Model<T> } | string,
  q: () => Partial<T[0]>
) {
  const currentRunnerScope = getModelRunnerScope()!

  const hook =
    process.env.TARGET === 'server'
      ? new WritePrisma(source, q, currentRunnerScope)
      : new ClientWritePrisma(source, q, currentRunnerScope)

  currentRunnerScope!.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  const caller = (receivedData?: Partial<T[0]>) => {
    return hook.createRow(receivedData)
  }
  const newCaller = Object.assign(caller, {
    _method: 'create',
    _hook: hook
  })
  return newCaller
}

function mountUpdatePrisma<T extends any[]>(
  source: { _hook: Model<T> } | string,
  q: () => Partial<T[0]>
) {
  const currentRunnerScope = getModelRunnerScope()!

  const hook =
    process.env.TARGET === 'server'
      ? new WritePrisma(source, q, currentRunnerScope)
      : new ClientWritePrisma(source, q, currentRunnerScope)

  currentRunnerScope!.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  const caller = (where: number, receivedData?: Partial<T[0]>) => {
    return hook.updateRow(where, receivedData)
  }
  const newCaller = Object.assign(caller, {
    _method: 'update',
    _hook: hook
  })
  return newCaller
}

function mountRemovePrisma<T extends any[]>(
  source: { _hook: Model<T> },
  q: () => Partial<T[0]>
) {
  const currentRunnerScope = getModelRunnerScope()!

  const hook =
    process.env.TARGET === 'server'
      ? new WritePrisma(source, q, currentRunnerScope)
      : new ClientWritePrisma(source, q, currentRunnerScope)

  currentRunnerScope!.addHook(hook)
  getCurrentReactiveChain()?.add(hook)

  const caller = (where?: number) => {
    return hook.removeRow(where)
  }
  const newCaller = Object.assign(caller, {
    _method: 'remove',
    _hook: hook
  })
  return newCaller
}


/**
 * 
 * 
 * 
 * open user api
 * 
 * 
 * 
 */
export function computedInServer<T>(
  fn: FComputedFuncGenerator<T>
): (() => T) & { _hook: Computed<T> }
export function computedInServer<T>(
  fn: FComputedFuncAsync<T>
): (() => T) & { _hook: Computed<T> }
export function computedInServer<T>(
  fn: FComputedFunc<T>
): (() => T) & { _hook: Computed<T> }
export function computedInServer<T>(fn: any): any {
  const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[computed] must under <Runner>')
  }
  return scope.modelHookFactory.computedInServer<T>(fn)
}

export function inputComputeInServer<T extends any[]>(
  func: AsyncInputComputeFn<T>
): AsyncInputComputeFn<T> & { _hook: Hook }
export function inputComputeInServer<T extends any[]>(
  func: GeneratorInputComputeFn<T>
): AsyncInputComputeFn<T> & { _hook: Hook }
export function inputComputeInServer<T extends any[]>(
  func: InputComputeFn<T>
): AsyncInputComputeFn<T> & { _hook: Hook }
export function inputComputeInServer(func: any) {
  const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[inputComputeServer] must under a <Runner>')
  }
  /**
   * running in client should post request to server
   * if already in server, should execute directly
   */
  if (process.env.TARGET === 'server') {
    return inputCompute(func)
  }
  const wrapFunc = scope.modelHookFactory.inputComputeInServer(func)
  return wrapFunc
}

export function model<T extends any[]>(
  e: string,
  q?: () => IModelQuery['query'] | undefined,
  op?: IModelOption
) {
   const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[model] must under a signal model runner')
  }
  return scope.modelHookFactory.prisma<T>(e, q, op)
}
export function writeModel<T extends any[]>(source: { _hook: Model<T> }, q: () => Partial<T[0]>) {
  const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[writePrisma] must under a signal model runner')
  }
  return scope.modelHookFactory.writePrisma<T>(source, q)
}

export function prisma<T extends any[]>(
  e: string,
  q?: () => IModelQuery['query'] | undefined,
  op?: IModelOption
) {
   const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[prisma] must under a signal model runner')
  }

  return scope.modelHookFactory.prisma<T>(e, q, op)
}

export function writePrisma<T extends any[]>(
  source: { _hook: Model<T> } | string,
  q?: () => Partial<T[0]>
) {
   const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[writePrisma] must under a signal model runner')
  }

  return scope.modelHookFactory.writePrisma<T>(source, q)
}

export function createPrisma<T extends any[]>(
  source: { _hook: Model<T> } | string,
  q?: () => Partial<T[0]>
) {
   const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[createPrisma] must under a signal model runner')
  }

  return scope.modelHookFactory.createPrisma<T>(source, q)
}

export function updatePrisma<T extends any[]>(
  source: { _hook: Model<T> } | string,
  q?: () => Partial<T[0]>
) {
   const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[updatePrisma] must under a signal model runner')
  }

  return scope.modelHookFactory.updatePrisma<T>(source, q)
}

export function removePrisma<T extends any[]>(
  source: { _hook: Model<T> },
  q?: () => Partial<T[0]>
) {
  const scope = getModelRunnerScope()
  if (!scope) {
    throw new Error('[removePrisma] must under a signal model runner')
  }

  return scope.modelHookFactory.removePrisma<T>(source, q)
}

/**
 * inject input data to Model as initial value
 */
type PartialGetter<T> = {
  [K in keyof T]?: T[K]
}

type TGetterData<T> = () => PartialGetter<T>

type TModelGetter<T> = ReturnType<typeof model | typeof writePrisma>
export function connectModel<T>(
  modelGetter: TModelGetter<T>,
  dataGetter: TGetterData<T>
) {
  modelGetter._hook.setGetter(dataGetter)
}

export function injectWrite<T>(
  modelGetter:
    | ReturnType<typeof createPrisma>
    | ReturnType<typeof updatePrisma>
    | ReturnType<typeof removePrisma>,
  dataGetter: TGetterData<T>
): void
export function injectWrite<T>(
  modelGetter: ReturnType<typeof model<T[]>>,
  dataGetter: () => IModelQuery['query'] | undefined
): void
export function injectWrite<T>(
  modelGetter: ReturnType<typeof writeModel>,
  method: EnumWriteMethods,
  dataGetter: TGetterData<T>
): void
export function injectWrite<T>(...args: any[]) {
  const [modelGetter, methodOrDataGetter, dataGetter] = args
  if (dataGetter) {
    modelGetter._hook.injectGetter(dataGetter, methodOrDataGetter)
  } else {
    if (modelGetter._hook instanceof Model) {
      modelGetter._hook.injectFindGetter(methodOrDataGetter)
    } else if (modelGetter._hook instanceof WriteModel) {
      modelGetter._hook.injectGetter(methodOrDataGetter, modelGetter._method)
    } else {
      /** @TODO "_hook" maybe created by createUnaccessModelGetter */
      // throw new Error('[injectWrite] invalid getter._hook type')
      console.error('[injectWrite] invalid getter._hook type')
    }
  }
}

export const injectModel = injectWrite
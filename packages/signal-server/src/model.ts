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
} from '@polymita/signal'
import { 
  IModelIndexesBase, IModelOption,
  IModelPatch,
  IModelPatchRecord,
  IModelQuery,
  IPatch,
  IModelHookContext
} from './types'
import { merge } from './lib/merge'
import {
  checkQueryWhere, 
  constructDataGraph, getRelatedIndexes, getShallowDependentPrevNodes,
  getShallowRelatedIndexes,
  isModelPatch
} from './util'
import { applyPatches } from 'immer'

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
  pushPatch(m: { entity: string }, p: IModelPatch[]) {
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


export class RunnerModelScope<T extends Driver = any> extends CurrentRunnerScope<T> {
  modelIndexes: IModelIndexesBase | undefined = undefined
  modelIndexesPath: string[] = []

  modelPatchEvents: ModelEvent

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
      const subIndexes = get(this.modelIndexes, this.modelIndexesPath)
      result = subIndexes[entityKey] || entityKey
    }

    log(
      `[getRealEntityName] entityKey=${entityKey} mi=${!!this
        .modelIndexes} result=${result}`
    )

    return result
  }

  override applyContextFromServer(c: IModelHookContext) {
    super.applyContextFromServer(c)
    if (c.patch) {
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
                    return this.hooks.indexOf(setterGetterFunc._hook)
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
      const hookIndex = h ? hooks.indexOf(h) : -1
  
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
      const hookIndex = h ? hooks.indexOf(h) : -1
  
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
      const hookIndex = h ? hooks.indexOf(h) : -1
  
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



export abstract class Model<T extends any[]> extends AsyncState<T[]> {
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
    super([])

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
  override get value(): T[] {
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
      const patches = exist[1].filter(isDataPatch) as IDataPatch[]
      const newValue = applyPatches(this._internalValue, patches)
      await this.updateWithPatches(newValue, patches, false, reactiveChain)
    }
  }

  abstract updateWithPatches(
    v: T[],
    patches: IPatch[],
    silent: boolean,
    reactiveChain?: ReactiveChain
  ): Promise<void>
}


type TWriteMethod = 'create' | 'update' | 'remove' | 'find'

export const writeInitialSymbol = Symbol.for('@@writePrismaInitial')

export abstract class WriteModel<T extends Object> extends AsyncState<
  T | Symbol
> {
  abstract identifier: string
  entity: string = ''
  sourceModel?: Model<T[]>

  extraGetters: Record<TWriteMethod, Array<() => T>> = {
    create: [],
    update: [],
    remove: [],
    find: [] // useless
  }

  constructor(
    public sourceModelGetter: { _hook: Model<T[]> } | string,
    public basicGetData: (() => T) | undefined,
    private scope: RunnerModelScope
  ) {
    super(writeInitialSymbol)

    if (!basicGetData) {
      this.setGetter(() => ({} as T))
    }

    if (typeof sourceModelGetter !== 'string') {
      this.sourceModel = sourceModelGetter._hook
      this.entity = sourceModelGetter._hook.entity
    } else {
      this.entity = sourceModelGetter
    }
    this.entity = scope.getRealEntityName(this.entity)
  }
  refresh(): Promise<void> {
    return this.sourceModel?.refresh()
  }
  injectGetter(fn: () => T, method: TWriteMethod) {
    if (method === 'find') {
      if (this.sourceModel instanceof Model) {
        this.sourceModel.injectFindGetter(fn)
      }
    } else {
      this.extraGetters[method].push(fn)
    }
  }
  getData(method: TWriteMethod): T {
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
  setGetter(fn: () => T) {
    this.basicGetData = fn
  }
  abstract createRow(obj?: Partial<T>): Promise<void>
  abstract updateRow(where: number, obj?: { [k: string]: any }): Promise<void>
  abstract removeRow(where: number): Promise<void>
  abstract executeModelPath(ps: IModelPatch[]): Promise<void>
  override async applyComputePatches(
    ic: InputCompute,
    reactiveChain?: ReactiveChain
  ) {
    const exist = this.inputComputePatchesMap.get(ic)
    if (exist) {
      this.inputComputePatchesMap.delete(ic)
      const patches = exist[1].filter(isModelPatch) as IModelPatch[]
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
export abstract class ClientWriteModel<T> extends WriteModel<T> {}


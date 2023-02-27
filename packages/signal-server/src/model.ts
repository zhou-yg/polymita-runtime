import {
  AsyncState,
  Computed,
} from '@polymita/signal'

export abstract class Model<T extends any[]> extends AsyncState<T[]> {
  queryWhereComputed: Computed<IModelQuery['query'] | void> | null = null
  watcher: Watcher = new Watcher(this)
  entity: string
  findGetters: Array<() => IModelQuery['query'] | undefined> = []
  constructor(
    entity: string,
    getter: (() => IModelQuery['query'] | undefined) | undefined = undefined,
    public options: IModelOption = {},
    public scope: CurrentRunnerScope
  ) {
    super([], scope)

    this.entity = scope.getRealEntityName(entity)

    if (!getter) {
      getter = () => ({})
    }
    this.queryWhereComputed = new Computed(getter!, scope)
    this.watcher.addDep(this.queryWhereComputed)

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
        // queryWhereComputed hadnt run.
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
      this.query(currentReactiveChain)
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
      reactiveChain = currentReactiveChain
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
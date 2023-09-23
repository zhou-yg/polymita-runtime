import {
  IDataPatch,
  IHookContext,
  IRunnerOptions
} from "@polymita/signal"

export interface IModelRunnerOptions extends IRunnerOptions {
  modelIndexes?: IModelIndexesBase
}

export interface IStackUnit {
  value: {
    [k: string]: any
  }
  source: {
    [k: string]: any
  }
  currentFieldPath: string
}

export interface IDiff {
  create: IStackUnit[]
  update: IStackUnit[]
  remove: IStackUnit[]
}

/**
 * append types definition for signal plugin
 */
declare module '@polymita/signal' {
  export interface IPlugins {
    Model?: {
      find(
        from: string,
        entity: string,
        query: IModelQuery['query']
      ): Promise<any>
      update(from: string, entity: string, query: IModelData<any>): Promise<number[]>
      create(from: string, entity: string, data: IModelCreateData<any>): Promise<any>
      remove(
        from: string,
        entity: string,
        data: Omit<IModelData<any>, 'data'>
      ): Promise<number[]>
      executeDiff(from: string, entity: string, d: IDiff): Promise<void>
    }
    Context?: {
      postDiffToServer(entity: string, d: IDiff): Promise<void>
      postComputeToServer(c: IHookContext): Promise<IHookContext>
      postQueryToServer(c: IHookContext): Promise<IHookContext>
    }  
  }
}


export interface IModelHookContext extends IHookContext {
  patch?: [string, IModelPatchRecord[]][]
}

export type IPatch = IDataPatch | IModelPatch<any>

export type IModelCreateData<T> =
  | Omit<IModelData<T>, 'where'>
  | Omit<IModelData<T>, 'where'>[]

export interface IModelData<T> {
  where: { id: number } & Partial<T>
  data: {
    [k in keyof T]?:
      | T[k]
      | {
          connect?: Partial<T[k]>
          create?: Partial<T[k]>
        }
  }
  include?: Record<string, boolean>
}

// for model
export type IModelPatchCreate<T> = {
  op: 'create'
  value: IModelCreateData<T>
}
export type IModelPatchUpdate<T> = {
  op: 'update'
  value: IModelData<T>
}
export type IModelPatchRemove<T> = {
  op: 'remove'
  value: Omit<IModelData<T>, 'data'>
}

export type IModelPatch<T> =
  | IModelPatchCreate<T>
  | IModelPatchUpdate<T>
  | IModelPatchRemove<T>

export interface IModelOption {
  immediate?: boolean
  unique?: boolean
  autoRollback?: boolean
  pessimisticUpdate?: boolean
  ignoreClientEnable?: boolean
  // a custom callback to check if the clientModel
  checkRefresh?: (ps: IPatch[]) => boolean
}


interface IQuerySelect {
  [k: string]:
    | boolean
    | {
        select: IQuerySelect
      }
}

interface IQueryInclude {
  [k: string]:
    | boolean
    | IQueryWhere
}

export interface IQueryWhere {
  where?: {
    [k: string]: any
  }
  skip?: number
  take?: number
  include?: IQueryInclude
  select?: IQuerySelect
  orderBy?: {
    [k: string]: 'desc' | 'asc'
  }
  cursor?: {
    id?: number
  }
}

export interface IModelQuery {
  entity: string
  query: IQueryWhere
}

export interface IModelIndexesBase {
  [k: string]: string | IModelIndexesBase
}

export interface IModelPatchRecord {
  timing: number
  patch: IModelPatch<any>[]
}

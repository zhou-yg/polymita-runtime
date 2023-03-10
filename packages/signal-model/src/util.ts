import {
  cloneDeep,
  IDataPatch,
  THookDeps,
  findWithDefault,
  get,
  isArray,
  isEqual,
  last,
  likeObject,
} from '@polymita/signal'
import {
  IPatch,
  IQueryWhere,
  IStackUnit
} from "./types";
import { applyPatches } from 'immer';

export const isModelPatch = (p: IPatch) => !Reflect.has(p, 'path')

export function checkQueryWhere(where: IQueryWhere['where']): boolean {
  return where
    ? !Object.values(where).some(v => {
        if (typeof v === 'object') {
          return !checkQueryWhere(v as any)
        }
        return v === undefined
      })
    : true
}

export class DataGraphNode {
  // relation types
  toGet = new Set<DataGraphNode>()
  toSet = new Set<DataGraphNode>()
  toCall = new Set<DataGraphNode>()

  constructor(public id: number, public type: THookDeps[0][0]) {}
  addToGet(n: DataGraphNode) {
    this.toGet.add(n)
  }
  addToSet(n: DataGraphNode) {
    this.toSet.add(n)
  }
  addToCall(n: DataGraphNode) {
    this.toCall.add(n)
  }
  get children() {
    return new Set<DataGraphNode>([
      ...this.toGet,
      ...this.toSet,
      ...this.toCall
    ])
  }
  getAllChildren(all: Set<DataGraphNode> = new Set()): Set<DataGraphNode> {
    this.children.forEach(c => {
      if (!all.has(c)) {
        all.add(c)
        c.getAllChildren(all)
      }
    })

    return all
  }
}
export function dataGrachTraverse(
  source: DataGraphNode | DataGraphNode[],
  callback: (n: DataGraphNode, ancestors: DataGraphNode[]) => boolean | void
) {
  function task(current: DataGraphNode, ancestors: DataGraphNode[] = []) {
    const r = callback(current, ancestors)
    if (r === false) {
      return false
    }
    for (const v1 of current.children) {
      // prevent traverse circle
      if (ancestors.includes(v1)) {
        continue
      }
      const r = task(v1, ancestors.concat(current))
      if (r === false) {
        return false
      }
    }
  }

  for (const s of [].concat(source)) {
    const r = task(s)
    if (r === false) {
      break
    }
  }
}

function findReactiveDenpendencies(ancestors: DataGraphNode[]) {
  if (ancestors.length >= 2) {
    let r = new Set<DataGraphNode>()
    for (let index = ancestors.length - 1; index > 0; index--) {
      const last = ancestors[index]
      const prevLast = ancestors[index - 1]
      if (prevLast.toGet.has(last)) {
        r.add(prevLast)
      } else {
        break
      }
    }
    return r
  }
}

export function getDependencies(rootNodes: Set<DataGraphNode>, id: number) {
  const dependencies = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, a) => {
    if (n.id === id) {
      const deps = findReactiveDenpendencies(a.concat(n))
      deps?.forEach(dn => {
        dependencies.add(dn)
      })
    }
  })
  return dependencies
}

function getTypeFromContextDeps(contextDeps: THookDeps, index: number) {
  const r = contextDeps.find(v => v[1] === index)
  return r?.[0] || 'h'
}

export function mapGraph(s: Set<DataGraphNode>) {
  const m = new Map<number, DataGraphNode>()
  s.forEach(n => {
    m.set(n.id, n)
  })
  return m
}

export function mapGraphSetToIds(s: Set<DataGraphNode>) {
  return new Set([...s].map(n => n.id))
}

export function getNextNodes(current: DataGraphNode) {
  return current.getAllChildren()
}

export function getPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  const prevNodes = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      ancestor.forEach(an => {
        prevNodes.add(an)
      })
    }
  })
  return prevNodes
}

function getPrevNodesWithFilter(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  filter: (ancestors: DataGraphNode[]) => DataGraphNode[]
) {
  const prevNodes = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      const onlyGetChain = filter(ancestor.concat(n))
      onlyGetChain.forEach(gn => {
        if (gn.id !== current.id) {
          prevNodes.add(gn)
        }
      })
    }
  })
  return prevNodes
}
export function getDependentPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getPrevNodesWithFilter(rootNodes, current, arr => {
    const len = arr.length
    let i = len - 1
    while (i >= 0) {
      const last = arr[i]
      const penultimate = arr[i - 1]
      if (!penultimate || !penultimate.toGet.has(last)) {
        break
      }
      i--
    }
    return arr.slice(i)
  })
}
export function getDependentPrevNodesWithBlock(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  blocks = new Set<DataGraphNode>()
) {
  return getPrevNodesWithFilter(rootNodes, current, arr =>
    arr.some(v => blocks.has(v)) ? [] : arr
  )
}
export function getShallowDependentPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getPrevNodesWithFilter(rootNodes, current, arr =>
    arr.length >= 2 ? [arr[arr.length - 2]] : []
  )
}

function getInfluencedNextNodesWithDependence(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  getDependent: (
    current: { id: number },
    source: DataGraphNode
  ) => Set<DataGraphNode>
) {
  const nextNodes = new Set<DataGraphNode>()

  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      const allChildren = n.getAllChildren()
      allChildren.forEach(cn => {
        nextNodes.add(cn)
        const currentDependentNodes = getDependent(cn, n)
        currentDependentNodes.forEach(ccn => {
          nextNodes.add(ccn)
        })
      })
      return false
    }
  })

  return nextNodes
}

export function getInfluencedNextNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getInfluencedNextNodesWithDependence(
    rootNodes,
    current,
    (current, trigger) => {
      return getDependentPrevNodesWithBlock(
        rootNodes,
        current,
        new Set([trigger])
      )
    }
  )
}

export function getShallowInfluencedNextNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getInfluencedNextNodesWithDependence(
    rootNodes,
    current,
    (current, trigger) => {
      return getShallowDependentPrevNodes(rootNodes, current)
    }
  )
}

export function constructDataGraph(contextDeps: THookDeps) {
  const nodesMap = new Map<number, DataGraphNode>()
  const hasParentIds = new Set<number>()
  contextDeps.forEach(([hookType, id, get, set]) => {
    let current = nodesMap.get(id)
    if (!current) {
      current = new DataGraphNode(id, hookType)
      nodesMap.set(id, current)
    }

    get?.forEach(idOrArr => {
      if (Array.isArray(idOrArr)) {
        throw new Error(
          `[getRelatedIndexes] 1 not support compose. transform it to hook index before calling id=${id}`
        )
      } else {
        let parent = nodesMap.get(idOrArr)
        if (!parent) {
          parent = new DataGraphNode(
            idOrArr,
            getTypeFromContextDeps(contextDeps, idOrArr)
          )
          nodesMap.set(idOrArr, parent)
        }
        hasParentIds.add(current.id)
        parent.addToGet(current)
      }
    })
    set?.forEach(idOrArr => {
      if (Array.isArray(idOrArr)) {
        throw new Error(
          `[getRelatedIndexes] 2 not support compose. transform it to hook index before calling id=${id}`
        )
      } else {
        let child = nodesMap.get(idOrArr)
        if (!child) {
          child = new DataGraphNode(
            idOrArr,
            getTypeFromContextDeps(contextDeps, idOrArr)
          )
          nodesMap.set(idOrArr, child)
        }
        hasParentIds.add(child.id)
        if (child.type === 'ic') {
          current.addToCall(child)
        } else {
          current.addToSet(child)
        }
      }
    })
  })
  const rootNodes = new Set<DataGraphNode>()
  for (const [id, n] of nodesMap) {
    if (!hasParentIds.has(id)) {
      rootNodes.add(n)
    }
  }
  return rootNodes
}

export function getRelatedIndexes(
  index: number[] | number,
  contextDeps: THookDeps
) {
  const indexArr = [].concat(index)

  const deps = new Set<number>(indexArr)

  const rootNodes = constructDataGraph(contextDeps)

  indexArr.forEach(index => {
    const nodes1 = getInfluencedNextNodes(rootNodes, { id: index })
    const nodes2 = getDependentPrevNodes(rootNodes, { id: index })
    ;[nodes1, nodes2].forEach(s => {
      s.forEach(n => {
        deps.add(n.id)
      })
    })
  })

  return deps
}

export function getShallowRelatedIndexes(
  index: number[] | number,
  contextDeps: THookDeps
) {
  const indexArr = [].concat(index)

  const deps = new Set<number>(indexArr)

  const rootNodes = constructDataGraph(contextDeps)

  indexArr.forEach(index => {
    const nodes1 = getShallowInfluencedNextNodes(rootNodes, { id: index })
    const nodes2 = getShallowDependentPrevNodes(rootNodes, { id: index })
    ;[nodes1, nodes2].forEach(s => {
      s.forEach(n => {
        deps.add(n.id)
      })
    })
  })

  return deps
}

/** 
 * model utilities
 */


/**
 * ?????????patch?????????????????????splice???????????????????????????????????????patches???????????????immer?????????????????????????????????
 * arr.splice(0, 1) -> 0 ??????????????????????????????length = length -1 ??????
 * ???????????????????????????length
 * ???????????????, ??????????????????????????????length
 *
 * ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????equal????????????????????????????????????????????????????????????????????????????????????????????????????????????
 *  ??????DB????????????????????????????????????id?????????????????????DB?????????????????????
 *    ??????????????????????????????????????????????????????????????????id????????????????????????????????????????????????????????????????????????????????????????????????????????????id????????????????????????????????????????????????????????????????????????????????????
 *      ??????????????????????????????model????????????patch???????????????????????????????????????
 */

function preparePatches2(data: any | any[], ps: IDataPatch[]) {
  const lengthPatchIndexes: Array<[number, any, (string | number)[]]> = []
  ps.forEach((p, i) => {
    const source = p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
    if (isArray(source) && last(p.path) === 'length') {
      lengthPatchIndexes.push([i, source, p.path.slice(0, -1)])
    }
  })
  if (lengthPatchIndexes.length > 0) {
    const allInsertPatches: Array<[number, number, IDataPatch[]]> = []

    lengthPatchIndexes.forEach(([index, source, currentPath]) => {
      const newArrLength = ps[index].value
      const sourcePatches: IDataPatch[] = []

      let startMovingIndex = index - 1
      for (index - 1; startMovingIndex >= 0; startMovingIndex--) {
        const p = ps[startMovingIndex]
        const currentSource =
          p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
        if (currentSource === source) {
          sourcePatches.unshift({
            ...p,
            path: p.path.slice(-1)
          })
        } else {
          break
        }
      }
      const newSource = applyPatches(source, sourcePatches)

      const reservedPatches: IDataPatch[] = []
      const newInsertPatches: IDataPatch[] = []

      sourcePatches.forEach(p => {
        // value: maybe add, reserve
        // path: maybe remove, reserve (including length)
        const { path, value } = p
        const existInOldIndex = source.findIndex((v: any) => isEqual(v, value))
        const existInNewIndex = newSource.findIndex((v: any) =>
          isEqual(v, value)
        )
        const alreadyReversed1 = reservedPatches.find(p =>
          isEqual(p.value, value)
        )
        // add
        if (existInOldIndex === -1 && existInNewIndex > -1) {
          newInsertPatches.push({
            op: 'add',
            value,
            path: currentPath.concat(path)
          })
        } else if (existInOldIndex > -1 && existInNewIndex > -1) {
          if (!alreadyReversed1) {
            reservedPatches.push({
              op: 'replace',
              value,
              path: currentPath.concat(path)
            })
          }
        }
        const oldPathValue = get(source, path)
        const oldExistInNewIndex = newSource.findIndex((v: any) =>
          isEqual(v, oldPathValue)
        )
        const alreadyReversed2 = reservedPatches.find(p =>
          isEqual(p.value, oldPathValue)
        )
        if (oldExistInNewIndex > -1) {
          if (!alreadyReversed2) {
            reservedPatches.push({
              op: 'replace',
              value: oldPathValue,
              path: currentPath.concat(path)
            })
          }
        } else {
          newInsertPatches.push({
            op: 'remove',
            value: oldPathValue,
            path: currentPath.concat(path)
          })
        }
      })
      // directly remove tail
      if (newArrLength < source.length) {
        let si = newArrLength

        let reservedDataValuesMarks = reservedPatches.map(({ value }) => value)
        while (si < source.length) {
          const oldReservedLength = reservedDataValuesMarks.length
          // @TODO: immer???object????????????????????????????????????????????????????????????isEqual
          // ??????????????????????????????????????????????????????????????????
          reservedDataValuesMarks = reservedDataValuesMarks.filter(
            v => !isEqual(source[si], v)
          )
          if (reservedDataValuesMarks.length === oldReservedLength) {
            // ???????????????????????????????????????????????????
            newInsertPatches.push({
              op: 'remove',
              value: source[si],
              path: currentPath.concat(si)
            })
          }
          si++
        }
      }
      // newInsertPatches.length must gt 1
      allInsertPatches.push([
        startMovingIndex + 1,
        index - startMovingIndex,
        newInsertPatches
      ])
    })
    let offset = 0
    allInsertPatches.forEach(([st, length, arr]) => {
      ps.splice(st - offset, length, ...arr)
      offset = offset + length - arr.length
    })
  }

  return ps
}
/**
 * ??????patch??????diff????????????????????????????????????
 */
export function calculateDiff(data: any | any[], ps: IDataPatch[]) {
  data = cloneDeep(data)

  ps = preparePatches2(data, ps)

  let create: IStackUnit[] = []
  let update: IStackUnit[] = []
  const remove: IStackUnit[] = []

  ps.filter(p => p.path.length > 0).forEach(p => {
    if (p.path && p.path.length > 0) {
      const source = p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
      // CAUTION: ??????????????????
      const pathSkipArr = p.path.filter((k, i) => {
        return !isArray(get(data, p.path.slice(0, i)))
      })

      const patchValue = Reflect.has(p, 'value') ? p.value : get(data, p.path)

      /** 4??????????????????model??????????????? -> ??????????????????
       *
       * ???????????????: a.0.b  a.b  a.b.0   0.a.b ??? ??????????????????????????????????????????????????? a.b
       *
       * ????????????current??????, root = { a:{ b:[x]} } -> root.a.b.0?????????->??????, source=array
       *   x=object --> a.b
       *   x=primitiv --> invalid
       * root={a:{ b:x }} -> root.a.b ??????->??????, source=object
       *   x=object --> a.b
       *   x=primitive --> a
       * root=[{ a: { b: x } }] -> root.0.a.b??? ??????->??????->??????, source=object
       *   x=object --> a.b
       *   x=primitive --> a
       * root=[{ a: [{ b: x }] }] -> root.a.0.b??? ??????->??????, source=array
       *   x=object -> a.b
       *   x=primtive --> a
       */
      const currentFieldPath = pathSkipArr
        .slice(0, likeObject(patchValue) ? Infinity : -1)
        .join('.')

      const lastPathKey = p.path[p.path.length - 1]

      switch (p.op) {
        case 'replace':
          {
            // cant handle the primitive patch in array
            if (isArray(source) && !likeObject(patchValue)) {
              return
            }
            const exist = findWithDefault(
              update,
              u => u.currentFieldPath === currentFieldPath,
              {
                source,
                value: {},
                currentFieldPath
              }
            )
            if (exist) {
              if (isArray(source)) {
                exist.value = patchValue // should bring "id"
              } else {
                Object.assign(exist.value, {
                  [lastPathKey]: patchValue
                })
              }
            }
          }
          break
        case 'add':
          {
            if (isArray(source)) {
              if (likeObject(patchValue)) {
                create.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              }
            } else {
              if (likeObject(patchValue)) {
                create.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              } else {
                const exist = findWithDefault(
                  update,
                  u => u.currentFieldPath === currentFieldPath,
                  {
                    source,
                    value: {},
                    currentFieldPath
                  }
                )
                if (exist) {
                  Object.assign(exist.value, {
                    [lastPathKey]: patchValue
                  })
                }
              }
            }
          }
          break
        case 'remove':
          {
            if (likeObject(patchValue)) {
              if (isArray(source)) {
                remove.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              } else {
                remove.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              }
            } else {
              const exist = findWithDefault(
                update,
                u => u.currentFieldPath === currentFieldPath,
                {
                  source,
                  value: {},
                  currentFieldPath
                }
              )
              if (exist) {
                Object.assign(exist.value, {
                  [lastPathKey]: null
                })
              }
            }
          }
          break
      }
    }
  })

  //combines
  remove.forEach(u => {
    create = create.filter(c => c.currentFieldPath === u.currentFieldPath)
    update = update.filter(c => c.currentFieldPath === u.currentFieldPath)
  })

  return {
    create,
    update,
    remove
  }
}

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

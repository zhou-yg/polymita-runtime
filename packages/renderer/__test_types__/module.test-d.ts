import { expectType } from 'tsd'

import {
  MergedPatchCommandsToModule,
  PrintLayoutStructTree,
  PrintObjectLike,
  ConvertToLayoutTreeDraft,
  ShallowCopyArray,
  Assign,
  h,
  LayoutStructTree
} from '../src/index'

type Props = {}
type L = {
  type: 'div'
  children: [
    {
      type: 'p'
    }
  ]
}

type O1 = MergedPatchCommandsToModule<{}, L, [], []>

expectType<O1>({
  patchLayout: (props: Props, jsonTree: ConvertToLayoutTreeDraft<L>) => {
    return [] as const
  }
})

// convert2
const lt = {
  type: 'div',
  children: [{ type: 'p' }, 'hello']
} as const

type LTHasUnionChildren = typeof lt

type LTDraft2 = ConvertToLayoutTreeDraft<LTHasUnionChildren>

const expectValue = {
  div: Object.assign(['div'] as const, {
    p: ['div', 'p'] as const
  })
}

expectType<LTDraft2>(expectValue)
expectType<LTDraft2['div']['p']>(expectValue.div.p)
expectType<LTDraft2['div']['0']>(expectValue.div[0])
expectType<LTDraft2['div']['length']>(expectValue.div.length)

// convert

type LT = {
  type: 'div'
  readonly children: readonly [
    {
      type: 'div'
    },
    {
      readonly type: 'p'
    }
  ]
}

type LTNested = ConvertToLayoutTreeDraft<LT>

type MyTransformLayoutTree = {
  type: 'div'
  children: [
    {
      type: 'div'
      children: [
        {
          type: 'p'
        }
      ]
    }
  ]
}

type ShowExampleTreeWithIntersectionPath = {
  // for reading
  div: readonly ['div'] & {
    div: readonly ['div', 'div'] & {
      p: readonly ['div', 'div', 'p']
    }
  }
}

const firstPath = ['div'] as const
const secondPath = ['div', 'div'] as const
const thirdPath = ['div', 'div', 'p'] as const
const treeWithPaths = {
  div: Object.assign(firstPath, {
    div: Object.assign(secondPath, {
      p: thirdPath
    })
  })
}

type NestedTransformType = ConvertToLayoutTreeDraft<MyTransformLayoutTree>

type display = NestedTransformType['div']

type vvR = NestedTransformType['div'] extends readonly string[] ? true : false
type vvR2 = NestedTransformType['div'] extends {
  [k: string]: readonly string[]
}
  ? true
  : false // invalid because the target has multiple keys including Array

expectType<NestedTransformType>(treeWithPaths)
expectType<NestedTransformType['div']>(
  Object.assign(['div'] as const, {
    div: Object.assign(['div', 'div'] as const, {
      p: ['div', 'div', 'p'] as const
    })
  })
)

// pick back

type PB = readonly ['div'] & { div: 2 }
type PB2 = readonly ['div', 'p'] & { div: 2 }

type vpb = PB2 extends readonly [infer F, ...infer R] ? [F, ...R] : never // it's unreasonable case to figure out why ?

type PickBack1 = ShallowCopyArray<NestedTransformType['div']>
type PickBack2 = ShallowCopyArray<NestedTransformType['div']['div']>

expectType<PickBack1>(['div'] as const)
expectType<PickBack2>(['div', 'div'] as const)

// including function node types

const vNode = {
  type: 'div',
  children: [
    {
      type: () => {}
    },
    {
      type: 'p'
    }
  ]
} as const

type VHasFunctionNode = typeof vNode

type vDraft = ConvertToLayoutTreeDraft<VHasFunctionNode>

const vP = {
  div: Object.assign(['div'] as const, {
    p: ['div', 'p'] as const
  })
}

expectType<vDraft>(vP)

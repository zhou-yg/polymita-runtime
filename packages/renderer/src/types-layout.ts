import { VirtualLayoutJSON } from './types'

/**
 *
 * some type utility functions
 *
 */

// export interface LayoutStructTree {
//   readonly type: string
//   readonly value?: any
//   readonly children?: readonly (LayoutStructTree)[]
// }
export type BaseDataType = string | number | boolean | null | undefined

export interface LayoutStructTree {
  readonly type: string | Function
  readonly children?: readonly (LayoutStructTree | BaseDataType)[]
}

// support children length = 3, children depth = 2
// export interface VLayoutNode<
//   T extends string | Function,
//   CT1 extends string | Function = undefined,
//   CT2 extends string | Function = undefined,
//   CT3 extends string | Function = undefined,
//   C11 extends string | Function = undefined,
//   C12 extends string | Function = undefined,
//   C13 extends string | Function = undefined,
//   C21 extends string | Function = undefined,
//   C22 extends string | Function = undefined,
//   C23 extends string | Function = undefined,
//   C31 extends string | Function = undefined,
//   C32 extends string | Function = undefined,
//   C33 extends string | Function = undefined,
//   CB1 = undefined,
//   CB2 = undefined,
//   CB3 = undefined
// > {
//   type: T
//   key?: any
//   flags: symbol | string
//   props: Record<string, any>
//   children: CT1 extends undefined
//     ? CB1 extends undefined
//       ? CT2 extends undefined
//         ? CB2 extends undefined
//           ? CT3 extends undefined
//             ? CB3 extends undefined
//               ? []
//               : [CB3]
//             : [VLayoutNode<CT3, C31, C32, C33>]
//           : CT3 extends undefined
//           ? CB3 extends undefined
//             ? [CB2]
//             : [CB2, CB3]
//           : [CB2, VLayoutNode<CT3, C31, C32, C33>]
//         : CT3 extends undefined
//         ? CB3 extends undefined
//           ? [VLayoutNode<CT2, C21, C22, C23>]
//           : [VLayoutNode<CT2, C21, C22, C23>, CB3]
//         : [VLayoutNode<CT2, C21, C22, C23>, VLayoutNode<CT3, C31, C32, C33>]
//       : CT2 extends undefined
//       ? CB2 extends undefined
//         ? CT3 extends undefined
//           ? CB3 extends undefined
//             ? [CB1]
//             : [CB1, CB3]
//           : [CB1, VLayoutNode<CT3, C31, C32, C33>]
//         : CT3 extends undefined
//         ? CB3 extends undefined
//           ? [CB1, CB2]
//           : [CB1, CB2, CB3]
//         : [CB1, CB2, VLayoutNode<CT3, C31, C32, C33>]
//       : CT3 extends undefined
//       ? CB3 extends undefined
//         ? [CB1, VLayoutNode<CT2, C21, C22, C23>]
//         : [CB1, VLayoutNode<CT2, C21, C22, C23>, CB3]
//       : [CB1, VLayoutNode<CT2, C21, C22, C23>, VLayoutNode<CT3, C31, C32, C33>]
//     : CT2 extends undefined
//     ? CB2 extends undefined
//       ? CT3 extends undefined
//         ? CB3 extends undefined
//           ? [VLayoutNode<CT1, C11, C12, C13>]
//           : [VLayoutNode<CT1, C11, C12, C13>, CB3]
//         : [VLayoutNode<CT1, C11, C12, C13>, VLayoutNode<CT3, C31, C32, C33>]
//       : CT3 extends undefined
//       ? CB3 extends undefined
//         ? [VLayoutNode<CT1, C11, C12, C13>, CB2]
//         : [VLayoutNode<CT1, C11, C12, C13>, CB2, CB3]
//       : [VLayoutNode<CT1, C11, C12, C13>, CB2, VLayoutNode<CT3, C31, C32, C33>]
//     : CT3 extends undefined
//     ? CB3 extends undefined
//       ? [VLayoutNode<CT1, C11, C12, C13>, VLayoutNode<CT2, C21, C22, C23>]
//       : [VLayoutNode<CT1, C11, C12, C13>, VLayoutNode<CT2, C21, C22, C23>, CB3]
//     : [
//         VLayoutNode<CT1, C11, C12, C13>,
//         VLayoutNode<CT2, C21, C22, C23>,
//         VLayoutNode<CT3, C31, C32, C33>
//       ]
// }

/**
 * explicity convert layout tree to layout tree draft
 */

type ConvertChildrenToDraft<
  T extends readonly unknown[],
  Keys extends string[] = []
> = T extends readonly [infer F, ...infer R]
  ? F extends LayoutStructTree
    ? [ConvertToLayoutTreeDraft<F, Keys>, ...ConvertChildrenToDraft<R, Keys>]
    : ConvertChildrenToDraft<R, Keys>
  : []

type AssignArray<T> = T extends readonly [infer F, infer S, ...infer R]
  ? R extends readonly []
    ? Assign<F, S>
    : AssignArray<[Assign<F, S>, ...R]>
  : T extends readonly [infer F]
  ? F
  : {}

export type ConvertToLayoutTreeDraft<
  T extends LayoutStructTree,
  Keys extends string[] = []
> = T['type'] extends string
  ? {
      [K in T['type']]: T['children'] extends readonly unknown[]
        ? readonly [...Keys, K] &
            AssignArray<ConvertChildrenToDraft<T['children'], [...Keys, K]>>
        : readonly [...Keys, K]
    }
  : {}

// export type ConvertToLayoutTreeDraft<T extends LayoutStructTree, Keys extends unknown[] = []> = {
//   [K in T['type']]: T['children'] extends readonly unknown[]
//     ? {} extends ConvertToLayoutTreeDraft<T['children'][number], [...Keys, K]>
//       ? never
//       : readonly [...Keys, K] & ConvertToLayoutTreeDraft<T['children'][number], [...Keys, K]>

//     : readonly [...Keys, K]
// }

type InternalGenArr<
  ArrLen,
  ResultArr extends number[]
> = ResultArr['length'] extends ArrLen
  ? ResultArr
  : InternalGenArr<ArrLen, [0, ...ResultArr]>
type GenArr<ArrLen extends number> = ArrLen extends number
  ? InternalGenArr<ArrLen, []>
  : []

type PlusOne<a extends number> = [...GenArr<a>, 0]['length']

export type ShallowCopyArray<
  T extends readonly unknown[],
  I extends number = 0,
  Result extends readonly unknown[] = []
> = I extends T['length']
  ? Result
  : PlusOne<I> extends number
  ? ShallowCopyArray<T, PlusOne<I>, readonly [...Result, T[I]]>
  : never

/**
 * patch cmd to struct
 */

const a = {
  type: 'a',
  arr: [1, 2],
  child: { k: 'v' }
} as const

export enum CommandOP {
  addChild = 'addChild',
  removeChild = 'removeChild',
  replaceChild = 'replaceChild'
}

export interface PatchCommand {
  readonly op: CommandOP
  readonly parent: readonly LayoutStructTree['type'][]
  readonly condition?: boolean
  readonly child?: LayoutStructTree
}

export type Assign<U, T> = {} extends U
  ? T
  : {} extends T
  ? U
  : Omit<U, keyof T> & T

export type RemoveItem<
  Children extends LayoutStructTree['children'],
  child extends LayoutStructTree
> = Children extends readonly [infer First, ...infer Rest]
  ? First extends child
    ? Rest extends []
      ? readonly []
      : Rest extends LayoutStructTree['children']
      ? RemoveItem<Rest, child>
      : []
    : Rest extends LayoutStructTree['children']
    ? readonly [First, ...RemoveItem<Rest, child>]
    : []
  : readonly []

export type DoPatchCommand<
  T extends LayoutStructTree,
  Cmd extends PatchCommand
> = Cmd['op'] extends CommandOP.addChild
  ? T['children'] extends LayoutStructTree['children']
    ? Assign<
        T,
        { readonly children: readonly [...T['children'], Cmd['child']] }
      >
    : Assign<T, { readonly children: readonly [Cmd['child']] }>
  : Cmd['op'] extends CommandOP.removeChild
  ? Assign<T, { readonly children: RemoveItem<T['children'], Cmd['child']> }>
  : Cmd['op'] extends CommandOP.replaceChild
  ? Cmd['child']
  : never

export type PatchToLayoutChildren<
  T,
  Cmd extends PatchCommand
> = T extends readonly [infer FirstChild, ...infer RestChildren]
  ? FirstChild extends LayoutStructTree
    ? RestChildren extends LayoutStructTree['children']
      ? readonly [
          PatchLayout<FirstChild, Cmd>,
          ...PatchToLayoutChildren<RestChildren, Cmd>
        ]
      : never
    : [FirstChild, ...PatchToLayoutChildren<RestChildren, Cmd>]
  : T

export type PatchLayout<
  T extends LayoutStructTree,
  Cmd extends PatchCommand
> = Cmd['parent'] extends readonly [infer First, ...infer Rest]
  ? Rest extends []
    ? T extends { type: First }
      ? DoPatchCommand<T, Cmd>
      : T
    : Rest extends PatchCommand['parent']
    ? Assign<
        T,
        {
          readonly children: PatchToLayoutChildren<
            T['children'],
            { op: Cmd['op']; child: Cmd['child']; parent: Rest }
          >
        }
      >
    : never
  : T

export type PatchLayoutWithCommands<
  T extends LayoutStructTree,
  CmdArr
> = T extends LayoutStructTree
  ? CmdArr extends readonly [infer First, ...infer Rest]
    ? First extends PatchCommand
      ? Rest extends []
        ? PatchLayout<T, First>
        : PatchLayoutWithCommands<PatchLayout<T, First>, Rest>
      : T
    : T
  : never

export type PrintLayoutStructTree<T> = {
  [P in keyof T]: T[P] extends [infer First, ...infer Rest]
    ? [
        {
          [P2 in keyof First]: First[P2]
        },
        ...PrintLayoutStructTree<Rest>
      ]
    : T[P] extends readonly [infer First, ...infer Rest]
    ? readonly [
        {
          [P2 in keyof First]: First[P2]
        },
        ...PrintLayoutStructTree<Rest>
      ]
    : T[P] extends []
    ? []
    : T[P] extends Record<string, unknown>
    ? {} extends T[P]
      ? {}
      : {
          [P2 in keyof T[P]]: T[P][P2]
        }
    : T[P]
}

export type PrintObjectLike<T> = T extends [infer First, ...infer Rest]
  ? First extends Record<string, unknown>
    ? Rest extends unknown[]
      ? [PrintLayoutStructTree<First>, ...PrintObjectLike<Rest>]
      : Rest extends []
      ? [PrintLayoutStructTree<First>]
      : never
    : never
  : T extends Record<string, unknown>
  ? {} extends T
    ? {}
    : PrintLayoutStructTree<T>
  : T

/**
 * module extend
 */

type FormatPatchCommandParent<P> = P extends PatchCommand
  ? {
      readonly op: P['op']
      readonly parent: ShallowCopyArray<P['parent']>
      readonly child: P['child']
    }
  : P

type VV = PatchCommand[] // readonly [{ readonly op: "addChild"; readonly parent: readonly ["div"] & ConvertToLayoutTreeDraft<{ type: "div"; }, ["div"]>; readonly child: { readonly type: "p"; readonly value: "123"; }; }]

type VV0 = VV extends readonly [infer F, ...infer R] ? 1 : 0

export type FormatPatchCommands<P> = P extends readonly []
  ? []
  : P extends readonly [infer F, ...infer R]
  ? R extends []
    ? [FormatPatchCommandParent<F>]
    : R extends readonly PatchCommand[]
    ? readonly [FormatPatchCommandParent<F>, ...FormatPatchCommands<R>]
    : never
  : never

export type MergedPatchCommandsToModule<
  Props,
  L extends LayoutStructTree,
  P1 extends readonly any[],
  P2 extends readonly any[]
> = {
  patchLayout: (
    props: Props,
    layout: ConvertToLayoutTreeDraft<L>
  ) => readonly [...P1, ...P2]
}

export type FlatPatchCommandsArr<T> = T extends readonly [infer F, ...infer R]
  ? F extends readonly PatchCommand[]
    ? readonly [...FlatPatchCommandsArr<F>, ...FlatPatchCommandsArr<R>]
    : F extends PatchCommand
    ? [F, ...R]
    : []
  : []

export type UseComponent<Name, Layout extends LayoutStructTree> = {
  readonly type: Name
  readonly children: [Layout]
}

export type UseModule<
  SingleFileModule extends {
    readonly name?: string
    readonly layoutStruct?: LayoutStructTree
  }
> = {
  readonly type: SingleFileModule['name']
  readonly children: readonly [SingleFileModule['layoutStruct']]
}

// import { expectType } from 'tsd'

// import {
//   PrintLayoutStructTree,
//   ConvertToLayoutTreeDraft,
//   h2
// } from '../src/index'

// // v value

// const nodeSpan = h2('span', {}, h2('text'))

// type NS = typeof nodeSpan
// type NSDisplay = PrintLayoutStructTree<NS>

// const nodeP = h2('p')
// type NP = typeof nodeP
// type NPDisplay = PrintLayoutStructTree<NP>

// const nodeDiv = h2('div', {}, 1 as const, nodeP)
// type ND = typeof nodeDiv
// type NDDisplay = PrintLayoutStructTree<ND['children'][1]> // BaseType

// type NodeDivType = typeof nodeDiv
// type NodeDivTypeDraft = ConvertToLayoutTreeDraft<NodeDivType>

// expectType<NodeDivTypeDraft>({
//   div: Object.assign(['div'] as const, {
//     p: ['div', 'p'] as const
//   })
// })

type A = 'a' | { b: 1 }

type Fs = UnionToFunctions<A>
type I = UnionToIntersection<Fs>

type I2 = UnionToIntersection<A>

// https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type UnionToFunctions<U> = U extends unknown ? (k: U) => void : never

type IntersectionOfFunctionsToType<F> = F extends {
  (a: infer A): void
  (b: infer B): void
  (c: infer C): void
}
  ? [A, B, C]
  : F extends { (a: infer A): void; (b: infer B): void }
  ? [A, B]
  : F extends { (a: infer A): void }
  ? [A]
  : never

type SplitType<T> = IntersectionOfFunctionsToType<
  UnionToIntersection<UnionToFunctions<T>>
>

type Test1 = SplitType<number> // [number]
type Test2 = SplitType<number | string> // [string, number]
type Test3 = SplitType<number | string | symbol> // [string, number, symbol]

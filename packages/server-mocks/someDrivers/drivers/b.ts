import {
  compose,
  computed,
  inputComputeInServer
} from '@polymita/signal-model'

import a from './a'

export default function b () {
  const { s1 } = compose(a)

  const c1 = computed(() => s1() + 1)

  return { s1, c1 }
}
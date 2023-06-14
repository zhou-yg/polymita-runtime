import {
  computed,
  compose,
  state
} from 'tarat-core'

export default function composeWithSS2 () {
  const s1 = state(0)

  const simpleSSResult = compose(simpleSS)

  const ic = inputCompute(() => {
    s1(v => v + 1)
  })

  const { s2 } = compose(simpleSS)

  const { s1: ss1 } = compose(simpleSS)

  const s33 = computed(() => {
    return s1() + simpleSSResult.s1() + s2() + ss1()
  })

  return { s1, ic, s33, simpleSSResult }
}

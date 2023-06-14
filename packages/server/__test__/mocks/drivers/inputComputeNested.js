import {
  computed,
  inputCompute,
  inputComputeInServer,
  state
} from 'tarat-core'

export default function singleBM () {
  const s1 = state()
  const c1 = computed(() => {
    const v = s1() + 3
    return v * 2
  })

  const ic2 = inputCompute(() => {
    s1(v => 1)
  })

  const ic = inputComputeInServer(() => {
    if (c1() > 0) {
      throw new Error('')
    } else if (s1()) {
      s1(v => '')
    }
    ic2()
  })

  return { s1, c1, ic }
}

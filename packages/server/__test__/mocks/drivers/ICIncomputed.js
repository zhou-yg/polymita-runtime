import {
  computed,
  inputComputeInServer,
  state
} from 'tarat-core'

export default function ICIncomputed () {
  const s1 = state()
  const c1 = computed(() => {
    const v = s1() + 3
    if (v > 0) {
      ic()
    }
    return v * 2
  })

  const ic = inputComputeInServer(() => {
    const s = s1()
  })

  return { s1, c1, ic }
}

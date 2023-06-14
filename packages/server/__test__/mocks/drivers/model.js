import {
  computed,
  inputComputeInServer,
  model,
  state
} from 'tarat-core'

export default function singleBM () {
  const s1 = state()
  const c1 = computed(() => {
    const v = s1() + 3
    return v * 2
  })

  const items = model('item', () => {
    if (s1() > 0) {
      return {}
    }
    return {
      id: c1()
    }
  })

  return { s1, c1, items }
}

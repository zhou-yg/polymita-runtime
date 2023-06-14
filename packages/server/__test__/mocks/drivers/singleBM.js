import {
  computed,
  state
} from 'tarat-core'

export default function singleBM () {
  const s1 = state()
  const c1 = computed(() => {
    const v = s1() + 3
    return v * 2
  })
  return { s1, c1 }
}

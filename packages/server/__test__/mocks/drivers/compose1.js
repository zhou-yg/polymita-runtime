import {
  computed,
  inputComputeInServer,
  state
} from 'tarat-core'

export default function composeWithSS () {
  const s1 = state(0)

  const simpleSSResult = compose(simpleSS)

  const s2 = computed(() => {
    return s1()
  })

  return { s1, s2, simpleSSResult }
}

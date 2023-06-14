import {
  state,
  compose,
  computed,
  inputComputeInServer
} from '@polymita/signal-model'

export default function a () {
  const s1 = state(0)

  const c1 = computed(() => s1() + 1)

  return { s1, c1 }
}
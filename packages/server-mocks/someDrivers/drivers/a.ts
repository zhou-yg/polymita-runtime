import {
  inputComputeInServer,
  state
} from '@polymita/signal-model'

export default function a () {

  const s1 = state(0)

  const ic = inputComputeInServer(() => {
    s1(v => v + 1)
  })

  return { s1, ic }
}
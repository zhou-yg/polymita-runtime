import {
  computed,
  inputComputeInServer,
  model,
  state
} from 'tarat-core'

export default function singleBM () {
  const s1 = state()

  const items = model('item', () => ({
    a: 1
  }))

  return { s1, items }
}

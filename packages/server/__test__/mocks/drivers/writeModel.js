import {
  computed,
  inputComputeInServer,
  model,
  state,
  writePrisma,
  createPrisma,
} from 'tarat-core'

export default function writeModelDriver () {
  // 0
  const s1 = state()
  // 1
  const items = model('item', () => ({
    a: s1()
  }))
  // 2
  const writeItems = writePrisma(items, () => ({
    b: 2,
    c: s1()
  }))
  // 3
  const ic = inputComputeInServer(() => {
    writeItems.create()
  })

  const createItems = createPrisma(items)

  return { ic, writeItems }
}

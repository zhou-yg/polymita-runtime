import {
  computed,
  compose,
  state
} from 'tarat-core'

export default function compose3 () {
  const s = state(0)
  const cascadingCompose = compose(cascading)
  injectModel(cascadingCompose.writeItems, () => ({
  }))
  const createItem = inputComputeInServer(function * () {
    yield cascadingCompose.createItems({
      markdown: {
        create: {
          title: 'undefined'
        }
      }
    })
  })

  return {
    cascading: {
      ...cascadingCompose,
      createItem
    },
    s
  }
}

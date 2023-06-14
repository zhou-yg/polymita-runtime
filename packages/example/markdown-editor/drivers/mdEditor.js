import {
  combineLatest,
  computed,
  inputComputeInServer,
  model,
  progress,
  state,
  writeModel
} from 'tarat/core'
import indexes from '@/models/indexes.json'

export default function mdEditor(q = {}) {
  const currentId = state(q.id)
  const inputMD = state('')
  const inputTitle = state('')

  const currentPost = model(indexes.markdown, () => {
    const cid = currentId()
    if (cid) {
      return {
        where: {
          id: cid
        }
      }
    }
  })
  const currentProgress = progress(currentPost)

  const markdownTitle = computed(() => {
    return currentPost()[0]?.title
  })

  const postedMD = computed(() => {
    return currentPost()[0]?.content
  })

  const displayMD = combineLatest([inputMD, postedMD])
  const displayTitle = combineLatest([inputTitle, markdownTitle])

  const writeCurrentMD = writeModel(currentPost, () => ({
    title: inputTitle() || displayTitle() || '',
    content: inputMD() || displayMD() || ''
  }))

  const save = inputComputeInServer(async () => {
    const cid = currentId()
    if (cid) {
      /** @TODO should analyze corect deps */
      writeCurrentMD.update(cid)
    }
  })

  const saveProgess = progress(save)

  return {
    currentId,
    currentProgress,
    displayMD,
    postedMD,
    inputMD,
    inputTitle,
    displayTitle,
    save,
    saveProgess,
  }
}

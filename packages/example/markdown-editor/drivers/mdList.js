import {
  inputComputeInServer,
  model,
  state,
  writePrisma
} from 'tarat/core'
import indexes from '@/models/indexes.json'

export default function mdList(q = {}) {
  const list = model(indexes.markdown, () => ({}))

  const title = state('')

  const writeList = writePrisma(list, () => ({
    title: title()
  }))

  const addMD = inputComputeInServer(function* () {
    yield writeList.create()
    title(() => '')
  })

  return {
    title,
    addMD,
    list
  }
}

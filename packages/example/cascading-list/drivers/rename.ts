import {
  inputCompute,
  inputComputeInServer,
  prisma,
  state,
  writePrisma
} from '@polymita/signal-model'

export interface RenameTarget {
  id?: number
  name: string
}

function rename() {
  const renameInput = state<RenameTarget>({
    id: undefined,
    name: ''
  })
  const currentId = state<number>()

  const startRename = inputCompute((f: RenameTarget) => {
    renameInput(v => {
      Object.assign(v, {
        id: f.id,
        name: f.name
      })
    })
    currentId(() => f.id)
  })

  const switchCurrent = inputCompute((f: RenameTarget) => {
    if (f.id !== currentId()) {
      currentId(() => f.id)
      renameInput(v => {
        v.id = null
      })
    }
  })

  const endRename = inputCompute(() => {
    renameInput(v => {
      v.id = null
    })
  })

  return {
    currentId,
    renameInput,
    startRename,
    endRename,
    switchCurrent
  }
}

export default rename

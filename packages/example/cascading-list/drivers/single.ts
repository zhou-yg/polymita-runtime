import {
  inputCompute,
  inputComputeInServer,
  prisma,
  state,
  writePrisma
} from '@polymita/signal-model'

export default function single() {
  const name = state('init')
  return {
    name
  }
}

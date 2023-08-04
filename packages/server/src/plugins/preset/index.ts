import { testClientRuntime } from './testClientRuntime'
import { testServerRuntime } from './testServerRuntime'
import { clientRuntime } from './clientRuntime'
// some utilities
export * from './clientRuntime'

export const preset = {
  testClientRuntime,
  testServerRuntime,
  clientRuntime,
}
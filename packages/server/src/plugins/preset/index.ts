import { clientTestingRuntime } from './testClientRuntime'
import { clientRuntime } from './clientRuntime'
export * from './clientRuntime'
export const preset = {
  clientTestingRuntime,
  clientRuntime,
}
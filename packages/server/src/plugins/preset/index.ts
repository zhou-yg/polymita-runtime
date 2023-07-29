import { clientTestingRuntime } from './testRuntime'
import { clientRuntime } from './clientRuntime'
export * from './clientRuntime'
export const preset = {
  clientTestingRuntime,
  clientRuntime,
}
import { Func, StateManagementConfig } from "../../types";
import { transform } from "./react-signal";

export const config: StateManagementConfig = {
  matches: [
    {
      renderFramework: 'react',
      stateManagement: 'hook',
    }
  ],
  runLogic: runHookLogic,
  transform,
  // convertProps: convertToSignal
}

function runHookLogic <T extends Func>(react: any, logic: T, propsArr: Parameters<T>) {
  const props = propsArr[0]
  return logic(props) as ReturnType<T>
}
import { Func, StateManagementConfig } from "../../types";

export const config: StateManagementConfig = {
  matches: [
    {
      renderFramework: 'react',
      stateManagement: 'hook',
    }
  ],
  runLogic: runHookLogic,
  // transform, // 不需要双向绑定，所以不需要transform
  // covertProps: convertToSignal
}

function runHookLogic <T extends Func>(react: any, logic: T, propsArr: Parameters<T>) {
  const props = propsArr[0]
  return logic(props) as ReturnType<T>
}
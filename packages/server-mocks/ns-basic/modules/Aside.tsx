import { h, SignalProps, PropTypes, useLogic, ConvertToLayoutTreeDraft, VirtualLayoutJSON } from '@polymita/renderer';

export const name = 'Aside' as const
export const namespace = 'components' as const
export const base = undefined
export let meta: {
  props: AsideProps,
  layoutStruct: AsideLayout
  patchCommands: []
}

export interface AsideProps {
  children?: any;
  title?: string;
}

export const propTypes = {
}

export const logic = (props: SignalProps<AsideProps>) => {
  return {
    logicName: '123'
  }
}
type LogicReturn = ReturnType<typeof logic>

export type AsideLayout = {
  type: 'asideContainer',
  children: [
  ]
}
export const layout = (props: AsideProps): VirtualLayoutJSON => {
  const logic = useLogic<LogicReturn>();
  const { title } = props;
  return (
    <asideContainer className="block flex-1 h-full">
      <asideName className="block m-4 text-xl font-bold">{title}</asideName>
      <asideMenuContainer className="block mt-6 mx-4" />
    </asideContainer>
  )
}

export const styleRules = (props: AsideProps, layout: ConvertToLayoutTreeDraft<AsideLayout>) => {
  return [
  ]
}

export const designPattern = (props: AsideProps, layout: ConvertToLayoutTreeDraft<AsideLayout>) => {
  const logic = useLogic<LogicReturn>()
  return {}
}

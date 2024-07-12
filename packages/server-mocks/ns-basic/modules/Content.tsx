import { h, SignalProps, PropTypes, useLogic, ConvertToLayoutTreeDraft, VirtualLayoutJSON } from '@polymita/renderer';

export const name = 'Content' as const
export const namespace = 'components' as const
export const base = undefined
export let meta: {
  props: ContentProps,
  layoutStruct: ContentLayout
  patchCommands: []
}

export interface ContentProps {
  children?: any
}

export const propTypes = {
}

export const logic = (props: SignalProps<ContentProps>) => {
  return {
  }
}
type LogicReturn = ReturnType<typeof logic>

export type ContentLayout = {
  type: 'contentContainer',
  children: [
  ]
}
export const layout = (props: ContentProps): VirtualLayoutJSON => {
  const logic = useLogic<LogicReturn>()
  return (
    <contentContainer className="block p-4 h-full">
      {props.children}
    </contentContainer>
  )
}

export const styleRules = (props: ContentProps, layout: ConvertToLayoutTreeDraft<ContentLayout>) => {
  return [
  ]
}

export const designPattern = (props: ContentProps, layout: ConvertToLayoutTreeDraft<ContentLayout>) => {
  const logic = useLogic<LogicReturn>()
  return {}
}

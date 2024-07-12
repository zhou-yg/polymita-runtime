import { h, SignalProps, PropTypes, useLogic, ConvertToLayoutTreeDraft, VirtualLayoutJSON, createFunctionComponent } from '@polymita/renderer';
import * as AsideModule from './Aside'
import * as ContentModule from './Content'

export const name = 'App' as const
export const namespace = 'components' as const
export const base = undefined
export let meta: {
  props: AppProps,
  layoutStruct: AppLayout
  patchCommands: []
}

export interface AppProps extends AsideModule.AsideProps{
  contentChildren?: any;
}

export const propTypes = {
}

export const logic = (props: SignalProps<AppProps>) => {
  return {
  }
}
type LogicReturn = ReturnType<typeof logic>

export type AppLayout = {
  type: 'appContainer',
  children: [
  ]
}

const Aside = createFunctionComponent(AsideModule)
const Content = createFunctionComponent(ContentModule)

export const layout = (props: AppProps): VirtualLayoutJSON => {
  const logic = useLogic<LogicReturn>()
  return (
    <appContainer className='flex h-screen w-screen'>
      <div className='h-full flex w-[200px]'>
        <Aside {...props} />
        <asideRightDivider className='my-4 w-[1px] bg-slate-200' />
      </div>
      <div className='flex-1 h-full'>
        <Content>
          {props.contentChildren}
        </Content>
      </div>
    </appContainer>
  )
}

export const styleRules = (props: AppProps, layout: ConvertToLayoutTreeDraft<AppLayout>) => {
  return [
  ]
}

export const designPattern = (props: AppProps, layout: ConvertToLayoutTreeDraft<AppLayout>) => {
  const logic = useLogic<LogicReturn>()
  return {}
}

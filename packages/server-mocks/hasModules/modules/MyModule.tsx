import { h, SignalProps, PropTypes, useLogic, ConvertToLayoutTreeDraft, createFunctionComponent, createComposeComponent } from '@polymita/renderer';
import { after, inputCompute, Signal, signal } from '@polymita/signal-model'
import * as ModalModule from '@polymita/ui'/components/modal'
import * as InputModule from '@polymita/ui'/components/input'
import * as FormModule from '@polymita/ui'/components/schema-form'

export const name = 'AddSource' as const
export let meta: {
  props: AddSourceProps,
  layoutStruct: AddSourceLayout
  patchCommands: []
}

export interface AddSourceProps {
  visible: Signal<boolean>,
  onSubmit: (arg: {
    name: string,
    link: string
  }) => void
}

export const propTypes = {
  visible: PropTypes.signal.isRequired,
}

export const logic = (props: SignalProps<AddSourceProps>) => {
  const name = signal('')
  const link = signal('')

  const submit = inputCompute(() => {
    props.onSubmit({
      name: name(),
      link: link()
    });
  });

  return {
    form: {
      name,
      link,
    },
    submit
  }
}
type LogicReturn = ReturnType<typeof logic>

export type AddSourceLayout = {
  type: 'addSourceContainer',
  children: [
  ]
}

const InputCpt = createFunctionComponent(InputModule, {
  patchRules (props, draft) {
    return [
      {
        target: draft.inputBox,
        style: {
          flex: 1
        }
      }
    ]
  }
})

export const layout = (props: AddSourceProps) => {
  const logic = useLogic<LogicReturn>()

  const visible = props.visible();

  return (
    <firstNode>
      <singleNode />
      <secondNode>
        <subContent>
          {visible && (
            <dynamicContent>
              ha ha ha
            </dynamicContent>
          )}
        </subContent>
      </secondNode>
      <thirdNode if={visible}>
        <InputCpt value={logic.form.name} />
      </thirdNode>
    </firstNode>
  );
}

export const styleRules = (props: AddSourceProps, layout: ConvertToLayoutTreeDraft<AddSourceLayout>) => {
  return [
  ]
}

export const designPattern = (props: AddSourceProps, layout: ConvertToLayoutTreeDraft<AddSourceLayout>) => {
  const logic = useLogic<LogicReturn>()
  return {}
}

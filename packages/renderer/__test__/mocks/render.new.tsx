import { CommandOP, PropTypes, SignalProps, SingleFileModule, UseModule } from '../../src';
import * as mock from '../mock'
import {
  extendModule, h, 
  createFunctionComponent, useLayout, useLogic, createComposeComponent
} from '../../src/render.new'
import { signal } from '@polymita/signal-model';

export const SimpleModuleComponent = createFunctionComponent(mock.simpleModule2());

export function moduleHasNested(): SingleFileModule<{ name: string }, any, [], 'unknown'> {
  return {
    logic() {
      return {}
    },
    layout(props) {
      return (
        <div>
          {props.name}
          <SimpleModuleComponent />
        </div>
      )
    }
  }
}

type UseStyleInLayoutStruct = {
  type: 'div'
  children: [
    {
      type: 'span'
    }
  ]
}

export function useStyleInLayout(): SingleFileModule<
  SignalProps<{ name: string }>,
  UseStyleInLayoutStruct,
  [],
  'unknown'
> {
  return {
    propTypes: {
      name: PropTypes.signal.isRequired
    },
    logic() {
      return { num: 1 }
    },
    layout(props) {
      const logic = useLogic<{ num: number }>()
      return (
        <div name={props.name()} className='old-cls'>
          <span>{logic.num}</span>
        </div>
      )
    },
    styleRules(props) {
      const root = useLayout<UseStyleInLayoutStruct>()
      return [
        {
          target: root.div,
          style: {
            color: 'red'
          },
          className: ' new-cls'
        }
      ]
    }
  }
}


type LayoutUseLogicLayout = {
  type: 'div'
}
type LayoutUseLogicFileModule = ReturnType<typeof layoutUseLogic>
export function layoutUseLogic(): SingleFileModule<
  SignalProps<{ name: string }>,
  LayoutUseLogicLayout,
  [],
  'LayoutUseLogic'
> {
  return {
    name: 'LayoutUseLogic',
    propTypes: {
      name: PropTypes.signal.isRequired
    },
    logic() {
      return { num: 1 }
    },
    layout(props) {
      const logic = useLogic<{ num: number }>()
      return (
        <div name={props.name()} is-container>
          {logic.num}
        </div>
      )
    }
  }
}


export function otherOtherComponentModule(): SingleFileModule<
  {},
  {
    type: 'div'
    children: [UseModule<LayoutUseLogicFileModule>]
  },
  [],
  'unknown'
> {

  const M2 = createFunctionComponent(layoutUseLogic())

  return {
    layout() {

      return (
        <div>
          <M2 name={signal('m2')} />
        </div>
      )
    },
    styleRules(p, rootDraft) {
      return [
        {
          target: rootDraft.div.LayoutUseLogic.div,
          style: {
            fontSize: '12px'
          }
        }
      ]
    }
  }
}

export function patchDeepComposeComponent() {
  const NewModule = extendModule(otherOtherComponentModule(), () => ({
    patchLayout(props, layout) {
      return [
        {
          parent: layout.div.LayoutUseLogic.div,
          op: CommandOP.addChild,
          child: (<span>deep</span>) as { type: 'span' }
        }
      ] as const
    }
  }))

  return NewModule
}

export function composeOtherComponent (): SingleFileModule<
  { name: string, childText?: string },
  {
    type: 'row'
    children: [UseModule<mock.SimpleModule3>]
  },
  [],
  'unknown'
> {

  const ComposeFunction = createComposeComponent(mock.simpleModule3());

  return {
    layout(props) {
      return (
        <row>
          <ComposeFunction {...props} >
            {props.childText}
          </ComposeFunction>
        </row>
      )
    }
  } 
}
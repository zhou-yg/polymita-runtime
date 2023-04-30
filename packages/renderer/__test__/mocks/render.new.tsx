import { h, PropTypes, SignalProps, SingleFileModule } from '../../src';
import * as mock from '../mock'
import {
  createFunctionComponent, useLayout, useLogic
} from '../../src/render.new'

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
        <div name={props.name()}>
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
          }
        }
      ]
    }
  }
}
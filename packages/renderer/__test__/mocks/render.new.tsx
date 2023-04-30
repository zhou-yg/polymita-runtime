import { h, SingleFileModule } from '../../src';
import * as mock from '../mock'
import {
  createFunctionComponent
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
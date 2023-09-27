import { readMockProjectConfig } from "../mockUtil"
import * as fs from 'fs'
import * as layoutTypes from '../../src/compiler/layoutTypes'

describe('layout types', () => {
  it('should has layout', async () => {

    const config = await readMockProjectConfig('hasModules')
    config.modules.forEach(module => {
      const f = module.path.replace(/\.tsx/, '.types.json')
      const layoutTypesExpectResult = fs.readFileSync(f, 'utf-8')
      
      const moduleContent = fs.readFileSync(module.path, 'utf-8');

      const layoutParseResult = layoutTypes.parse(moduleContent);

      expect(layoutParseResult).toEqual({
        "type": "firstNode",
        "component": false,
        "children": [
          {
            "type": "singleNode",
            "component": false
          },
          {
            "type": "secondNode",
            "component": false,
            "children": [
              {
                "type": "subContent",
                "component": false,
                "children": []
              }
            ]
          },
          {
            "type": "thirdNode",
            "component": false,
            "children": [
              {
                "type": "InputCpt",
                "component": true,
                "ConstructorComponentType": "InputModule"
              }
            ]
          }
        ]
      })
    })
  })
})
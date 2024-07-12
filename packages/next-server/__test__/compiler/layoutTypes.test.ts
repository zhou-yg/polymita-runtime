import { readMockProjectConfig } from "../mockUtil"
import * as fs from 'fs'
import * as layoutTypes from '../../src/compiler/prebuild/layoutTypes'

describe('layout types', () => {
  it('should has layout', async () => {

    const config = await readMockProjectConfig('hasModules')
    config.modules.forEach(module => {
      
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

      const tsdCode = layoutTypes.toTSD(layoutParseResult)
      console.log('tsdCode: ', tsdCode);

      expect(tsdCode).toEqual(JSON.stringify({
        "type": "firstNode",
        "children": [
          {
            "type": "singleNode",
          },
          {
            "type": "secondNode",
            "children": [
              {
                "type": "subContent",
                "children": []
              }
            ]
          },
          {
            "type": "thirdNode",
            "children": [
              {
                "type": "InputCpt",
              }
            ]
          }
        ]
      }, null, 2))
    })
  })
})
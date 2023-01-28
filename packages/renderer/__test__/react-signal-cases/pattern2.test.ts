import { ACTIVE, clearIdIndex, constructCSSObj, createPatternCSS, createRenderer, createRenderer2, HOVER, isVirtualNode, mergeStyleObjs, PatternMatrix2, SELECTED, VirtualLayoutJSON } from '../../src'
import * as mock from '../mock'

describe('pattern2', () => {
  describe ('basic utils', () => {
    it ('constructCSSObj', () => {
      const matrix: PatternMatrix2 = [
        [HOVER, SELECTED],
        {
          container: {
            color: {
              black: [
                ['*', 1],
                [1, 0]
              ],
            },
          }
        }
      ]
      const objs = constructCSSObj(matrix)
      expect(objs).toEqual(    [
          {
            "attr": [
              [
                "selected",
                1,
              ],
            ],
            "pseudo": undefined,
            "sematic": "container",
            "style": {
              "color": "black",
            },
          },
          {
            "attr": [
              [
                "selected",
                0,
              ],
            ],
            "pseudo": "hover",
            "sematic": "container",
            "style": {
              "color": "black",
            },
          },
        ])
    })
    it('constructCSSObj', () => {
      console.error = jest.fn()

      const matrix: PatternMatrix2 = [
        [HOVER, ACTIVE, SELECTED],
        {
          container: {
            color: {
              black: [],
              red: [
                [1, 1, 1],
              ],
              blue: [0, 1, 0],
            },
            fontSize: {
              '12px': ['*', '*', '*'],
            }
          }
        }
      ]

      const objs = constructCSSObj(matrix)

      expect(console.error).toBeCalledTimes(1)
      expect(objs).toEqual([
        {
          attr: [],
          style: { color: 'black' },
          sematic: 'container',
          pseudo: undefined
        },
        {
          attr: [[SELECTED, 1]],
          style: { color: 'red' },
          pseudo: HOVER,
          sematic: 'container',
        },
        {
          attr: [[SELECTED, 0]],
          style: { color: 'blue' },
          pseudo: ACTIVE,
          sematic: 'container',
        },
        {
          attr: [],
          style: { fontSize: '12px' },
          sematic: 'container',
          pseudo: undefined
        },
        {
          attr: [],
          style: { fontSize: '12px', color: 'black' },
          sematic: 'container',
        },
      ])
    })

    it('mergeStyleObjs', () => {
      const matrix: PatternMatrix2 = [
        [HOVER, ACTIVE, SELECTED],
        {
          container: {
            color: {
              red: [
                [],
                [1, 0, 1]
              ],
              blue: [0, 1, 0],
            },
            fontSize: {
              '24px': [],
              '12px': [[1, 0, '*']],
              '6px': [0, 1, 0],
              '0px': [1,0,'*'] // cover '12px'
            }
          }
        }
      ]

      const objs = constructCSSObj(matrix)
      // console.log('objs: ', objs);
      const mergedObjs = mergeStyleObjs(objs)
      
      expect(mergedObjs).toEqual([
        {
          attr: [],
          style: { fontSize: '24px', color: 'red' },
          sematic: 'container'
        },
        {
          attr: [[SELECTED, 1]],
          style: { color: 'red' },
          pseudo: HOVER,
          sematic: 'container',
        },
        
        {
          attr: [[SELECTED, 0]],
          style: { color: 'blue', fontSize: '6px' },
          pseudo: ACTIVE,
          sematic: 'container',
        },
        {
          attr: [],
          style: { fontSize: '0px' },
          pseudo: HOVER,
          sematic: 'container',
        },
      ])
    })

    it ('createPatternCSS', () => {
      const matrix: PatternMatrix2 = [
        [HOVER, ACTIVE, SELECTED],
        {
          container: {
            color: {
              red: [[1, 0, 1]],
              blue: [0, 0, 0],
            },
            fontSize: {
              '12px': [[1, 0, '*']],
              '6px': [0, 1, 0],
              '0px': [1,0,'*'] // cover '12px'
            }
          }
        }
      ]
      const clsObj = createPatternCSS(matrix)

      expect(clsObj.container.replace(/\s/g, ''))
        .toEqual(`&[data-selected="1"]:hover{color:red;}&[data-selected="0"]{color:blue;}&:hover{font-size:0px;}&[data-selected="0"]:active{font-size:6px;}`)
    })
  })

  it('new pattern module', () => {
    const module = mock.moduleHasNewDesignPatterns();
    const r = createRenderer(module, {
      framework: mock.MockRectFramework
    })
    const r2 = r.construct()
    const r3 = r.render()

    expect(r3.type).toEqual('div')
    expect(r3.props['is-container']).toEqual(1)
    expect(r3.props.selected).toEqual(true)
    expect(r3.props.disabled).toEqual(false)
    expect(typeof r3.props.className).toEqual('string')
    expect(r3.props['data-disabled']).toEqual('0')
    expect(r3.props['data-selected']).toEqual('1')
    expect(r3.props['data-selecteddisabled']).toEqual('10')
    expect(r3.children).toEqual(undefined)


  })
})
# 视图


视图分为2个部分

- 布局
  - 线性
  - 弹性
  - 自动计算布局
- 样式
  - 排版
  - 盒模型
  - 颜色
  - 点/线/面


现在的业界最佳的实践即是

- xml 描述 布局
  - 如 xml，html
- 规则 描述 样式
  - 如 css

## 类型系统

通过类型描述视图，确保视图在后续的维护中不会底层变动导致的上层异常

```typescript
type UpdateJSXTypes<JSX, Overrides> = /*..类型体操..*/

type JSXTypes = {
  type: 'div' // 注意此处的 type 不是 string
  children: [
    {
      type: 'p'
    }
  ]
}
type OverrideTypes = [
  {
    target: ['div', 'p'],
    operation: 'appendChild',
    child: { type: 'span' }
  }
]

type NewComponentJSXTypes = UpdateJSXTypes<JSXTypes, OverrideTypes>

// NewComponentJSXTypes的输出值
{
  type: 'div'
  children: [
    {
      type: 'p',
      children: [
        { type: 'span' }
      ]
    }
  ]
}
```
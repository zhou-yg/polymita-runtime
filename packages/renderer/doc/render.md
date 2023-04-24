模式1
- 入口：React-Component
  - wrap(Module + Override)
    - 读取当前renderer配置，framework
    - Module内嵌子组件
      - Module include React-Component
        - 问题：这种不行，因为在嵌入module时，并不能确定是React-Component

模式2
- 入口：React-Component
  - wrap(Module + Override)
    - 读取当前renderer配置，framework
    - Module内嵌子组件
      - Module include Module
        - 问题：在真·render时，需要wrap，才能读取render，这样读不了
        - 问题2：子组件 跟 入口不一致，有2种模式了

模式3
- 入口：React-Component
  - wrap(Module + Override)
    - 读取当前renderer配置，framework
    - Module内嵌子组件
      - Module include ??

最终版

顶层链路：React.createElement(createRoot(creteComponent(module, override), config), props)
内部嵌套： 
- 组合模式
 - creteComponent(creteComponent(module, override), override)
- 引用模式
 - creteComponent(createRoot(creteComponent(module, override), config), override)
  - 死路的问题：每次createRoot之后生成的都是新函数，会让React重新刷新

- creteComponent：
  - params: module override
  - return: 带有标示符的函数，内部能获取当前渲染的renderer
- createRoot:
  - params: framework及2个extension
  - return:
    - render函数 渲染标示符函数，构建JSX.Element
- 嵌套子组件


妥协版
顶层链路：
- React.createElement with props
  - createRoot(creteFunctionComponent(module, override), config)
    - module内部嵌套：
      - includes creteFunctionComponent(child-module, child-override)
        - 提醒：注意这里没有经过createRoot，需要createComponent读取从parent那边传过来



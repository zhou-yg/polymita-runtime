问题
书接上回，当JSX可拓展之后随之而来的新问题：
● 中间层引入的性能问题
● 因为无法支持编译期校验，导致拓展代码不安全

这是因为JSX本身 和 拓展逻辑都在代码层是非常动态，而且缺少足够的语义，幸好有Typescript，得益于它图灵完备的类型系统，通过为JSX 和 拓展逻辑 分别设计系统就足以解决上述的2个问题
TS类型的一些基础知识
在此之前，可以先了解一些TS的基础知识，熟悉的朋友可以跳过

泛型
众所周知，TS泛型是可以有“计算”能力
// 泛型推导
type NumberOrString<T> = T extends number ? 1 : 0

type StrHello = 'hello'
type Val = NumberOrString<StrHello> // Val is 0

type Number100 = 100
type Val2 = NumberOrString<Number100> // Val2 is 1
常量
在上面例子里有个不太常见的类型声明，通常会用于常量的类型
type StrHello = 'hello'
const val: StrHello = 'hello' 
除了手动声明之外，TS 还提供 as const 的断言
const name = 'hello' as const // 'hello' 具体常量类型
const name2 = 'hello' // string 类型，自动推导得出
没有变量和“数学计算”
TS中是没有变量的概念，非常的“函数式”，在TS中的所有的“计算”都是接收入参类型，然后推导出一个新类型反。
如果是涉及到加减的场景，可参考 TS类型体操，
或者 TS自身的一些实现，比如Array.flat，利用减法枚举表来实现有限的减1
type FlatArray<Arr, Depth extends number> = {
    "done": Arr,
    "recur": Arr extends ReadonlyArray<infer InnerArr>
        ? FlatArray<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
        : Arr
}[Depth extends -1 ? "done" : "recur"];
JSX结构的类型
开始正题

因为引入中间抽象层本就是JSON，可以转化成TS类型系统，注意避免TS的自动类型推导即可
描述JSX的类型只需要做到描述结构，不需要关心节点的内的具体值（why？）

function view () {
  return (
    <div>
      <p>hello</p>
    </div>
  )
}

// 根据 view 自动生成 ViewJSONTree
type JSXTypes = {
  type: 'div' // 注意此处的 type 不是 string
  children: [
    {
      type: 'p'
    }
  ]
}

目前TS默认的JSX.Element 不支持泛型，所以在语言层面还没有十分便捷方式的可以直接拿到view函数的结构类型，暂时使用CLI工具进行自动生成。

如果把JSX去掉，使用原始h函数可以达到理想的自动获取类型的效果，但这个h函数的实际实现是极度复杂的，因为h函数构建的是一个不定高度和宽度的树，所以它的泛型复杂度公式会是：
h <generics> = length + length ^ depth 

即使是支持 3（children长度） 和 2 （children深度）就需要12个泛型数量，h函数实现示例：
https://github.com/zhou-yg/tarat/blob/master/packages/renderer/src/render.ts#L129
import { h } from 'react-json'

function view () {
  return h(
    'div',
    {},
    h('p', {}, 'hello')
  )
}

type JSXTypes = ReturnType<typeof view>
// ViewStruct的结构如下 
{
  type: 'div'
  children: [
    {
      type: 'p'
    }
  ]
}

动态渲染
更复杂的场景，当JSX内部有动态渲染的节点该如何处理，比如：
function view (props) {
  return (
    <div>
      // 类型 { type: 'span' } | string
      {props.extra ? <span>extra content</span> : '' } 
      <p>hello</p>
    </div>
  ) as const
}

对应到TS类型，这个表达式是有2个返回结果，是一个 Union Type，对应类型
type JSXTypes = {
  type: 'div'
  children: [
    { type: 'span' } | string
    {
      type: 'p'
    }
  ]
}

今天的主流前端组件库因为缺少布局拓展的能力，所以开发者才觉得需要这样动态渲，组件用户只需要在基础组件通过override布局结构即可实现出一个新的extra组件

因为直接对动态的值进行override是危险的行为，在这套可拓展的组件研发体系里是可以完全规避这个问题，因为在完全可以拓展的情况下，是没有必要通过props配置项来控制布局渲染，它们是彻底分成2个组件来使用
● 基础组件
● 用户自主拓展出需要extra content的组件
  ○ 基础组件 + override

这是新的技术体系才能带来的生产力提升。

在实际生产里，因为动态渲染实在过于方便，在复杂业务组件中总是不可避免的要使用到它，所以在业务组件中如果使用动态渲染，那么在类型描述侧就忽略掉动态渲染的部分，确保这部分不稳定的类型不会被其他人override
Override 类型
光有JSX的类型还不够，对于使用者和后续的维护者需要确保每一次的Override都是类型安全的，这就意味着我们还需要知道一次Override后的JSXTypes

那么像下面这样的动态性拓展语句就无法使用了
function override (jsx) {
  jsx.query('div').appendChild(<span>hello</span>)
}

需要有将其转而优化为更加声明式的指令
function override (jsx) {
  return [
    {
      target: jsx.div.p,
      operation: 'appendChild',
      child: <span>hello new child</span> as { type: 'span' }
    }
  ] as const // 需要 as const 确保TS不会将具体的常量类型推导为string
}
// override types 结构如下
type OverrideTypes = [
  {
    target: ['div', 'p'],
    operation: 'appendChild',
    child: { type: 'span' }
  }
]

在有了 JSXTypes 和 OverrideTypes 这2个非常具体的类型之后，就通过TS 类型将其合并出新的JSXTypes
type UpdateJSXTypes<JSX, Overrides> = /*..此处省略1W字的类型体操..*/

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
// NewComponentJSXTypes的结构如下
{
  type: 'div' // 注意此处的 type 不是 string
  children: [
    {
      type: 'p',
      children: [
        { type: 'span' }
      ]
    }
  ]
}

新产生的 NewComponentJSXTypes 就会新组件的类型描述继续向后传递，借助TS的类型校验，就能确保整条拓展链路的类型安全

而且很明显的是在有了JSXTypes之后，一开始提出的另外的性能问题也一起顺便解决了。在编译期就可以获取完整的结构类型，那么它不仅可以用于类型校验，当然也可以用来做构建时期的代码生成，
// NewComponentJSXTypes 的结构就可以在构建期直接生成新的视图层代码
function view () {
  return (
    <div>
      <p>hello</p>
      <span>hello new child</span>
    </div>
  )
}
布局结构的语义
会发现上述的代码中出现了很多的div, p, span之类的标签名，这对于组件拓展来说真的非常不友好，因为这些标签毫无语义可言，更推荐的做法是在组件内部在关键的地方都使用由语义的自定义标签

示例：
function baseButton () {
  return (
    <buttonContainer>
      <button>submit</button>
      <buttonIcon><SuccessIcon /></buttonIcon>
    </buttonContainer>
  )
}

function override (jsx) {
  return [
    {
      // 对比传统表情， 开发者就可以清晰的感受到override操作对象的含义
      target:  jsx.buttonContainer.buttonIcon,
      operation: 'remove',
    }
  ]
}

写在最后
熟悉低代码领域的朋友看到这里可能会发现 JSX结构类型 和 Override类型 跟低代码中的自定义 JSON DSL 设计思路有一定的相似性，这是因为这两者都属于是声明式编程的范式，

使用代码实现的好处是享受对应的技术栈资源，而且对于开发者非常友好。通过TS类型的约束后，也可以0成本的嵌入到低代码技术体系内，作为低代码的底层技术抽象。
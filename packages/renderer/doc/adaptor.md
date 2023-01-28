 处理 signal/vue3/react 三者之间的数据传递和响应关系
 处理 layout/vue3/react 三者的使用关系
 以及 处理它们之间的不同 状态管理组合关系
 大部分情况下，开发者只需要接触 signal 和 vue/react 两者之间的关系
 少部分情况下，开发者需要同时接触这三者
 
 产品矩阵情况
 
 
 vue.data is reactive: data = reactive({})
 as props to module: <Module :data="data" />
 in module.logic: (props: { data: Reactive }) => {    }
 
 question 1: 在logic内部，如何得知是reactivity or signal or any other state management?
  answer 1: 无法得知，需要用户通过配置告知，默认是signal
  answer 2: 同时也需要知道外部声明用的vue，also by user config
 
 if framework and state management belong to same ecosystem, does't need to handle it.
  like vue and reactivity, react and react-hooks
 
 question 2:  how to handle the data flow between different framework and state management?
  answer 1: 需要中间层 adaptor，转换不同的数据结构，并构建 props and pass to module.logic
  answer 2: 通过不同的映射关系，分别写不同的转换函数，这块考虑可以跟状态管理库一起，做成插件的形式
  
 layout的基本逻辑：
  由于logic本身就包含了双向，所以对于layout来说，应该不关心onInput之流，而是要专心于自身的双向绑定逻辑
    如： <input value={mySignal} />
  这个value本就是双向绑定的，在构建layout JSON的时候，自动生成一个onInput，让用户感觉是双向绑定的
  如果已经存在onInput，则合并它们
 
 优先级1：
 vue -> signal
 
 use case:  
   case 1: 在vue组件中，使用 Module Layout (with vue renderer)
      eg.<ModuleCpt :data="reactiveData" /> -> module.logic: (props: { data: reactiveData })
 expected effect: 当vue中 modify reactiveData, 会触发 module.logic中的signal re-compute
 adaptor logic: 
  step 1: 要传入的 module.props 需要被转化成为一个 signal computed，这样当props改变时，会触发module.logic 内部的signal computed
  step 2: 接收到的props，需要遍历一下并watch 所有的reactive data，当reactive data改变时，修改 module.props
  step 3: 当组件的生命周期结束时，回收所有的watch
  step 4: vue3 v-model支持，
    solution 1：检查是否有 props.modelValue，如有 则生成一个 props.onModelValueChange，触发后调用 $emit('update:modelValue')
    solution 2：构建一个props.$emit 或 defineEmits 传入到 logic，由logic自己触发，这样更符合 vue开发者的习惯
 
 react -> signal
 use case: 
  case 1: 在react组件中，使用 Module Layout (with react renderer)
    eg. <ModuleCpt data={hookState} onChangeData={v => setHookState(v)} /> -> module.logic: (props: { data: HookStateValue, onChangeData: (v: any) => void })
 expected effect: 相比vue会更简单些，因为修改props的回调也传递进来了，下层组件进行直接调用 props.onXX 即可
 questions： 
  Q：开发ModuleCpt是一个react dev，这个组件如何应用于vue中
    A.vue直接传props即可， 将 React ModuleCpt 当成一个完全受控组件，且接受reactiveData的组件，处理过程参考上面
 
 adaptor logic:
  step 1: 如果下级是signal，且props声明了只接收signal，那么传参必须经过
 

 优先级2：
 
 signal -> signal
 
 优先级3：
 signal -> vue
 signal -> react
 
 优先级4：
 vue -> react
 react -> vue
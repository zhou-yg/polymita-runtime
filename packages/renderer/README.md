# tarat-renderer

a common renderer support different frameworks:

- react
- vue

## Description
生态定位

- input
  - polymita module
  - 渲染框架：react, vue 或其他

- output
  - Component instance of ui framework

## Structure

renderer
- 提供渲染
  - 根据layout JSON渲染 UI
  - 可修剪 layout JSON
    - transform callback
      - 提供 root  
        - 可在任意的位置下 插入一段 layout JSON
- 提供 h 方法
  - 拼接 layout tree
- 提供遍历的工具方法
  - 接入到 transform


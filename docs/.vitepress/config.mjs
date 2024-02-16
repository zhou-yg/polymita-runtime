import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "polymita",
  description: "a infinite scalable runtime framework",
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '中文',
      lang: 'zh',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh' },
          { text: '文档', link: '/zh/summary' },
          { text: '博客', link: '/zh/blog' },
        ],
    
        sidebar: [
          {
            text: '简介',
            items: [
              { text: 'polymita是什么', link: '/zh/summary' },
            ]
          },
          {
            text: '快速开始',
            items: [
              { text: 'Layout基本布局', link: '/zh/get-started' },
              { text: 'Form表单页' },
              { text: 'Table页' },
              { text: 'List列表页' },
            ]
          },
          {
            text: '核心概念',
            items: [
              { text: '逻辑', link: '/zh/logic' },
              { text: '数据', link: '/zh/data' },
              { text: '视图', link: '/zh/vision' },
            ]
          },
          {
            text: 'API',
            items: [
              { text: 'create-polymita' },
              { text: '@polymita/signal-model' },
              { text: '@polymita/renderer' },
              { text: '@polymita/server' },
              { text: '@polymita/connect' },
            ]
          },
          {
            text: '插件体系'
          },
          {
            text: 'Prompt',
            items: [
              { text: '基本单元' },
              { text: '逻辑CRUD' },
              { text: '数据CRUD' },
              { text: '视图CRUD' },
            ]
          }
        ],
    
        socialLinks: [
          { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
        ]
      }
    }
  },
  themeConfig: {
    logo: {
      light: '/polymita.png',
      dark: '/polymita-white.png'
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Reference', link: '/summary' },
      { text: 'Blog', link: '/blog' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zhou-yg/polymita-runtime' }
    ]
  }
})

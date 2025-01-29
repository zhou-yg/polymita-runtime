import { mergeDynamicRoutesToTree } from './routes'

const r = mergeDynamicRoutesToTree([
  {
    path: '/',
    element: '/'
  },
  {
    path: '/a',
    element: '/a'
  },
  {
    path: '/a/b/c',
    element: '/a/b/c'
  },
])

console.log('r: ', JSON.stringify(r, null, 2));

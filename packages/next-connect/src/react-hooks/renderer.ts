import { h, createRHRenderer, SingleFileModule, registerModule } from '@polymita/renderer'
import { ConnectProvider } from './hooks'

export const createRenderToReact = (React: any, pkgName: string) => {

  return function renderToReact<P extends Record<string, any>>(
    module: SingleFileModule<P, any, any, any>,
    modulesLinkMap: Map<string, any>,
    modulesActiveLink: string[],
  ) {
    registerModule(module, modulesLinkMap);
  
    const internalRenderer = createRHRenderer(module, {
      framework: {
        name: 'react',
        lib: React
      },
      moduleOverride: {
        modulesLinkMap,
        modulesActiveMap: modulesActiveLink,
      },
    })
    return (p: P) => {
      const r = internalRenderer.construct(p);
      return internalRenderer.render()
      // return internalRenderer.provide(
      //   h(
      //     ConnectProvider, 
      //     {
      //       pkgName,
      //     },
      //   ),
      //   h(
      //     () => {
      //       const r = internalRenderer.construct(p);
      //       return internalRenderer.render()
      //     }, {}),
      // )
    }
  }
}
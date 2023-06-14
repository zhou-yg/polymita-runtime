import { createRSRenderer, SingleFileModule } from '@polymita/renderer'
import React from 'react'

export function RenderToReact<P>(module: SingleFileModule<P, any, any, any>) {
  
  const renderer = createRSRenderer(module, {
    framework: {
      name: 'react',
      lib: React
    }
  })
  return (p: P) => {
    const r = renderer.construct(p);
    return renderer.render()
  }
}

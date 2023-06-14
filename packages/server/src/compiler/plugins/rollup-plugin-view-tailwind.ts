import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { Plugin } from 'vite'
import { IConfig } from '../../config'

function pickTailwindFromEntry (c: IConfig) {
  if (!c.entryCSS || !existsSync(c.entryCSS)) {
    return ''
  }

  const entryCSSContent = readFileSync(c.entryCSS).toString()
  const presetDirectives = entryCSSContent.match(/(@tailwind\s+?.+;?)/g)

  const lines = entryCSSContent.split('\n')
  const layerDirectives = []
  lines.forEach((line, i) => {
    if (/@layer\s+\w+/.test(line)) {
      const restContent = lines.slice(i).join('\n')

      let braketStack = []
      let endIndex = -1;
      findLoop: for (let i = 0; i <restContent.length;i++) {
        const char = restContent[i]
        switch (char) {
          case '{':
            braketStack.push(char)
            break 
          case '}':
            braketStack.pop()
            if (braketStack.length == 0) {
              endIndex = i
              break findLoop
            }
            break
        }
      }

      const layerConent = restContent.slice(0, endIndex + 1)
      layerDirectives.push(layerConent)
    }
  })
  

  return presetDirectives.concat(layerDirectives).join('\n')
}

export default function viewTailwind (c: IConfig ): Plugin {

  const viewsPath = join(c.cwd, c.viewsDirectory)

  const tailwindInApp = pickTailwindFromEntry(c)

  return {
    name: 'view-tailwind',
    async load (id) {
      if (String(id).startsWith(viewsPath) && /\.less$/.test(id) ) {
        const newLess = readFileSync(id).toString().concat(tailwindInApp)
        return {
          code: newLess
        }
      }
    }
  }
}
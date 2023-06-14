import * as path from 'path'
import * as fs from 'fs'

export interface IViewConfig {
  /**
   * The unique id for this route, named like its `file` but without the
   * extension. So `app/routes/gists/$username.jsx` will have an `id` of
   * `routes/gists/$username`.
   */
  id: string
  parentId: string
  /**
   * The path this route uses to match on the URL pathname.
   */
  path: string
  /**
   * single file name without file extension
   */
  name: string

  index?: boolean
  // file absolute path relative to current project
  file: string
  // file absolute path relative to root
  filePath: string

  dir: boolean
  isDir: boolean

  dynamic: boolean
}

const isIndexFlagn = (f: string) => /^index.(j|t)sx$/.test(f) || /\/index.(j|t)sx$/.test(f)

const isPageFile = (f: string) => /\.(j|t)sx$/.test(f)

function defineView (viewDir: string, file: string, name: string, parent?: IViewConfig): IViewConfig[] {

  const configs: IViewConfig[] = []
  const currentFileOrDirPath = path.join(viewDir, file)
  const current: IViewConfig = {
    id: file,
    parentId: parent?.id || '',
    path: file.replace(/\.\w+/, ''),
    file,
    filePath: currentFileOrDirPath,
    name: name.replace(/\.\w+/, ''),
    index: isIndexFlagn(file),
    dir: fs.lstatSync(currentFileOrDirPath).isDirectory(),
    isDir: fs.lstatSync(currentFileOrDirPath).isDirectory(),
    dynamic: /^\:/.test(name)
  }
  if (current.isDir) {
    const childConfigs = readViews(viewDir, file, current)
    configs.push(...childConfigs)
  }
  configs.push(current)

  return configs
}

export function readViews (viewDir: string, dir: string, parent?: IViewConfig) {
  const d = path.join(viewDir, dir)
  if (!fs.existsSync(d)) {
    return []
  }
  const views = fs.readdirSync(d)

  const viewConfigs = views.filter(f => {
    const file = path.join(viewDir, dir, f)

    return isPageFile(file) || fs.lstatSync(file).isDirectory()
  }).map(f => {
    const file = path.join(dir, f)
    return defineView(viewDir, file, f, parent)
  })

  return viewConfigs.flat()
}

export interface IRouteChild extends IViewConfig {
  children: IRouteChild[]
}

interface IRoutesTree {
  [k: string]: IRouteChild
}

export function defineRoutesTree (pages: IViewConfig[]) {
  const routesMap: IRoutesTree = {}
  pages.forEach(p => {
    routesMap[p.id] = Object.assign({
      children: []
    }, p)
  })

  pages.forEach(p => {
    if (p.parentId) {
      const child = routesMap[p.id]
      routesMap[p.parentId].children.push(child)
    }
  })

  return Object.values(routesMap).filter(p => !p.parentId)
}

export function matchRoute (pages: IViewConfig[], pathname: string) {
  let directlyMatchedPage = pages.find(v => v.path === pathname || v.path === path.join(pathname, 'index'))
  if (!directlyMatchedPage) {
    // pathname maybe is dynmaic route
    const arr = pathname.split('/')
    directlyMatchedPage = pages.find(v => {
      const routePathArr = v.path.split('/')
      return (
        arr.length === routePathArr.length &&
        arr.slice(0, -1).join('/') === routePathArr.slice(0, -1).join('/') &&
        v.dynamic
      )
    })
  } 
  return directlyMatchedPage 
}

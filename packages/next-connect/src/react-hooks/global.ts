/**
 * keep same as next-server/src/config.ts#UserCustomConfig
 */
interface UserCustomConfig {
  platform: 'browser' | 'desktop'
  ts?: boolean
  debugLog?: boolean

  moduleOverride?: {
    activeLink?: string[]
    linkMap?: Map<string, string[]>
    configMap?: Record<string, Record<string, any>>
  }
}

export function getDynamicRoutes (): { path: string, element: string }[] {
  return globalThis.POLYMITA_DYNAMIC_ROUTES || []
}

export function getConfig (): UserCustomConfig {
  if (!globalThis.POLYMITA_CONFIG) {
    globalThis.POLYMITA_CONFIG = {
      moduleOverride: {
        linkMap: new Map<string, string[]>(),
        activeLink: []
      }
    }
  }
  if (!globalThis.POLYMITA_CONFIG.moduleOverride) {
    Object.assign(globalThis.POLYMITA_CONFIG, {
      moduleOverride: {
        linkMap: new Map<string, string[]>(),
        activeLink: []
      }
    })
  }
  return globalThis.POLYMITA_CONFIG;
}

export function getModulesContext (): Record<string, {
  views: Record<string, any>,
  modules: Record<string, any>,
  overrides: Record<string, any>,
}> {
  if (!globalThis.POLYMITA_MODULES) {
    globalThis.POLYMITA_MODULES = {}
  }
  return globalThis.POLYMITA_MODULES;
}



export function createModulesContext (
  config: UserCustomConfig,
  initialContext: Record<string, any>
) {
  let context = initialContext;
  if (!context) {
    context = getModulesContext()
  }

  function registerModule ( 
    pkg: string,
    exports: {
      views: Record<string, any>,
      modules: Record<string, any>,
      overrides: Record<string, any>,
    }
  ) {
    Object.assign(context, {
      [pkg]: exports,
    })
    
    Object.keys(exports.overrides || {}).forEach(keyName => {
      exports.views[keyName](config.moduleOverride.linkMap);
    })
  }

  function createViewComponent (pkg: string, name: string) {
    const moduleViews = getModule(pkg, 'views');
    if (moduleViews) {
      return moduleViews?.[name]?.(config.moduleOverride.linkMap, config.moduleOverride.activeLink)
    }
  }
  
  function getModules () {
    return context
  }
  
  function getModule (pkg: string, scope: 'views' | 'modules' | 'overrides') {
    const modules = getModules()
    const module = modules[pkg]
    if (!module) {
      throw new Error(`[next-connect] Module ${pkg} not found`)
    }
    return module[scope]
  }

  return {
    registerModule,
    getModule,  
    getModules,
    createViewComponent,
  }
}


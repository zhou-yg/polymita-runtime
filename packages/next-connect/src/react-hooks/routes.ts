interface DynamicRoute {
  title?: string,
  path: string, 
  element: any; 
  children?: DynamicRoute[]
}

interface BrowserRoute {
  path: string,
  element: any,
  layout: any
  children?: BrowserRoute[]
}

export function getDynamicRoutes (): DynamicRoute[] {
  return globalThis.POLYMITA_DYNAMIC_ROUTES || []
}


export function mergeDynamicRoutesToTree(routes: DynamicRoute[]): DynamicRoute[] {
  const routeMap: { [key: string]: DynamicRoute } = {};

  routes.forEach(route => {
    if (!route.path.startsWith('/')) {
      console.error('[mergeDynamicRoutesToTree]] route: ', route);
      throw new Error('[mergeDynamicRoutesToTree] path must starts with "/" ')
    }
    if (routeMap[route.path]) {
      console.error('[mergeDynamicRoutesToTree]] route: ', route);
      throw new Error('[mergeDynamicRoutesToTree] duplicate path ' + route.path)
    }
    routeMap[route.path] = { ...route, children: [] };
  });

  const rootRoutes: DynamicRoute[] = [];

  routes.forEach(route => {

    let currentPath = route.path
    if (currentPath === '/') {
      rootRoutes.push(routeMap[route.path]);
    } else {
      while (currentPath) {
        let parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        if (parentPath === '') {
          parentPath = '/'
        }

        if (routeMap[parentPath]) {
          const newRoutePath = route.path.replace(parentPath, '')
          routeMap[parentPath].children!.push({
            ...routeMap[route.path],
            path: newRoutePath,
          });
          break;
        } else {
          currentPath = parentPath
        }
      }
    }
  });

  return rootRoutes;
}
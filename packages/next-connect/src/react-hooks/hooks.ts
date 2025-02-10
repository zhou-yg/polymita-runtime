import React, { createElement, useContext, useEffect, useState } from "react";
import {
  Plugin,
  IModelIndexesBase,
  IModelQuery,
  isPromise,
  EventEmitter,
} from "@polymita/signal-model";

export const ConnectContext = React.createContext<{
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
  modelEvents: EventEmitter
}>(null);

const MODEL_UPDATE = 'MODEL_UPDATE'

export const genModelEventKey = (entity: string) => `${MODEL_UPDATE}:${entity}`

/**
 * @deprecated
 */
export const PrismaNamespaceContext = React.createContext<{
  namespace: string;
  modulesLinkMap?: Map<string, any>;
  modulesActiveMap?: string[]
}>(null);

export function ConnectProvider(props: {
  children?: any;
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
}) {
  return createElement(
    ConnectContext.Provider,
    {
      value: {
        ...props,
        modelEvents: new EventEmitter(),
      }
    },
    props.children,
  );
}
/**
 * @deprecated
 */
export function PrismaNamespaceProvider(props: {
  children?: any;
  namespace: string;
  modulesLinkMap?: Map<string, any>;
  modulesActiveMap?: string[]
}) {
  return createElement(
    PrismaNamespaceContext.Provider,
    {
      value: {
        namespace: props.namespace,
        modulesLinkMap: props.modulesLinkMap,
        modulesActiveMap: props.modulesActiveMap,
      }
    },
    props.children,
  );
}

export function prisma<T>(
  namespace: string,
  name: string,
  queryFn?: () => Promise<IModelQuery["query"]> | IModelQuery["query"],
  options?: { immediate?: boolean; deps: any[] },
): T | undefined {
  const { plugin, modelIndexes, modelEvents } = useContext(ConnectContext);

  const entity = (namespace ? modelIndexes[namespace] : modelIndexes)?.[name];

  const [data, setData] = useState<T>();

  const doQuery = () => {
    const query = queryFn?.();

    const callback = (d: any) => {
      setData(d);
    };

    if (isPromise(query)) {
      query.then((q) => {
        plugin
          .getPlugin("Model")
          .find(namespace, entity, q)
          .then(callback);
      });
    } else {
      plugin
        .getPlugin("Model")
        .find(namespace, entity, query)
        .then(callback);
    }
  };
  useEffect(() => {
    const key = genModelEventKey(name)
    modelEvents.on(key, doQuery)
    return () => {
      modelEvents.off(key, doQuery)
    }
  }, [])

  useEffect(
    () => {
      if (options?.immediate !== false) {
        doQuery();
      }
    },
    options?.deps || [],
  );

  return data;
}

export function writePrisma<T extends any[]>(namespace: string, name: string) {
  const { plugin, modelIndexes, modelEvents } = useContext(ConnectContext);

  const entity = (namespace ? modelIndexes[namespace] || modelIndexes : modelIndexes)?.[name];

  const key = genModelEventKey(name)

  const create = (obj?: Partial<T[0]>) => {
    const model = plugin.getPlugin("Model")
    return model.create(namespace, entity, { data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const update = (whereId: number, obj?: Partial<T[0]>) => {
    return plugin
      .getPlugin("Model")
      .update(namespace, entity, { where: { id: whereId }, data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const updateMany = (
    where: { id?: number } & Partial<T[0]>,
    obj?: Partial<T[0]>,
  ) => {
    return plugin
      .getPlugin("Model")
      .updateMany(namespace, entity, { where, data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const upsert = (
    where: { id?: number } & Partial<T[0]>,
    obj?: Partial<T[0]>,
  ) => {
    return plugin
      .getPlugin("Model")
      .upsert(namespace, entity, { where, data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const remove = (whereId: number) => {
    return plugin
      .getPlugin("Model")
      .remove(namespace, entity, { where: { id: whereId } }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };

  return {
    create,
    update,
    updateMany,
    upsert,
    remove,
  };
}

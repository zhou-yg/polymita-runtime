import React, { createElement, useContext, useEffect, useState } from "react";
import {
  Plugin,
  IModelIndexesBase,
  IModelQuery,
  isPromise,
  EventEmitter,
} from "@polymita/signal-model";

export const ConnectContext = React.createContext<{
  pkgName?: string
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
  parentModelIndexes?: IModelIndexesBase;
  modelEvents: EventEmitter
}>(null);

const MODEL_UPDATE = 'MODEL_UPDATE'

export const genModelEventKey = (entity: string) => `${MODEL_UPDATE}:${entity}`

export function ConnectProvider(props: {
  pkgName: string
  children?: any;
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
}) {
  const current = useContext(ConnectContext)
  let modelIndexes = current?.modelIndexes || props.modelIndexes
  let parentModelIndexes = current?.parentModelIndexes

  const currentScopeMi = modelIndexes?.[props?.pkgName]
  if (typeof currentScopeMi === 'object') {
    parentModelIndexes = modelIndexes
    modelIndexes = currentScopeMi
  }

  return createElement(
    ConnectContext.Provider,
    {
      value: {
        modelEvents: current?.modelEvents || new EventEmitter(),
        pkgName: props.pkgName || current?.pkgName,
        plugin: props.plugin || current?.plugin,
        modelIndexes,
        parentModelIndexes,
      }
    },
    props.children,
  );
}

export function prisma<T>(
  name: string,
  queryFn?: () => Promise<IModelQuery["query"]> | IModelQuery["query"],
  options?: { immediate?: boolean; deps: any[] },
): T | undefined {
  const { plugin, pkgName: namespace, modelIndexes, modelEvents } = useContext(ConnectContext);

  const entity = modelIndexes?.[name];

  if (!entity || typeof entity === 'object') {
    throw new Error(`[prisma] ${name} entity not found in`);
  }

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

export function writePrisma<T extends any[]>(name: string) {
  const { plugin, modelIndexes, pkgName: namespace, modelEvents } = useContext(ConnectContext);

  const entity = (modelIndexes)?.[name];

  if (!entity || typeof entity === 'object') {
    throw new Error(`[writePrisma] ${name} entity not found in`);
  }

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

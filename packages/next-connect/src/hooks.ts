import React, { createElement, useContext, useEffect, useState } from "react";
import {
  Plugin,
  IModelIndexesBase,
  IModelQuery,
  isPromise,
} from "@polymita/signal-model";
import EE from 'eventemitter3'

export const ConnectContext = React.createContext<{
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
  modelEvents: EE
}>(null);

const MODEL_UPDATE = 'MODEL_UPDATE'

export const genModelEventKey = (entity: string) => `${MODEL_UPDATE}:${entity}`

export const PrismaNamespaceContext = React.createContext<{
  namespace: string;
}>(null);

export function ConnectProvider(props: {
  children: any;
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
}) {
  return createElement(
    ConnectContext.Provider,
    {
      value: {
        ...props,
        modelEvents: new EE,
      }
    },
    props.children,
  );
}
export function PrismaNamespaceProvider(props: {
  children: any;
  namespace: string;
}) {
  return createElement(
    PrismaNamespaceContext.Provider,
    { value: props },
    props.children,
  );
}

export function prisma<T>(
  name: string,
  queryFn?: () => Promise<IModelQuery["query"]> | IModelQuery["query"],
  options?: { immediate?: boolean; deps: any[] },
): T | undefined {
  const { plugin, modelIndexes, modelEvents } = useContext(ConnectContext);
  const { namespace } = useContext(PrismaNamespaceContext);

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
          .find("next-connect", entity, q)
          .then(callback);
      });
    } else {
      plugin
        .getPlugin("Model")
        .find("next-connect", entity, query)
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
      if (options.immediate) {
        doQuery();
      }
    },
    options?.deps || [],
  );

  return data;
}

export function writePrisma<T extends any[]>(name: string) {
  const { plugin, modelIndexes, modelEvents } = useContext(ConnectContext);
  const { namespace } = useContext(PrismaNamespaceContext);

  const entity = (namespace ? modelIndexes[namespace] : modelIndexes)?.[name];

  const key = genModelEventKey(name)

  const create = (obj?: Partial<T[0]>) => {
    return plugin
      .getPlugin("Model")
      .create("next-connect", entity, { data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const update = (whereId: number, obj?: Partial<T[0]>) => {
    return plugin
      .getPlugin("Model")
      .update("next-connect", entity, { where: { id: whereId }, data: obj }).then(res => {
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
      .updateMany("next-connect", entity, { where, data: obj }).then(res => {
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
      .upsert("next-connect", entity, { where, data: obj }).then(res => {
        modelEvents.emit(key)
        return res
      });
  };
  const remove = (whereId: number) => {
    return plugin
      .getPlugin("Model")
      .remove("next-connect", entity, { where: { id: whereId } }).then(res => {
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

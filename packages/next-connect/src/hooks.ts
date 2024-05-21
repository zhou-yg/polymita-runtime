import React, { createElement, useContext, useEffect, useState } from "react";
import {
  Plugin,
  IModelIndexesBase,
  IModelQuery,
  isPromise,
} from "@polymita/signal-model";

export const ConnectContext = React.createContext<{
  plugin: Plugin;
  modelIndexes: IModelIndexesBase;
}>(null);

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
    { value: props },
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
  queryFn: () => Promise<IModelQuery["query"]> | IModelQuery["query"],
  options?: { immediate?: boolean; deps: any[] },
): T | undefined {
  const { plugin, modelIndexes } = useContext(ConnectContext);
  const { namespace } = useContext(PrismaNamespaceContext);

  const entity = (namespace ? modelIndexes[namespace] : modelIndexes)?.[name];

  const [data, setData] = useState<T>();

  const doQuery = () => {
    const query = queryFn();

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
  const { plugin, modelIndexes } = useContext(ConnectContext);
  const { namespace } = useContext(PrismaNamespaceContext);

  const entity = (namespace ? modelIndexes[namespace] : modelIndexes)?.[name];

  const create = (obj?: Partial<T[0]>) => {
    plugin.getPlugin("Model").create("next-connect", entity, { data: obj });
  };
  const update = (whereId: number, obj?: Partial<T[0]>) => {
    plugin
      .getPlugin("Model")
      .update("next-connect", entity, { where: { id: whereId }, data: obj });
  };
  const updateMany = (
    where: { id?: number } & Partial<T[0]>,
    obj?: Partial<T[0]>,
  ) => {
    plugin
      .getPlugin("Model")
      .updateMany("next-connect", entity, { where, data: obj });
  };
  const upsert = (
    where: { id?: number } & Partial<T[0]>,
    obj?: Partial<T[0]>,
  ) => {
    plugin
      .getPlugin("Model")
      .upsert("next-connect", entity, { where, data: obj });
  };
  const remove = (whereId: number) => {
    plugin
      .getPlugin("Model")
      .remove("next-connect", entity, { where: { id: whereId } });
  };

  return {
    create,
    update,
    updateMany,
    upsert,
    remove,
  };
}

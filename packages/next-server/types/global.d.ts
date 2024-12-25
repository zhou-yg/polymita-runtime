declare module 'xx'
declare module '@vitejs/plugin-react'
declare module 'esbuild-plugin-umd-wrapper'

declare module "koa" {
  interface DefaultState {}
  interface DefaultContext {
    prisma: Record<string, {
      findUnique: (...args: any[]) => Promise<any>;
      findFirst: (...args: any[]) => Promise<any>;
      findMany: (...args: any[]) => Promise<any[]>;
      create: (...args: any[]) => Promise<any>;
      createMany: (...args: any[]) => Promise<any>;
      update: (...args: any[]) => Promise<any>;
      updateMany: (...args: any[]) => Promise<any>;
      upsert: (...args: any[]) => Promise<any>;
      delete: (...args: any[]) => Promise<any>;
      deleteMany: (...args: any[]) => Promise<any>;
      count: (...args: any[]) => Promise<number>;
      aggregate: (...args: any[]) => Promise<any>;
      groupBy: (...args: any[]) => Promise<any>;
    }>
  }
}

interface Require {
  (id: string): any;
  resolve: RequireResolve;
  cache: any;
}

declare module 'rollup-plugin-analyzer'

import * as ESTree from 'estree';

declare module 'acorn' {
  type ExtendObject<T> = {
    [K in keyof T]: ExtendNode<T[K]>;
  };
  type WithStartEnd<T> = T extends ESTree.Node | ESTree.Comment
    ? { start: number; end: number }
    : unknown;
  export type ExtendNode<T> = T extends object ? ExtendObject<T> & WithStartEnd<T> : T;
  export function parse(s: string, o: Options): ExtendNode<ESTree.Program>;

  // fix type of Comment property 'type'
  export type AcornComment = Omit<Comment, 'type'> & {
    type: 'Line' | 'Block';
  };
}

type AcornProgram = acorn.ExtendNode<ESTree.Program>
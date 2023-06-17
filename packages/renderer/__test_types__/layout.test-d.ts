import { expectType } from "tsd";
import {
  Assign,
  CommandOP,
  DoPatchCommand,
  FlatPatchCommandsArr,
  PatchLayout,
  PatchLayoutWithCommands,
  PrintLayoutStructTree,
  RemoveItem,
} from "../src/types-layout";

// assign

type AssignV1 = Assign<{ a: 1 }, { b: 2 }>;
type AssignV1Display = PrintLayoutStructTree<AssignV1>;

expectType<AssignV1Display>({ a: 1, b: 2 });

type AssignV2 = Assign<{ a: 0 }, { a: 1 }>;
type AssignV2Display = PrintLayoutStructTree<AssignV2>;
expectType<AssignV2Display>({ a: 1 });

type AssignRV1 = Assign<{ readonly a: 1 }, { readonly b: 2 }>;
type AssignRV1Display = PrintLayoutStructTree<AssignRV1>;

expectType<AssignRV1Display>({ a: 1, b: 2 } as const);

// remove item
type Items = [
  {
    type: "div";
  },
  {
    type: "div";
  },
  {
    type: "p";
  }
];
type RemoveItemV1 = RemoveItem<Items, { type: "div" }>;
expectType<RemoveItemV1>([{ type: "p" }] as readonly [{ type: "p" }]);

type RemoveItemV2 = RemoveItem<Items, { type: "p" }>;
expectType<RemoveItemV2>([{ type: "div" }, { type: "div" }] as readonly [
  { type: "div" },
  { type: "div" }
]);

const readonlyItems = [
  {
    type: "div",
  },
  {
    type: "div",
  },
  {
    type: "p",
  },
] as const;

type ReadonlyItems = typeof readonlyItems;
type RemoveReadonlyItemV1 = RemoveItem<ReadonlyItems, { type: "div" }>;
expectType<RemoveReadonlyItemV1>([{ type: "p" }] as const);

// do command
type MyLayoutTree = {
  type: "div";
  children: [
    {
      type: "div";
    }
  ];
};

type DoPatchCommandV1 = DoPatchCommand<
  MyLayoutTree,
  { op: CommandOP.addChild; parent: []; child: { type: "p" } }
>;
type DoPatchCommandV1Display = PrintLayoutStructTree<DoPatchCommandV1>;
expectType<DoPatchCommandV1Display>({
  type: "div",
  children: [{ type: "div" }, { type: "p" }],
} as {
  type: "div";
  readonly children: readonly [{ type: "div" }, { type: "p" }];
});

type DoPatchCommandV2 = DoPatchCommand<
  MyLayoutTree,
  { op: CommandOP.removeChild; parent: []; child: { type: "div" } }
>;
type DoPatchCommandV2Display = PrintLayoutStructTree<DoPatchCommandV2>;
expectType<DoPatchCommandV2Display>({
  type: "div",
  children: [],
} as {
  type: "div";
  readonly children: readonly [];
});

type DoPatchCommandV3 = DoPatchCommand<
  MyLayoutTree,
  { op: CommandOP.replaceChild; parent: []; child: { type: "p" } }
>;
type DoPatchCommandV3Display = PrintLayoutStructTree<DoPatchCommandV3>;
expectType<DoPatchCommandV3Display>({
  type: "p",
});

const myReadonlyLayoutTree = {
  type: "div",
  children: [
    {
      type: "div",
    },
  ],
} as const;

type MyReadonlyLayoutTree = typeof myReadonlyLayoutTree;

const addOp = {
  op: CommandOP.addChild,
  parent: [],
  child: { type: "p" },
} as const;
type ReadonlyAddOp = typeof addOp;
type DoPatchCommandReadonlyV1 = DoPatchCommand<
  MyReadonlyLayoutTree,
  ReadonlyAddOp
>;
type DoPatchCommandReadonlyV1Display =
  PrintLayoutStructTree<DoPatchCommandReadonlyV1>;
expectType<DoPatchCommandReadonlyV1Display>({
  type: "div",
  children: [{ type: "div" }, { type: "p" }],
} as const);

// key point: PatchLayout

type PatchLayoutV1 = PatchLayout<
  MyLayoutTree,
  {
    op: CommandOP.addChild;
    parent: ["div"];
    child: { type: "div"; children: [] };
  }
>;
type PatchLayoutV1Display = PrintLayoutStructTree<PatchLayoutV1>;
expectType<PatchLayoutV1Display>({
  type: "div",
  children: [
    {
      type: "div",
    },
    {
      type: "div",
      children: [],
    },
  ],
} as {
  type: "div";
  readonly children: readonly [
    {
      type: "div";
    },
    {
      type: "div";
      children: [];
    }
  ];
});

type PatchLayoutV2 = PatchLayout<
  PatchLayoutV1,
  { op: CommandOP.addChild; parent: ["div", "div"]; child: { type: "p" } }
>;
type PatchLayoutV2Display = PrintLayoutStructTree<PatchLayoutV2>;
expectType<PatchLayoutV2Display>({
  type: "div",
  children: [
    {
      type: "div",
      children: [
        {
          type: "p",
        },
      ],
    },
    {
      type: "div",
      children: [
        {
          type: "p",
        },
      ],
    },
  ],
} as {
  type: "div";
  readonly children: readonly [
    {
      type: "div";
      readonly children: readonly [
        {
          type: "p";
        }
      ];
    },
    {
      type: "div";
      readonly children: readonly [
        {
          type: "p";
        }
      ];
    }
  ];
});

type PatchLayoutV3 = PatchLayout<
  PatchLayoutV2,
  { op: CommandOP.removeChild; parent: ["div", "div"]; child: { type: "p" } }
>;
type PatchLayoutV3Display = PrintLayoutStructTree<PatchLayoutV3>;
expectType<PatchLayoutV3Display>({
  type: "div",
  children: [
    {
      type: "div",
      children: [],
    },
    {
      type: "div",
      children: [],
    },
  ],
} as {
  type: "div";
  readonly children: readonly [
    {
      type: "div";
      readonly children: readonly [];
    },
    {
      type: "div";
      readonly children: readonly [];
    }
  ];
});

type PatchLayoutV4 = PatchLayout<
  PatchLayoutV3,
  { op: CommandOP.replaceChild; parent: ["div", "div"]; child: { type: "p" } }
>;
type PatchLayoutV4Display = PrintLayoutStructTree<PatchLayoutV4>;
expectType<PatchLayoutV4Display>({
  type: "div",
  children: [
    {
      type: "p",
    },
    {
      type: "p",
    },
  ],
} as {
  type: "div";
  readonly children: readonly [
    {
      type: "p";
    },
    {
      type: "p";
    }
  ];
});

const patchAddCommandValue = {
  op: CommandOP.addChild,
  parent: ["div"],
  child: { type: "div", children: [] },
} as const;
type PatchAddCommand = typeof patchAddCommandValue;

type PatchLayoutReadonlyV1 = PatchLayout<MyReadonlyLayoutTree, PatchAddCommand>;
type PatchLayoutReadonlyV1Display =
  PrintLayoutStructTree<PatchLayoutReadonlyV1>;
expectType<PatchLayoutReadonlyV1Display>({
  type: "div",
  children: [
    {
      type: "div",
    },
    {
      type: "div",
      children: [],
    },
  ],
} as const);

// patch layout with command list

const patchAddCommandValues = [
  {
    op: CommandOP.addChild,
    parent: ["div"],
    child: { type: "p", children: [] },
  },
  {
    op: CommandOP.addChild,
    parent: ["div", "p"],
    child: { type: "span", children: [] },
  },
] as const;

type PatchAddCommandArr = typeof patchAddCommandValues;

const myLayoutTreeInArr = {
  type: "div",
  children: [
    {
      type: "p",
    },
  ],
} as const;
type MyLayoutTreeInArr = typeof myLayoutTreeInArr;

type PatchLayoutWithCommandListV1 = PatchLayoutWithCommands<
  MyLayoutTreeInArr,
  PatchAddCommandArr
>;
type PatchLayoutWithCommandListV1Display =
  PrintLayoutStructTree<PatchLayoutWithCommandListV1>;

expectType<PatchLayoutWithCommandListV1Display>({
  type: "div",
  children: [
    {
      type: "p",
      children: [
        {
          type: "span",
          children: [],
        },
      ],
    },
    {
      type: "p",
      children: [
        {
          type: "span",
          children: [],
        },
      ],
    },
  ],
} as const);

// flat commands array
type PatchArrFromTestCaseModules = [
  [],
  [
    {
      readonly op: CommandOP.addChild;
      readonly parent: readonly ["div"];
      readonly child: {
        readonly type: "p";
        readonly children: readonly ["123"];
      };
    }
  ],
  [
    {
      readonly op: CommandOP.addChild;
      readonly parent: readonly ["div", "p"];
      readonly child: {
        readonly type: "text";
        readonly children: readonly ["456"];
      };
    }
  ]
];
type FlatArray = FlatPatchCommandsArr<PatchArrFromTestCaseModules>;
expectType<FlatArray>([
  {
    op: CommandOP.addChild,
    parent: ["div"],
    child: {
      type: "p",
      children: ["123"],
    },
  },
  {
    op: CommandOP.addChild,
    parent: ["div", "p"],
    child: {
      type: "text",
      children: ["456"],
    },
  },
] as const);

// flat two dimensional array patch commands

const patchAddCommandValues2Arr = [
  [],
  [
    {
      op: CommandOP.addChild,
      parent: ["div"],
      child: { type: "p", children: [] },
    },
    {
      op: CommandOP.addChild,
      parent: ["div", "p"],
      child: { type: "span", children: [] },
    },
  ],
  [
    {
      op: CommandOP.removeChild,
      parent: ["div", "p"],
      child: { type: "span" },
    },
  ],
] as const;

type PatchAddCommand2Arr = typeof patchAddCommandValues2Arr;

type FlatCmdArr = FlatPatchCommandsArr<PatchAddCommand2Arr>;
type FlatArrDisplay = PrintLayoutStructTree<FlatCmdArr>;

type PatchLayoutWithCommandListV12Arr = PatchLayoutWithCommands<
  MyLayoutTreeInArr,
  FlatCmdArr
>;
type PatchLayoutWithCommandListV12ArrDisplay =
  PrintLayoutStructTree<PatchLayoutWithCommandListV12Arr>;

expectType<PatchLayoutWithCommandListV12ArrDisplay>({
  type: "div",
  children: [
    {
      type: "p",
      children: [],
    },
    {
      type: "p",
      children: [],
    },
  ],
} as const);

type BaseFPC3Arr = [
  {
    readonly op: CommandOP.addChild;
    readonly parent: readonly ["div"];
    readonly child: {
      readonly type: "p";
      readonly value: "123";
    };
  },
  {
    readonly op: CommandOP.addChild;
    readonly parent: readonly ["div", "p"];
    readonly child: {
      readonly type: "text";
      readonly value: "hello";
    };
  }
];
type BaseBaseL3 = {
  readonly type: "div";
  children: [
    {
      readonly type: "div";
    }
  ];
};

type FL = PatchLayoutWithCommands<BaseBaseL3, BaseFPC3Arr>;
type FLDisplay = PrintLayoutStructTree<FL>;

expectType<FLDisplay>({
  type: "div",
  children: [
    {
      type: "div",
    },
    {
      type: "p",
      value: "123",
      children: [
        {
          type: "text",
          value: "hello",
        },
      ],
    },
  ],
} as const);

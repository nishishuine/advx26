import { describe, expect, it } from "vitest";
import {
  getCollapsedEdgesForLayer,
  GraphValidationError,
  validateBuildGuide,
  validateWorldCase,
} from "./graph";
import type {
  BuildGuide,
  GraphNode,
  WorldCase,
} from "./types";

const root: GraphNode = {
  id: "root",
  parentId: null,
  label: "测试对象",
  summary: "根节点",
  domain: "object",
  level: 0,
  function: "用于测试",
  status: "verified",
  canExpand: true,
  buildability: "safe",
  source: "测试夹具",
};

const createCase = (): WorldCase => ({
  id: "test-case",
  title: "测试案例",
  shortTitle: "测试",
  eyebrow: "OBJECT / TEST",
  description: "测试案例描述",
  domain: "object",
  rootNodeId: "root",
  accent: "#b8f36b",
  accentSoft: "#e8f7d2",
  keyInsight: "测试关系",
  nodes: [
    root,
    {
      ...root,
      id: "child-a",
      parentId: "root",
      label: "A",
      level: 1,
      canExpand: false,
    },
    {
      ...root,
      id: "child-b",
      parentId: "root",
      label: "B",
      level: 1,
      canExpand: false,
    },
  ],
  edges: [
    {
      id: "a-controls-b",
      source: "child-a",
      target: "child-b",
      relation: "controls",
      explanation: "A 根据输入决定 B 的动作。",
      views: ["signal", "causal"],
    },
  ],
});

describe("validateWorldCase", () => {
  it("接受每层不超过 8 个节点的有效案例", () => {
    expect(validateWorldCase(createCase()).id).toBe("test-case");
  });

  it("父节点拥有超过 8 个子节点时抛出错误", () => {
    const worldCase = createCase();
    worldCase.nodes = [
      root,
      ...Array.from({ length: 9 }, (_, index) => ({
        ...root,
        id: `child-${index}`,
        parentId: "root",
        label: `节点 ${index}`,
        level: 1,
        canExpand: false,
      })),
    ];

    expect(() => validateWorldCase(worldCase)).toThrow(GraphValidationError);
    expect(() => validateWorldCase(worldCase)).toThrow("超过 8 个上限");
  });

  it("拒绝不属于物体领域的关系类型", () => {
    const worldCase = createCase();
    worldCase.edges[0].relation = "exchanges";

    expect(() => validateWorldCase(worldCase)).toThrow(
      "object 案例不允许关系 exchanges",
    );
  });

  it("拒绝缺少解释的关系", () => {
    const worldCase = createCase();
    worldCase.edges[0].explanation = " ";

    expect(() => validateWorldCase(worldCase)).toThrow("缺少解释");
  });
});

describe("getCollapsedEdgesForLayer", () => {
  it("投影到当前分支时保留每条底层关系及其真实端点", () => {
    const worldCase = createCase();
    const childA = worldCase.nodes.find((node) => node.id === "child-a")!;
    const childB = worldCase.nodes.find((node) => node.id === "child-b")!;
    childA.canExpand = true;
    childB.canExpand = true;
    worldCase.nodes.push(
      {
        ...root,
        id: "deep-a-1",
        parentId: "child-a",
        label: "A1",
        level: 2,
        canExpand: false,
      },
      {
        ...root,
        id: "deep-a-2",
        parentId: "child-a",
        label: "A2",
        level: 2,
        canExpand: false,
      },
      {
        ...root,
        id: "deep-b-1",
        parentId: "child-b",
        label: "B1",
        level: 2,
        canExpand: false,
      },
      {
        ...root,
        id: "deep-b-2",
        parentId: "child-b",
        label: "B2",
        level: 2,
        canExpand: false,
      },
    );
    worldCase.edges = [
      {
        id: "deep-link-1",
        source: "deep-a-1",
        target: "deep-b-1",
        relation: "controls",
        explanation: "第一条底层关系",
        views: ["signal"],
      },
      {
        id: "deep-link-2",
        source: "deep-a-2",
        target: "deep-b-2",
        relation: "controls",
        explanation: "第二条底层关系",
        views: ["signal"],
      },
    ];

    const projected = getCollapsedEdgesForLayer(
      worldCase,
      "root",
      "signal",
    );

    expect(projected).toHaveLength(2);
    expect(projected.every((edge) => edge.source === "child-a")).toBe(true);
    expect(projected.every((edge) => edge.target === "child-b")).toBe(true);
    expect(projected.map((edge) => edge.origin)).toEqual([
      { id: "deep-link-1", source: "deep-a-1", target: "deep-b-1" },
      { id: "deep-link-2", source: "deep-a-2", target: "deep-b-2" },
    ]);
  });
});

describe("validateBuildGuide", () => {
  it("要求每个重建步骤具备前置条件、验收和排错", () => {
    const guide = {
      caseId: "test-case",
      title: "测试制作",
      summary: "测试",
      difficulty: "入门",
      totalTime: "30 分钟",
      budget: "¥10",
      tools: ["螺丝刀"],
      programFlow: ["输入", "输出"],
      parts: [],
      connections: [],
      steps: [
        {
          id: "step-1",
          phase: "准备",
          title: "检查",
          purpose: "确认环境",
          prerequisites: ["断电"],
          instructions: ["检查零件"],
          successCriteria: ["零件齐全"],
          troubleshooting: ["重新对照清单"],
          duration: "5 分钟",
        },
      ],
      safety: ["只使用低压电源"],
    } satisfies BuildGuide;

    expect(validateBuildGuide(guide)).toBe(guide);

    expect(() =>
      validateBuildGuide({
        ...guide,
        steps: [{ ...guide.steps[0], successCriteria: [] }],
      }),
    ).toThrow("缺少验收标准");
  });
});

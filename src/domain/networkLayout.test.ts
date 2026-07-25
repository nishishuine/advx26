import { describe, expect, it } from "vitest";
import {
  createCaseLayout,
  createNetworkLayout,
  createWorkflowLayout,
  resolveLayoutMode,
} from "./networkLayout";

const nodeIds = Array.from({ length: 8 }, (_, index) => `node-${index}`);
const ringEdges = nodeIds.map((nodeId, index) => ({
  source: nodeId,
  target: nodeIds[(index + 1) % nodeIds.length],
}));

describe("createNetworkLayout", () => {
  it("为相同拓扑生成稳定且位于画布内的坐标", () => {
    const first = createNetworkLayout(nodeIds, ringEdges, 1040, 610);
    const second = createNetworkLayout(nodeIds, ringEdges, 1040, 610);

    expect(Array.from(first.entries())).toEqual(Array.from(second.entries()));
    expect(first.size).toBe(8);
    first.forEach((point) => {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1040);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(610);
    });
  });

  it("节点之间保留足够的点击与标签空间", () => {
    const layout = createNetworkLayout(nodeIds, ringEdges);
    const points = Array.from(layout.values());
    const distances: number[] = [];

    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        distances.push(
          Math.hypot(
            points[right].x - points[left].x,
            points[right].y - points[left].y,
          ),
        );
      }
    }

    expect(Math.min(...distances)).toBeGreaterThan(88);
  });

  it("正确处理空图、单节点与孤立节点", () => {
    expect(createNetworkLayout([], []).size).toBe(0);
    expect(createNetworkLayout(["only"], []).get("only")).toEqual({
      x: 520,
      y: 305,
    });

    const isolated = createNetworkLayout(["a", "b", "c"], []);
    expect(isolated.size).toBe(3);
    expect(new Set(Array.from(isolated.values()).map((point) => point.x)).size)
      .toBeGreaterThan(1);
  });
});

describe("createWorkflowLayout", () => {
  const workflowNodes = [
    { id: "start", index: 1, flowPosition: { column: 0, lane: 1 } },
    { id: "top", index: 2, flowPosition: { column: 1, lane: 0 } },
    { id: "middle", index: 3, flowPosition: { column: 1, lane: 1 } },
    { id: "bottom", index: 4, flowPosition: { column: 1, lane: 2 } },
    { id: "merge", index: 5, flowPosition: { column: 2, lane: 1 } },
    { id: "done", index: 6, flowPosition: { column: 3, lane: 1 } },
  ];

  it("把并行分支放在同列，并在右侧汇合", () => {
    const layout = createWorkflowLayout(workflowNodes);
    const top = layout.get("top")!;
    const middle = layout.get("middle")!;
    const bottom = layout.get("bottom")!;
    const merge = layout.get("merge")!;
    const done = layout.get("done")!;

    expect(top.x).toBe(middle.x);
    expect(middle.x).toBe(bottom.x);
    expect(top.y).toBeLessThan(middle.y);
    expect(middle.y).toBeLessThan(bottom.y);
    expect(middle.y - top.y).toBeGreaterThan(72);
    expect(merge.x).toBeGreaterThan(top.x);
    expect(merge.y).toBeGreaterThan(top.y);
    expect(merge.y).toBeLessThan(bottom.y);
    expect(done.x).toBeGreaterThan(merge.x);
  });

  it("没有预设坐标时仍按 index 从左到右排列", () => {
    const layout = createWorkflowLayout([
      { id: "third", index: 3 },
      { id: "first", index: 1 },
      { id: "second", index: 2 },
    ]);

    expect(layout.get("first")!.x).toBeLessThan(layout.get("second")!.x);
    expect(layout.get("second")!.x).toBeLessThan(layout.get("third")!.x);
    expect(layout.get("first")!.y).toBe(layout.get("third")!.y);
  });

  it("根据连接自动推导分叉、并行与汇合", () => {
    const nodes = [
      { id: "start", index: 1 },
      { id: "branch-a", index: 2 },
      { id: "branch-b", index: 3 },
      { id: "merge", index: 4 },
      { id: "done", index: 5 },
    ];
    const edges = [
      { source: "start", target: "branch-a" },
      { source: "start", target: "branch-b" },
      { source: "branch-a", target: "merge" },
      { source: "branch-b", target: "merge" },
      { source: "merge", target: "done" },
    ];
    const layout = createWorkflowLayout(nodes, edges);
    const reversed = createWorkflowLayout(nodes, [...edges].reverse());

    expect(layout.get("branch-a")!.x).toBe(layout.get("branch-b")!.x);
    expect(layout.get("branch-a")!.y).toBeLessThan(
      layout.get("branch-b")!.y,
    );
    expect(layout.get("merge")!.x).toBeGreaterThan(
      layout.get("branch-a")!.x,
    );
    expect(layout.get("done")!.x).toBeGreaterThan(layout.get("merge")!.x);
    expect(Array.from(layout.entries())).toEqual(
      Array.from(reversed.entries()),
    );
  });

  it("结果稳定，并保持普通案例继续使用原网状布局", () => {
    const first = createWorkflowLayout(workflowNodes);
    const second = createWorkflowLayout([...workflowNodes].reverse());

    expect(Array.from(first.entries())).toEqual(Array.from(second.entries()));
    expect(resolveLayoutMode({ mode: "workflow" })).toBe("workflow");
    expect(resolveLayoutMode(undefined)).toBe("network");

    const nodes = nodeIds.map((id, index) => ({ id, index }));
    expect(
      Array.from(createCaseLayout("network", nodes, ringEdges).entries()),
    ).toEqual(
      Array.from(createNetworkLayout(nodeIds, ringEdges).entries()),
    );
  });
});

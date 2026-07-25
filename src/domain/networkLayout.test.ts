import { describe, expect, it } from "vitest";
import { createNetworkLayout } from "./networkLayout";

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

import { describe, expect, it } from "vitest";
import { StaticGraphRepository } from "./repository";

describe("StaticGraphRepository", () => {
  const repository = new StaticGraphRepository();

  it("读取两个静态案例并保持案例摘要可用", async () => {
    const cases = await repository.listCases();

    expect(cases).toHaveLength(2);
    expect(cases.map((worldCase) => worldCase.domain).sort()).toEqual([
      "life",
      "object",
    ]);
  });

  it("能够按 ID 读取案例和节点", async () => {
    const worldCase = await repository.getCase("orange-pi-first-boot");
    const root = await repository.getNode(
      worldCase.id,
      worldCase.rootNodeId,
    );
    const topNodes = worldCase.nodes
      .filter((node) => node.parentId === root.id)
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0));

    expect(root.parentId).toBeNull();
    expect(topNodes).toHaveLength(5);
    expect(topNodes.map((node) => node.id)).toEqual([
      "windows-workbench",
      "boot-storage",
      "orange-pi-host",
      "network-access",
      "web-result",
    ]);
    expect(
      topNodes.every(
        (node) =>
          worldCase.nodes.filter((child) => child.parentId === node.id)
            .length >= 3,
      ),
    ).toBe(true);
    expect(
      worldCase.nodes.some(
        (node) =>
          node.level === 2 &&
          node.canExpand &&
          worldCase.nodes.some((child) => child.parentId === node.id),
      ),
    ).toBe(true);
    expect(worldCase.nodes.some((node) => node.kind === "code")).toBe(true);
  });

  it("Orange Pi 五个主要部分按真实链路从左向右推进", async () => {
    const worldCase = await repository.getCase("orange-pi-first-boot");
    const topNodes = worldCase.nodes
      .filter((node) => node.parentId === worldCase.rootNodeId)
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
    const columns = new Map(
      topNodes.map((node) => [node.id, node.flowPosition!.column]),
    );
    const topIds = new Set(topNodes.map((node) => node.id));
    const topStructureEdges = worldCase.edges.filter(
      (edge) =>
        edge.views.includes("structure") &&
        topIds.has(edge.source) &&
        topIds.has(edge.target),
    );

    expect(worldCase.layout?.mode).toBe("workflow");
    expect(topNodes.map((node) => node.flowPosition?.column)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(
      topStructureEdges.map((edge) => [edge.source, edge.target]),
    ).toEqual([
      ["windows-workbench", "boot-storage"],
      ["boot-storage", "orange-pi-host"],
      ["orange-pi-host", "network-access"],
      ["network-access", "web-result"],
    ]);
    expect(
      topStructureEdges.every(
        (edge) =>
          edge.flowStyle === "primary" && edge.explanation.length > 35,
      ),
    ).toBe(true);
    topStructureEdges.forEach((edge) => {
      expect(columns.get(edge.source)!).toBeLessThan(
        columns.get(edge.target)!,
      );
    });
  });

  it("只为物体预置案例提供重建指南", async () => {
    await expect(
      repository.getBuildGuide("orange-pi-first-boot"),
    ).resolves.not.toBeNull();
    await expect(repository.getBuildGuide("leaf")).resolves.toBeNull();
  });
});

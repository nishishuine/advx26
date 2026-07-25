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

    expect(root.parentId).toBeNull();
    expect(worldCase.nodes.length).toBeGreaterThan(8);
    expect(worldCase.nodes.filter((node) => node.parentId === root.id)).toHaveLength(
      8,
    );
    expect(worldCase.nodes.some((node) => node.kind === "code")).toBe(true);
  });

  it("只为物体预置案例提供重建指南", async () => {
    await expect(
      repository.getBuildGuide("orange-pi-first-boot"),
    ).resolves.not.toBeNull();
    await expect(repository.getBuildGuide("leaf")).resolves.toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { StaticGraphRepository } from "./repository";

describe("StaticGraphRepository", () => {
  const repository = new StaticGraphRepository();

  it("只读取当前 Orange Pi 静态案例", async () => {
    const cases = await repository.listCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]?.id).toBe("orange-pi-first-boot");
    expect(cases[0]?.domain).toBe("object");
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

  it("为当前 Orange Pi 案例提供打造指南", async () => {
    await expect(
      repository.getBuildGuide("orange-pi-first-boot"),
    ).resolves.not.toBeNull();
  });

  it("局域网层保留地址与 SSH 服务汇入远程终端的真实关系", async () => {
    const worldCase = await repository.getCase("orange-pi-first-boot");
    const childrenOf = (parentId: string) =>
      worldCase.nodes
        .filter((node) => node.parentId === parentId)
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
        .map((node) => node.id);

    expect(childrenOf("network-access")).toEqual([
      "ethernet-router",
      "dhcp-address",
      "ssh-service",
      "remote-shell",
    ]);
    expect(childrenOf("remote-shell")).toEqual([
      "ssh-command",
      "host-fingerprint",
      "login-shell",
    ]);

    const networkEdges = worldCase.edges
      .filter((edge) =>
        [
          "router-to-address",
          "address-to-shell",
          "ssh-to-shell",
          "ssh-to-fingerprint",
          "fingerprint-to-login",
        ].includes(edge.id),
      )
      .map((edge) => [edge.source, edge.target]);

    expect(networkEdges).toEqual([
      ["ethernet-router", "dhcp-address"],
      ["dhcp-address", "remote-shell"],
      ["ssh-service", "remote-shell"],
      ["ssh-command", "host-fingerprint"],
      ["host-fingerprint", "login-shell"],
    ]);
  });

  it("找 IP 与首次 SSH 教程包含主路线、备用分支和可核对输出", async () => {
    const guide = await repository.getBuildGuide("orange-pi-first-boot");
    expect(guide).not.toBeNull();

    const findIndex =
      guide?.steps.findIndex((step) => step.id === "find-ip") ?? -1;
    const sshIndex =
      guide?.steps.findIndex((step) => step.id === "first-ssh") ?? -1;
    expect(findIndex).toBeGreaterThanOrEqual(0);
    expect(sshIndex).toBe(findIndex + 1);

    const findIp = guide!.steps[findIndex];
    const firstSsh = guide!.steps[sshIndex];
    const findText = JSON.stringify(findIp);
    const sshText = JSON.stringify(firstSsh);

    expect(findIp.deviceState).toBeTruthy();
    expect(findIp.mentalModel).toContain("路由器");
    expect(findText).toContain("ipconfig");
    expect(findText).toContain("Test-NetConnection {{IP}} -Port 22");
    expect(findText).toContain("hostname -I");
    expect(findText).toContain("TcpTestSucceeded : True");

    expect(firstSsh.deviceState).toBeTruthy();
    expect(firstSsh.mentalModel).toContain("PowerShell");
    expect(sshText).toContain("ssh -V");
    expect(sshText).toContain("ssh root@{{IP}}");
    expect(sshText).toContain("1234");
    expect(sshText).toContain("ssh {{USER}}@{{IP}}");
    expect(sshText).toContain("whoami");
    expect(sshText).toContain("分支 B");
  });
});

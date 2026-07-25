import { getAllowedRelations } from "./relations";
import type {
  BuildGuide,
  GraphEdge,
  GraphNode,
  ViewType,
  WorldCase,
} from "./types";

export class GraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphValidationError";
  }
}

export function getChildren(worldCase: WorldCase, parentId: string): GraphNode[] {
  return worldCase.nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

export function getNode(worldCase: WorldCase, nodeId: string): GraphNode {
  const node = worldCase.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new GraphValidationError(
      `案例 ${worldCase.id} 中不存在节点 ${nodeId}`,
    );
  }
  return node;
}

export function getBreadcrumbs(
  worldCase: WorldCase,
  nodeId: string,
): GraphNode[] {
  const path: GraphNode[] = [];
  let current: GraphNode | undefined = getNode(worldCase, nodeId);
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) {
      throw new GraphValidationError(`节点 ${current.id} 存在循环父级`);
    }
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId
      ? worldCase.nodes.find((node) => node.id === current?.parentId)
      : undefined;
  }

  return path;
}

export function getEdgesForNodes(
  worldCase: WorldCase,
  nodeIds: Set<string>,
): GraphEdge[] {
  return worldCase.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );
}

/**
 * 将更深层节点之间的关系折叠到当前层的直接子节点上。
 * 例如“距离传感器 → 控制器”会在根层表现为“感知系统 → 控制系统”，
 * 页面因此无需了解任何案例专有节点。
 */
export function getCollapsedEdgesForLayer(
  worldCase: WorldCase,
  parentId: string,
  view: ViewType,
): GraphEdge[] {
  const children = getChildren(worldCase, parentId);
  const childIds = new Set(children.map((node) => node.id));
  const nodeMap = new Map(worldCase.nodes.map((node) => [node.id, node]));

  const resolveBranch = (nodeId: string): string | null => {
    let current = nodeMap.get(nodeId);
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) {
        throw new GraphValidationError(`节点 ${current.id} 存在循环父级`);
      }
      visited.add(current.id);

      if (childIds.has(current.id)) return current.id;
      if (!current.parentId || current.id === parentId) return null;
      current = nodeMap.get(current.parentId);
    }

    return null;
  };

  const collapsed: GraphEdge[] = [];

  for (const edge of worldCase.edges) {
    if (!edge.views.includes(view)) continue;
    const source = resolveBranch(edge.source);
    const target = resolveBranch(edge.target);
    if (!source || !target || source === target) continue;

    collapsed.push({
      ...edge,
      id: `collapsed:${parentId}:${edge.id}`,
      source,
      target,
      origin: edge.origin ?? {
        id: edge.id,
        source: edge.source,
        target: edge.target,
      },
    });
  }

  return collapsed;
}

export function validateWorldCase(worldCase: WorldCase): WorldCase {
  const ids = new Set<string>();
  const allowedRelations = new Set(getAllowedRelations(worldCase.domain));
  const allowedViews = new Set<ViewType>([
    "structure",
    "signal",
    "energy",
    "matter",
    "code",
    "causal",
  ]);

  for (const node of worldCase.nodes) {
    if (ids.has(node.id)) {
      throw new GraphValidationError(`发现重复节点 ID：${node.id}`);
    }
    ids.add(node.id);
    if (node.domain !== worldCase.domain) {
      throw new GraphValidationError(`节点 ${node.id} 的领域与案例不一致`);
    }
    if (
      node.flowPosition &&
      (!Number.isFinite(node.flowPosition.column) ||
        !Number.isFinite(node.flowPosition.lane) ||
        node.flowPosition.column < 0 ||
        node.flowPosition.lane < 0)
    ) {
      throw new GraphValidationError(`节点 ${node.id} 的流程坐标无效`);
    }
  }

  if (!ids.has(worldCase.rootNodeId)) {
    throw new GraphValidationError(`案例 ${worldCase.id} 缺少根节点`);
  }

  const root = worldCase.nodes.find((node) => node.id === worldCase.rootNodeId);
  if (!root || root.parentId !== null || root.level !== 0) {
    throw new GraphValidationError(
      `案例 ${worldCase.id} 的根节点必须位于 L0 且没有父级`,
    );
  }

  const nodeMap = new Map(worldCase.nodes.map((node) => [node.id, node]));

  const counts = new Map<string, number>();
  const siblingGroups = new Map<string, GraphNode[]>();
  for (const node of worldCase.nodes) {
    if (!node.parentId) continue;
    if (!ids.has(node.parentId)) {
      throw new GraphValidationError(
        `节点 ${node.id} 引用了不存在的父级 ${node.parentId}`,
      );
    }
    const parent = nodeMap.get(node.parentId);
    if (parent && node.level !== parent.level + 1) {
      throw new GraphValidationError(
        `节点 ${node.id} 的层级应为 ${parent.level + 1}`,
      );
    }
    counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    siblingGroups.set(node.parentId, [
      ...(siblingGroups.get(node.parentId) ?? []),
      node,
    ]);
  }

  if (worldCase.layout?.mode === "workflow") {
    siblingGroups.forEach((siblings, parentId) => {
      const positioned = siblings.filter((node) => node.flowPosition);
      if (positioned.length > 0 && positioned.length !== siblings.length) {
        throw new GraphValidationError(
          `流程层 ${parentId} 只能为全部节点设置坐标，不能只设置一部分`,
        );
      }

      const occupied = new Set<string>();
      positioned.forEach((node) => {
        const key = `${node.flowPosition!.column}:${node.flowPosition!.lane}`;
        if (occupied.has(key)) {
          throw new GraphValidationError(
            `流程层 ${parentId} 存在重复坐标 ${key}`,
          );
        }
        occupied.add(key);
      });
    });
  }

  for (const node of worldCase.nodes) {
    const childCount = counts.get(node.id) ?? 0;
    if (node.canExpand !== (childCount > 0)) {
      throw new GraphValidationError(
        `节点 ${node.id} 的 canExpand 与实际子节点不一致`,
      );
    }

    let current: GraphNode | undefined = node;
    const visited = new Set<string>();
    while (current && current.id !== worldCase.rootNodeId) {
      if (visited.has(current.id)) {
        throw new GraphValidationError(`节点 ${current.id} 存在循环父级`);
      }
      visited.add(current.id);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    if (!current) {
      throw new GraphValidationError(`节点 ${node.id} 无法追溯到根节点`);
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of worldCase.edges) {
    if (edgeIds.has(edge.id)) {
      throw new GraphValidationError(`发现重复关系 ID：${edge.id}`);
    }
    edgeIds.add(edge.id);
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      throw new GraphValidationError(`关系 ${edge.id} 引用了不存在的节点`);
    }
    if (!allowedRelations.has(edge.relation)) {
      throw new GraphValidationError(
        `${worldCase.domain} 案例不允许关系 ${edge.relation}`,
      );
    }
    if (!edge.explanation.trim()) {
      throw new GraphValidationError(`关系 ${edge.id} 缺少解释`);
    }
    if (edge.views.length === 0) {
      throw new GraphValidationError(`关系 ${edge.id} 缺少视图`);
    }
    if (edge.views.some((view) => !allowedViews.has(view))) {
      throw new GraphValidationError(`关系 ${edge.id} 使用了非法视图`);
    }
  }

  return worldCase;
}

export function validateBuildGuide(guide: BuildGuide): BuildGuide {
  for (const step of guide.steps) {
    if (!Array.isArray(step.prerequisites) || step.prerequisites.length === 0) {
      throw new GraphValidationError(`重建步骤 ${step.id} 缺少前置条件`);
    }
    if (
      !Array.isArray(step.successCriteria) ||
      step.successCriteria.length === 0
    ) {
      throw new GraphValidationError(`重建步骤 ${step.id} 缺少验收标准`);
    }
    if (
      !Array.isArray(step.troubleshooting) ||
      step.troubleshooting.length === 0
    ) {
      throw new GraphValidationError(`重建步骤 ${step.id} 缺少排错路径`);
    }
  }

  return guide;
}

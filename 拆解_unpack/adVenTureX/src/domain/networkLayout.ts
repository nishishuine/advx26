import type { GraphEdge } from "./types";

export type NetworkPoint = {
  x: number;
  y: number;
};

export type LayoutMode = "network" | "workflow";

export type LayoutNode = {
  id: string;
  index?: number;
  flowPosition?: {
    column: number;
    lane: number;
  };
};

type MovingPoint = NetworkPoint & {
  vx: number;
  vy: number;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 为每层不超过 8 个节点生成稳定、可复现的小型力导向布局。
 * 它不依赖随机数，因此切换详情或刷新页面时节点不会跳动。
 */
export function createNetworkLayout(
  nodeIds: string[],
  edges: Pick<GraphEdge, "source" | "target">[],
  width = 1040,
  height = 610,
): Map<string, NetworkPoint> {
  const result = new Map<string, NetworkPoint>();
  if (nodeIds.length === 0) return result;

  const centerX = width / 2;
  const centerY = height / 2;
  if (nodeIds.length === 1) {
    result.set(nodeIds[0], { x: centerX, y: centerY });
    return result;
  }

  const radiusX = Math.min(width * 0.32, 330);
  const radiusY = Math.min(height * 0.3, 190);
  const points: MovingPoint[] = nodeIds.map((id, index) => {
    const seed = hashString(id);
    const jitter = ((seed % 1000) / 1000 - 0.5) * 0.58;
    const angle =
      -Math.PI / 2 + (index * Math.PI * 2) / nodeIds.length + jitter;

    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      vx: 0,
      vy: 0,
    };
  });

  const indexById = new Map(nodeIds.map((id, index) => [id, index]));
  const links = edges.flatMap((edge) => {
    const source = indexById.get(edge.source);
    const target = indexById.get(edge.target);
    return source === undefined || target === undefined || source === target
      ? []
      : [{ source, target }];
  });

  const marginX = 105;
  const marginY = 72;
  const preferredDistance = nodeIds.length <= 4 ? 250 : 205;

  for (let iteration = 0; iteration < 180; iteration += 1) {
    const forces = points.map(() => ({ x: 0, y: 0 }));

    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const dx = points[right].x - points[left].x;
        const dy = points[right].y - points[left].y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 900);
        const distance = Math.sqrt(distanceSquared);
        const strength = 11800 / distanceSquared;
        const forceX = (dx / distance) * strength;
        const forceY = (dy / distance) * strength;

        forces[left].x -= forceX;
        forces[left].y -= forceY;
        forces[right].x += forceX;
        forces[right].y += forceY;
      }
    }

    links.forEach(({ source, target }) => {
      const dx = points[target].x - points[source].x;
      const dy = points[target].y - points[source].y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const strength = (distance - preferredDistance) * 0.016;
      const forceX = (dx / distance) * strength;
      const forceY = (dy / distance) * strength;

      forces[source].x += forceX;
      forces[source].y += forceY;
      forces[target].x -= forceX;
      forces[target].y -= forceY;
    });

    points.forEach((point, index) => {
      forces[index].x += (centerX - point.x) * 0.0032;
      forces[index].y += (centerY - point.y) * 0.0032;

      point.vx = (point.vx + forces[index].x) * 0.72;
      point.vy = (point.vy + forces[index].y) * 0.72;
      point.x = Math.min(
        width - marginX,
        Math.max(marginX, point.x + point.vx),
      );
      point.y = Math.min(
        height - marginY,
        Math.max(marginY, point.y + point.vy),
      );
    });
  }

  nodeIds.forEach((id, index) => {
    result.set(id, {
      x: Math.round(points[index].x * 10) / 10,
      y: Math.round(points[index].y * 10) / 10,
    });
  });

  return result;
}

/**
 * 为操作型案例生成稳定的左到右流程布局。
 * 顶层可用 flowPosition 明确表达并行分支与汇合；未标注的下层节点
 * 按 index 排成一条时间线，保证深入后仍然从左向右阅读。
 */
export function createWorkflowLayout(
  nodes: LayoutNode[],
  edges: Pick<GraphEdge, "source" | "target">[] = [],
  width = 1080,
  height = 610,
): Map<string, NetworkPoint> {
  const result = new Map<string, NetworkPoint>();
  if (nodes.length === 0) return result;

  const ordered = [...nodes].sort(
    (left, right) =>
      (left.index ?? Number.MAX_SAFE_INTEGER) -
        (right.index ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );

  if (ordered.length === 1) {
    result.set(ordered[0].id, { x: width / 2, y: height / 2 });
    return result;
  }

  const hasPreset = ordered.every(
    (node) =>
      node.flowPosition &&
      Number.isFinite(node.flowPosition.column) &&
      Number.isFinite(node.flowPosition.lane),
  );
  const marginX = 90;
  const topY = 145;
  const bottomY = height - 135;

  if (hasPreset) {
    const columns = ordered.map((node) => node.flowPosition!.column);
    const lanes = ordered.map((node) => node.flowPosition!.lane);
    const minColumn = Math.min(...columns);
    const maxColumn = Math.max(...columns);
    const minLane = Math.min(...lanes);
    const maxLane = Math.max(...lanes);
    const columnSpan = Math.max(maxColumn - minColumn, 1);
    const laneSpan = Math.max(maxLane - minLane, 1);

    ordered.forEach((node) => {
      const { column, lane } = node.flowPosition!;
      result.set(node.id, {
        x:
          Math.round(
            (marginX +
              ((column - minColumn) / columnSpan) *
                (width - marginX * 2)) *
              10,
          ) / 10,
        y:
          Math.round(
            (topY + ((lane - minLane) / laneSpan) * (bottomY - topY)) * 10,
          ) / 10,
      });
    });

    return result;
  }

  const orderById = new Map(
    ordered.map((node, index) => [node.id, index]),
  );
  const columns = new Map(ordered.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  const forwardPairs = new Set<string>();

  edges.forEach((edge) => {
    const sourceOrder = orderById.get(edge.source);
    const targetOrder = orderById.get(edge.target);
    if (
      sourceOrder === undefined ||
      targetOrder === undefined ||
      sourceOrder >= targetOrder
    ) {
      return;
    }

    const pair = `${edge.source}:${edge.target}`;
    if (forwardPairs.has(pair)) return;
    forwardPairs.add(pair);
    outgoing.set(edge.source, [
      ...(outgoing.get(edge.source) ?? []),
      edge.target,
    ]);
  });

  ordered.forEach((node) => {
    const sourceColumn = columns.get(node.id) ?? 0;
    (outgoing.get(node.id) ?? [])
      .sort(
        (left, right) =>
          (orderById.get(left) ?? 0) - (orderById.get(right) ?? 0),
      )
      .forEach((targetId) => {
        columns.set(
          targetId,
          Math.max(columns.get(targetId) ?? 0, sourceColumn + 1),
        );
      });
  });

  const columnGroups = new Map<number, LayoutNode[]>();
  ordered.forEach((node) => {
    const column = columns.get(node.id) ?? 0;
    columnGroups.set(column, [...(columnGroups.get(column) ?? []), node]);
  });

  const widestColumn = Math.max(
    ...Array.from(columnGroups.values()).map((group) => group.length),
  );

  if (forwardPairs.size > 0 && widestColumn <= 3) {
    const maxColumn = Math.max(...columnGroups.keys());
    const columnSpan = Math.max(maxColumn, 1);

    columnGroups.forEach((group, column) => {
      group.forEach((node, laneIndex) => {
        const y =
          group.length === 1
            ? height / 2
            : topY +
              (laneIndex / Math.max(group.length - 1, 1)) *
                (bottomY - topY);

        result.set(node.id, {
          x:
            Math.round(
              (marginX +
                (column / columnSpan) * (width - marginX * 2)) *
                10,
            ) / 10,
          y: Math.round(y * 10) / 10,
        });
      });
    });

    return result;
  }

  const availableWidth = width - marginX * 2;
  ordered.forEach((node, index) => {
    result.set(node.id, {
      x:
        Math.round(
          (marginX + (index / (ordered.length - 1)) * availableWidth) * 10,
        ) / 10,
      y: Math.round((height / 2) * 10) / 10,
    });
  });

  return result;
}

export function resolveLayoutMode(
  layout?: { mode?: LayoutMode } | null,
): LayoutMode {
  return layout?.mode === "workflow" ? "workflow" : "network";
}

export function createCaseLayout(
  mode: LayoutMode,
  nodes: LayoutNode[],
  edges: Pick<GraphEdge, "source" | "target">[],
): Map<string, NetworkPoint> {
  return mode === "workflow"
    ? createWorkflowLayout(nodes, edges)
    : createNetworkLayout(
        nodes.map((node) => node.id),
        edges,
      );
}

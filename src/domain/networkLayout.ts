import type { GraphEdge } from "./types";

export type NetworkPoint = {
  x: number;
  y: number;
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

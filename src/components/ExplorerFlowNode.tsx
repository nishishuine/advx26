import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { GraphNode } from "../domain/types";

export type ExplorerNodeData = {
  graphNode: GraphNode;
  accent: string;
  dimmed: boolean;
  linked: boolean;
};

export type ExplorerNode = Node<ExplorerNodeData, "explorer">;

export function ExplorerFlowNode({
  data,
  selected,
}: NodeProps<ExplorerNode>) {
  const { graphNode, accent, dimmed, linked } = data;

  return (
    <div
      className={`network-node ${selected ? "network-node--selected" : ""} ${linked ? "network-node--linked" : ""} ${dimmed ? "network-node--dimmed" : ""} ${graphNode.canExpand ? "network-node--expandable" : ""}`}
      style={{ "--node-accent": accent } as React.CSSProperties}
      title={graphNode.canExpand ? `${graphNode.label} · 双击继续深入` : graphNode.label}
    >
      <Handle type="target" position={Position.Top} />
      <div className="network-node__point" aria-hidden="true">
        <span />
      </div>
      <strong>{graphNode.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

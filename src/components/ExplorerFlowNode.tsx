import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { LayoutMode } from "../domain/networkLayout";
import type { GraphNode } from "../domain/types";

export type ExplorerNodeData = {
  graphNode: GraphNode;
  accent: string;
  dimmed: boolean;
  linked: boolean;
  layoutMode: LayoutMode;
};

export type ExplorerNode = Node<ExplorerNodeData, "explorer">;

export function ExplorerFlowNode({
  data,
  selected,
}: NodeProps<ExplorerNode>) {
  const { graphNode, accent, dimmed, linked, layoutMode } = data;
  const isWorkflow = layoutMode === "workflow";

  return (
    <div
      className={`network-node ${isWorkflow ? "network-node--workflow" : ""} ${selected ? "network-node--selected" : ""} ${linked ? "network-node--linked" : ""} ${dimmed ? "network-node--dimmed" : ""} ${graphNode.canExpand ? "network-node--expandable" : ""}`}
      style={{ "--node-accent": accent } as React.CSSProperties}
      title={graphNode.canExpand ? `${graphNode.label} · 双击继续深入` : graphNode.label}
    >
      <Handle
        type="target"
        position={isWorkflow ? Position.Left : Position.Top}
      />
      <div className="network-node__point">
        <span aria-hidden="true" />
        <em>{graphNode.label}</em>
      </div>
      <strong>{graphNode.label}</strong>
      <Handle
        type="source"
        position={isWorkflow ? Position.Right : Position.Bottom}
      />
    </div>
  );
}

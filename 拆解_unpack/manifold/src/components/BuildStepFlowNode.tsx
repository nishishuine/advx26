import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useLanguage } from "../i18n/LanguageProvider";

export type BuildStepNodeData = {
  stepId: string;
  index: number;
  title: string;
  phase: string;
  duration: string;
  complete: boolean;
  current: boolean;
  linked: boolean;
};

export type BuildStepNode = Node<BuildStepNodeData, "build-step">;

export function BuildStepFlowNode({
  data,
  selected,
}: NodeProps<BuildStepNode>) {
  const { text } = useLanguage();
  const {
    stepId,
    index,
    title,
    phase,
    duration,
    complete,
    current,
    linked,
  } = data;

  return (
    <button
      type="button"
      className={[
        "build-flow-node",
        selected && "build-flow-node--selected",
        complete && "build-flow-node--complete",
        current && "build-flow-node--current",
        linked && "build-flow-node--linked",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={current ? "step" : undefined}
      aria-label={text(
        `第 ${index} 步：${title}`,
        `Step ${index}: ${title}`,
        `${index}-р алхам: ${title}`,
      )}
      data-complete={complete ? "true" : "false"}
      data-step-id={stepId}
      title={`${phase} · ${duration}`}
    >
      <Handle
        className="build-flow-node__handle build-flow-node__handle--target"
        type="target"
        position={Position.Left}
      />

      <span className="build-flow-node__point" aria-hidden="true">
        <span className="build-flow-node__index">
          {complete ? "✓" : String(index).padStart(2, "0")}
        </span>
        <strong className="build-flow-node__phase">{phase}</strong>
        <span className="build-flow-node__summary">{title}</span>
      </span>

      <Handle
        className="build-flow-node__handle build-flow-node__handle--source"
        type="source"
        position={Position.Right}
      />
    </button>
  );
}

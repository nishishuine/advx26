import { CircleCheck, Eye, Sparkles } from "lucide-react";
import type { NodeStatus } from "../domain/types";

const statusConfig = {
  observed: {
    label: "已观察",
    Icon: Eye,
  },
  verified: {
    label: "已验证",
    Icon: CircleCheck,
  },
  inferred: {
    label: "推断",
    Icon: Sparkles,
  },
} satisfies Record<NodeStatus, { label: string; Icon: typeof Eye }>;

export function StatusBadge({ status }: { status: NodeStatus }) {
  const { label, Icon } = statusConfig[status];
  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

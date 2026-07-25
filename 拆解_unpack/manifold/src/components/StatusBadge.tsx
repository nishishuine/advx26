import { CircleCheck, Eye, Sparkles } from "lucide-react";
import type { NodeStatus } from "../domain/types";
import { useLanguage } from "../i18n/LanguageProvider";

const statusConfig = {
  observed: {
    labels: ["已观察", "Observed", "Ажигласан"],
    Icon: Eye,
  },
  verified: {
    labels: ["已验证", "Verified", "Баталсан"],
    Icon: CircleCheck,
  },
  inferred: {
    labels: ["推断", "Inferred", "Таамагласан"],
    Icon: Sparkles,
  },
} satisfies Record<
  NodeStatus,
  { labels: [string, string, string]; Icon: typeof Eye }
>;

export function StatusBadge({ status }: { status: NodeStatus }) {
  const { text } = useLanguage();
  const { labels, Icon } = statusConfig[status];
  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon size={12} />
      {text(...labels)}
    </span>
  );
}

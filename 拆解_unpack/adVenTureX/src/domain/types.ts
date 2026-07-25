export type DomainType = "object" | "life";
export type NodeStatus = "observed" | "verified" | "inferred";
export type ViewType =
  | "structure"
  | "signal"
  | "energy"
  | "matter"
  | "code"
  | "causal";
export type GoalType = "learn" | "build" | "repair";
export type NodeKind = "entity" | "process" | "code" | "evidence";
export type EvidenceGrade = "A" | "B" | "C";

export type RelationType =
  | "contains"
  | "supports"
  | "powers"
  | "controls"
  | "senses"
  | "signals"
  | "transfers_energy"
  | "transports"
  | "regulates"
  | "exchanges"
  | "protects"
  | "depends_on"
  | "transforms"
  | "moves"
  | "encodes"
  | "modulates"
  | "drives"
  | "emits"
  | "detects"
  | "samples"
  | "decodes"
  | "validates"
  | "diffuses"
  | "osmosis"
  | "pumps"
  | "activates"
  | "inhibits"
  | "catalyzes";

export type Buildability = "safe" | "guided" | "not_recommended";

export type GraphNode = {
  id: string;
  parentId: string | null;
  label: string;
  summary: string;
  domain: DomainType;
  level: number;
  function: string;
  status: NodeStatus;
  canExpand: boolean;
  buildability: Buildability;
  source: string;
  sourceUrl?: string;
  kind?: NodeKind;
  scale?: string;
  tags?: string[];
  code?: {
    language: string;
    snippet: string;
    line?: number;
    input?: string;
    output?: string;
    effect?: string;
  };
  index?: number;
  flowPosition?: {
    column: number;
    lane: number;
  };
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  explanation: string;
  views: ViewType[];
  cargo?: string;
  mechanism?: string;
  driver?: string;
  interface?: string;
  condition?: string;
  evidence?: string;
  evidenceGrade?: EvidenceGrade;
  verification?: string;
  flowStyle?: "primary" | "support";
  origin?: {
    id: string;
    source: string;
    target: string;
  };
};

export type WorldCase = {
  id: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  domain: DomainType;
  rootNodeId: string;
  accent: string;
  accentSoft: string;
  keyInsight: string;
  layout?: {
    mode: "network" | "workflow";
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type BuildPart = {
  id: string;
  name: string;
  quantity: string;
  purpose: string;
  estimate: string;
  status: "core" | "support";
};

export type BuildConnection = {
  from: string;
  to: string;
  via: string;
  reason: string;
};

export type BuildStep = {
  id: string;
  phase: string;
  title: string;
  purpose: string;
  prerequisites: string[];
  instructions: string[];
  successCriteria: string[];
  troubleshooting: string[];
  duration: string;
};

export type BuildGuide = {
  caseId: string;
  title: string;
  summary: string;
  difficulty: string;
  totalTime: string;
  budget: string;
  tools: string[];
  programFlow: string[];
  parts: BuildPart[];
  connections: BuildConnection[];
  steps: BuildStep[];
  safety: string[];
};

export type CaseSummary = Pick<
  WorldCase,
  | "id"
  | "title"
  | "shortTitle"
  | "eyebrow"
  | "description"
  | "domain"
  | "accent"
  | "accentSoft"
  | "keyInsight"
>;

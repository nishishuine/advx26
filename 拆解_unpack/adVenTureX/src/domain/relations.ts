import type { DomainType, RelationType, ViewType } from "./types";

export const OBJECT_RELATIONS: RelationType[] = [
  "contains",
  "supports",
  "powers",
  "controls",
  "senses",
  "signals",
  "transfers_energy",
  "protects",
  "depends_on",
  "transforms",
  "moves",
  "encodes",
  "modulates",
  "drives",
  "emits",
  "detects",
  "samples",
  "decodes",
  "validates",
];

export const LIFE_RELATIONS: RelationType[] = [
  "contains",
  "supports",
  "transports",
  "regulates",
  "exchanges",
  "signals",
  "protects",
  "depends_on",
  "transforms",
  "diffuses",
  "osmosis",
  "pumps",
  "activates",
  "inhibits",
  "catalyzes",
];

export const RELATION_LABELS: Record<RelationType, string> = {
  contains: "组成",
  supports: "支撑",
  powers: "供电",
  controls: "控制",
  senses: "感知",
  signals: "传递信号",
  transfers_energy: "传递能量",
  transports: "运输",
  regulates: "调节",
  exchanges: "交换",
  protects: "保护",
  depends_on: "依赖",
  transforms: "转化",
  moves: "产生运动",
  encodes: "编码",
  modulates: "调制",
  drives: "驱动",
  emits: "发射",
  detects: "探测",
  samples: "采样",
  decodes: "解码",
  validates: "校验",
  diffuses: "扩散",
  osmosis: "渗透",
  pumps: "泵送",
  activates: "激活",
  inhibits: "抑制",
  catalyzes: "催化",
};

export const VIEW_LABELS: Record<ViewType, string> = {
  structure: "结构",
  signal: "信号",
  energy: "能量",
  matter: "物质",
  code: "代码",
  causal: "因果",
};

export const getAllowedRelations = (domain: DomainType) =>
  domain === "object" ? OBJECT_RELATIONS : LIFE_RELATIONS;

export const getViewsForDomain = (domain: DomainType): ViewType[] =>
  domain === "object"
    ? ["structure", "signal", "energy", "code", "causal"]
    : ["structure", "matter", "energy", "signal", "causal"];

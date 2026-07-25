import type { DomainType, RelationType, ViewType } from "./types";
import type { Locale } from "../i18n/LanguageProvider";

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

const EN_RELATION_LABELS: Record<RelationType, string> = {
  contains: "contains",
  supports: "supports",
  powers: "powers",
  controls: "controls",
  senses: "senses",
  signals: "sends signal",
  transfers_energy: "transfers energy",
  transports: "transports",
  regulates: "regulates",
  exchanges: "exchanges",
  protects: "protects",
  depends_on: "depends on",
  transforms: "transforms",
  moves: "creates motion",
  encodes: "encodes",
  modulates: "modulates",
  drives: "drives",
  emits: "emits",
  detects: "detects",
  samples: "samples",
  decodes: "decodes",
  validates: "validates",
  diffuses: "diffuses",
  osmosis: "osmosis",
  pumps: "pumps",
  activates: "activates",
  inhibits: "inhibits",
  catalyzes: "catalyzes",
};

const MN_RELATION_LABELS: Record<RelationType, string> = {
  contains: "агуулна",
  supports: "тулгуурлана",
  powers: "тэжээнэ",
  controls: "удирдана",
  senses: "мэдэрнэ",
  signals: "дохио дамжуулна",
  transfers_energy: "энерги дамжуулна",
  transports: "зөөвөрлөнө",
  regulates: "зохицуулна",
  exchanges: "солилцоно",
  protects: "хамгаална",
  depends_on: "хамаарна",
  transforms: "хувиргана",
  moves: "хөдөлгөөн үүсгэнэ",
  encodes: "кодлоно",
  modulates: "модуляцлана",
  drives: "ажиллуулна",
  emits: "ялгаруулна",
  detects: "илрүүлнэ",
  samples: "сорьц авна",
  decodes: "тайлна",
  validates: "баталгаажуулна",
  diffuses: "диффузлэнэ",
  osmosis: "осмос явуулна",
  pumps: "шахна",
  activates: "идэвхжүүлнэ",
  inhibits: "саатуулна",
  catalyzes: "хурдасгана",
};

const EN_VIEW_LABELS: Record<ViewType, string> = {
  structure: "Structure",
  signal: "Signal",
  energy: "Energy",
  matter: "Matter",
  code: "Code",
  causal: "Cause",
};

const MN_VIEW_LABELS: Record<ViewType, string> = {
  structure: "Бүтэц",
  signal: "Дохио",
  energy: "Энерги",
  matter: "Бодис",
  code: "Код",
  causal: "Шалтгаан",
};

export function getRelationLabel(
  relation: RelationType,
  locale: Locale,
) {
  if (locale === "en") return EN_RELATION_LABELS[relation];
  if (locale === "mn") return MN_RELATION_LABELS[relation];
  return RELATION_LABELS[relation];
}

export function getViewLabel(view: ViewType, locale: Locale) {
  if (locale === "en") return EN_VIEW_LABELS[view];
  if (locale === "mn") return MN_VIEW_LABELS[view];
  return VIEW_LABELS[view];
}

export const getAllowedRelations = (domain: DomainType) =>
  domain === "object" ? OBJECT_RELATIONS : LIFE_RELATIONS;

export const getViewsForDomain = (domain: DomainType): ViewType[] =>
  domain === "object"
    ? ["structure", "signal", "energy", "code", "causal"]
    : ["structure", "matter", "energy", "signal", "causal"];

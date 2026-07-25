import orangePiFirstBoot from "../data/cases/orange-pi-first-boot.json";
import orangePiFirstBootEn from "../data/cases/orange-pi-first-boot.en.json";
import orangePiFirstBootMn from "../data/cases/orange-pi-first-boot.mn.json";
import orangePiFirstBootGuide from "../data/build-guides/orange-pi-first-boot.json";
import orangePiFirstBootGuideEn from "../data/build-guides/orange-pi-first-boot.en.json";
import orangePiFirstBootGuideMn from "../data/build-guides/orange-pi-first-boot.mn.json";
import { getNode, validateBuildGuide, validateWorldCase } from "./graph";
import type {
  BuildGuide,
  CaseSummary,
  GraphNode,
  WorldCase,
} from "./types";
import type { Locale } from "../i18n/LanguageProvider";

export interface GraphRepository {
  listCases(): Promise<CaseSummary[]>;
  getCase(caseId: string): Promise<WorldCase>;
  getNode(caseId: string, nodeId: string): Promise<GraphNode>;
  getBuildGuide(caseId: string): Promise<BuildGuide | null>;
}

type RepositoryData = {
  worldCases: WorldCase[];
  guides: BuildGuide[];
  missingCase: (caseId: string) => string;
};

function createRepositoryData(
  worldCase: unknown,
  guide: unknown,
  missingCase: (caseId: string) => string,
): RepositoryData {
  return {
    worldCases: [validateWorldCase(worldCase as WorldCase)],
    guides: [validateBuildGuide(guide as BuildGuide)],
    missingCase,
  };
}

const localizedData: Record<Locale, RepositoryData> = {
  zh: createRepositoryData(
    orangePiFirstBoot,
    orangePiFirstBootGuide,
    (caseId) => `找不到案例：${caseId}`,
  ),
  en: createRepositoryData(
    orangePiFirstBootEn,
    orangePiFirstBootGuideEn,
    (caseId) => `Project not found: ${caseId}`,
  ),
  mn: createRepositoryData(
    orangePiFirstBootMn,
    orangePiFirstBootGuideMn,
    (caseId) => `Төсөл олдсонгүй: ${caseId}`,
  ),
};

export class StaticGraphRepository implements GraphRepository {
  constructor(private readonly data: RepositoryData = localizedData.zh) {}

  async listCases(): Promise<CaseSummary[]> {
    return this.data.worldCases.map(
      ({
        id,
        title,
        shortTitle,
        eyebrow,
        description,
        domain,
        accent,
        accentSoft,
        keyInsight,
      }) => ({
        id,
        title,
        shortTitle,
        eyebrow,
        description,
        domain,
        accent,
        accentSoft,
        keyInsight,
      }),
    );
  }

  async getCase(caseId: string): Promise<WorldCase> {
    const worldCase = this.data.worldCases.find(
      (candidate) => candidate.id === caseId,
    );
    if (!worldCase) {
      throw new Error(this.data.missingCase(caseId));
    }
    return worldCase;
  }

  async getNode(caseId: string, nodeId: string): Promise<GraphNode> {
    const worldCase = await this.getCase(caseId);
    return getNode(worldCase, nodeId);
  }

  async getBuildGuide(caseId: string): Promise<BuildGuide | null> {
    return (
      this.data.guides.find((guide) => guide.caseId === caseId) ?? null
    );
  }
}

const repositories: Record<Locale, StaticGraphRepository> = {
  zh: new StaticGraphRepository(localizedData.zh),
  en: new StaticGraphRepository(localizedData.en),
  mn: new StaticGraphRepository(localizedData.mn),
};

export function getGraphRepository(locale: Locale) {
  return repositories[locale];
}

export const graphRepository = repositories.zh;

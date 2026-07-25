import orangePiFirstBoot from "../data/cases/orange-pi-first-boot.json";
import orangePiFirstBootGuide from "../data/build-guides/orange-pi-first-boot.json";
import { getNode, validateBuildGuide, validateWorldCase } from "./graph";
import type {
  BuildGuide,
  CaseSummary,
  GraphNode,
  WorldCase,
} from "./types";

export interface GraphRepository {
  listCases(): Promise<CaseSummary[]>;
  getCase(caseId: string): Promise<WorldCase>;
  getNode(caseId: string, nodeId: string): Promise<GraphNode>;
  getBuildGuide(caseId: string): Promise<BuildGuide | null>;
}

const worldCases = [orangePiFirstBoot as WorldCase].map(validateWorldCase);

const guides = [orangePiFirstBootGuide as BuildGuide].map(
  validateBuildGuide,
);

export class StaticGraphRepository implements GraphRepository {
  async listCases(): Promise<CaseSummary[]> {
    return worldCases.map(
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
    const worldCase = worldCases.find((candidate) => candidate.id === caseId);
    if (!worldCase) {
      throw new Error(`找不到案例：${caseId}`);
    }
    return worldCase;
  }

  async getNode(caseId: string, nodeId: string): Promise<GraphNode> {
    const worldCase = await this.getCase(caseId);
    return getNode(worldCase, nodeId);
  }

  async getBuildGuide(caseId: string): Promise<BuildGuide | null> {
    return guides.find((guide) => guide.caseId === caseId) ?? null;
  }
}

export const graphRepository = new StaticGraphRepository();

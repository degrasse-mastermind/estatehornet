import { createSeedMatters } from "../data/seedData";
import type { Matter } from "../types";
import { generateRiskFlags } from "../utils/riskEngine";
import { nowIso } from "../utils/date";

const STORAGE_KEY = "estatehornet.matters.v1";

function normalizeMatter(matter: Matter): Matter {
  return {
    ...matter,
    generatedDocuments: matter.generatedDocuments || [],
    riskFlags: generateRiskFlags(matter),
  };
}

function saveMatters(matters: Matter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matters.map(normalizeMatter)));
}

export const matterStorage = {
  getMatters(): Matter[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Matter[];
      return parsed.map(normalizeMatter);
    } catch {
      return [];
    }
  },

  getMatterById(id: string): Matter | undefined {
    return this.getMatters().find((matter) => matter.id === id);
  },

  createMatter(matter: Matter): Matter {
    const matters = this.getMatters();
    const created = normalizeMatter({ ...matter, updatedAt: nowIso() });
    saveMatters([created, ...matters]);
    return created;
  },

  updateMatter(id: string, updates: Partial<Matter>): Matter | undefined {
    let updatedMatter: Matter | undefined;
    const matters = this.getMatters().map((matter) => {
      if (matter.id !== id) return matter;
      updatedMatter = normalizeMatter({ ...matter, ...updates, updatedAt: nowIso() });
      return updatedMatter;
    });
    saveMatters(matters);
    return updatedMatter;
  },

  deleteMatter(id: string) {
    saveMatters(this.getMatters().filter((matter) => matter.id !== id));
  },

  seedMattersIfEmpty() {
    if (this.getMatters().length > 0) return;
    saveMatters(createSeedMatters());
  },
};

// Future database adapters can implement this same service contract using
// Supabase, SharePoint/Microsoft 365, or another approved firm data store.
// Store secrets only in .env.local; never commit .env files or client exports.

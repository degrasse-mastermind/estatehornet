import { createSeedMatters } from "../data/seedData";
import type { Matter } from "../types";
import { generateRiskFlags } from "../utils/riskEngine";
import { nowIso } from "../utils/date";

const STORAGE_KEY = "estatehornet.matters.v1";
const JONES_HOPSON_TEST_MATTER_ID = "matter-24fb8ef9-8000-4383-9f6e-756641a2c6f5";

function normalizeMatter(matter: Matter): Matter {
  return {
    ...matter,
    generatedDocuments: matter.generatedDocuments || [],
    generatedPdfDocuments: matter.generatedPdfDocuments || [],
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
    const existing = this.getMatters();
    const seeds = createSeedMatters();
    if (existing.length === 0) {
      saveMatters(seeds);
      return;
    }

    const jonesHopsonSeed = seeds.find((matter) => matter.id === JONES_HOPSON_TEST_MATTER_ID);
    if (!jonesHopsonSeed) return;

    const existingIndex = existing.findIndex((matter) => matter.id === JONES_HOPSON_TEST_MATTER_ID);
    if (existingIndex === -1) {
      saveMatters([jonesHopsonSeed, ...existing]);
      return;
    }

    const existingJonesHopson = existing[existingIndex];
    const sparseJonesHopson =
      (existingJonesHopson.people?.length || 0) < 8 ||
      (existingJonesHopson.assets?.length || 0) < 8 ||
      existingJonesHopson.decedentFirstName !== "Jones" ||
      existingJonesHopson.decedentLastName !== "Hopson";

    if (sparseJonesHopson) {
      const merged = [...existing];
      merged[existingIndex] = {
        ...jonesHopsonSeed,
        generatedDocuments: existingJonesHopson.generatedDocuments || [],
        generatedPdfDocuments: existingJonesHopson.generatedPdfDocuments || [],
      };
      saveMatters(merged);
    }
  },
};

// Future database adapters can implement this same service contract using
// Supabase, SharePoint/Microsoft 365, or another approved firm data store.
// Store secrets only in .env.local; never commit .env files or client exports.

import { starterDocumentTemplates } from "../data/documentTemplates";
import type { DocumentTemplate } from "../types";
import { makeId, nowIso } from "../utils/date";

const TEMPLATE_STORAGE_KEY = "estatehornet.documentTemplates.v1";

function cloneDefaults() {
  return starterDocumentTemplates.map((template) => ({ ...template }));
}

function saveTemplates(templates: DocumentTemplate[]) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export const templateStorage = {
  getTemplates(): DocumentTemplate[] {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      const defaults = cloneDefaults();
      saveTemplates(defaults);
      return defaults;
    }
    try {
      return JSON.parse(raw) as DocumentTemplate[];
    } catch {
      const defaults = cloneDefaults();
      saveTemplates(defaults);
      return defaults;
    }
  },

  updateTemplate(id: string, updates: Partial<DocumentTemplate>) {
    const templates = this.getTemplates().map((template) =>
      template.id === id ? { ...template, ...updates, updatedAt: nowIso() } : template,
    );
    saveTemplates(templates);
    return templates.find((template) => template.id === id);
  },

  duplicateTemplate(id: string) {
    const templates = this.getTemplates();
    const source = templates.find((template) => template.id === id);
    if (!source) return undefined;
    const stamp = nowIso();
    const copy: DocumentTemplate = {
      ...source,
      id: makeId("template"),
      name: `${source.name} Copy`,
      createdAt: stamp,
      updatedAt: stamp,
    };
    saveTemplates([copy, ...templates]);
    return copy;
  },

  resetTemplates() {
    const defaults = cloneDefaults();
    saveTemplates(defaults);
    return defaults;
  },
};

import type { PdfTemplate } from "../types/pdfForms";
import { pc200Mappings } from "./pc200Mapping";

export const PDF_TEMPLATE_NOT_INSTALLED_MESSAGE =
  "PC-200.pdf is not installed. Place the official Connecticut Probate Court PC-200 PDF at public/forms/probate/PC-200.pdf to enable this feature.";

export const pdfTemplates: PdfTemplate[] = [
  {
    id: "pc-200",
    formNumber: "PC-200",
    title: "Petition/Administration or Probate of Will",
    category: "opening",
    description: "Draft-only official Connecticut Probate Court PC-200 PDF template proof of concept.",
    filePath: "/forms/probate/PC-200.pdf",
    sourceName: "Connecticut Probate Courts",
    sourceUrl: "https://www.ctprobate.gov/",
    versionLabel: "Official form supplied locally by the firm",
    mappingMode: "acroform",
    requiresAttorneyReview: true,
    fields: pc200Mappings,
  },
];

export function getPdfTemplate(templateId: string) {
  return pdfTemplates.find((template) => template.id === templateId);
}

export function getPc200Template() {
  return getPdfTemplate("pc-200") || pdfTemplates[0];
}

// Future registry placeholders:
// PC-200CI Confidential Information Sheet
// PC-237 Return of Claims and List of Notified Creditors
// PC-2407/current inventory form
// PC-246/PC-242 accounting forms
// PC-213 Fiduciary's Closing Affidavit

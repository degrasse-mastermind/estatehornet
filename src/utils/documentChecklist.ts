import type { DocumentChecklistItem, Matter } from "../types";
import { makeId } from "./date";
import { matterHasCtRealEstate } from "./deadlineEngine";

const baseDocuments: Omit<DocumentChecklistItem, "id">[] = [
  { name: "PC-200 Petition/Administration or Probate of Will", category: "Court filing", status: "draft needed", notes: "Opening packet item for attorney/paralegal review." },
  { name: "PC-200CI Confidential Information Sheet", category: "Court filing", status: "draft needed", notes: "Do not store confidential data in this prototype." },
  { name: "Death certificate", category: "Client documents", status: "not started", notes: "Request certified copy as needed." },
  { name: "Original will", category: "Client documents", status: "not started", notes: "Track availability only; do not upload document." },
  { name: "Fiduciary appointment/decree", category: "Court filing", status: "not started", notes: "" },
  { name: "PC-2407 Inventory", category: "Court filing", status: "draft needed", notes: "Review asset values and probate status." },
  { name: "CT-706 NT or CT-706/709 review", category: "Tax", status: "attorney review", notes: "Attorney/paralegal review required." },
  { name: "PC-237 Return of Claims and List of Notified Creditors", category: "Creditor", status: "draft needed", notes: "" },
  { name: "PC-246 Financial Report or PC-242 Account review", category: "Accounting", status: "not started", notes: "Review required before preparation." },
  { name: "PC-213 Fiduciary's Closing Affidavit", category: "Closing", status: "not started", notes: "" },
  { name: "Initial client letter", category: "Client communication", status: "draft needed", notes: "" },
  { name: "Asset request letters", category: "Client communication", status: "draft needed", notes: "" },
  { name: "Beneficiary/heir notice letters", category: "Notice", status: "draft needed", notes: "" },
  { name: "Distribution receipts/releases", category: "Distribution", status: "not started", notes: "" },
  { name: "Closing letter", category: "Closing", status: "not started", notes: "" },
];

export function generateDocumentChecklist(matter: Matter): DocumentChecklistItem[] {
  const documents = [...baseDocuments];
  if (matterHasCtRealEstate(matter)) {
    documents.splice(6, 0, {
      name: "PC-251 Notice for Land Records if Connecticut real estate exists",
      category: "Real estate",
      status: "draft needed",
      notes: "Connecticut real estate detected. Review recording requirements.",
      relatedDueDate: matter.appointmentDate || undefined,
    });
  }
  return documents.map((item) => ({ id: makeId("doc"), ...item }));
}

import type { AssetOwnership, AssetType, DocumentationStatus, EstateType, MatterStage, MatterStatus, PersonRole, ProbateCourt, TaskCategory, TaskPriority, TaskStatus } from "../types";

export const probateCourts: ProbateCourt[] = [
  { id: "hartford", name: "Hartford Probate Court" },
  { id: "new-haven", name: "New Haven Probate Court" },
  { id: "stamford", name: "Stamford Probate Court" },
  { id: "fairfield", name: "Fairfield Probate Court" },
  { id: "waterbury", name: "Waterbury Regional Children's Probate Court" },
  { id: "danbury", name: "Danbury Probate Court" },
  { id: "bridgeport", name: "Bridgeport Probate Court" },
  { id: "middletown", name: "Middletown Probate Court" },
  { id: "new-london", name: "New London Probate Court" },
  { id: "free-text", name: "Other / free text" },
];

export const estateTypes: EstateType[] = [
  "Full estate",
  "Will filing only",
  "Small estate/affidavit review",
  "Trust administration",
  "Tax-only",
  "Ancillary",
  "Unknown",
];

export const matterStages: MatterStage[] = [
  "Intake",
  "Pre-opening",
  "Opening probate",
  "Awaiting appointment",
  "Fiduciary appointed",
  "Asset collection",
  "Inventory",
  "Creditor period",
  "Tax review",
  "Accounting",
  "Distribution",
  "Closing",
  "Closed",
];

export const matterStatuses: MatterStatus[] = [
  "Active",
  "Waiting on client",
  "Waiting on court",
  "Attorney review",
  "On hold",
  "Closed",
];

export const paralegals = ["Avery Staff", "Taylor Probate", "Jamie Admin", "Unassigned"];
export const personRoles: PersonRole[] = ["spouse", "child", "heir", "beneficiary", "creditor", "fiduciary", "attorney", "minor beneficiary", "unknown heir", "other"];
export const assetTypes: AssetType[] = ["real estate", "bank account", "brokerage", "retirement", "life insurance", "vehicle", "business interest", "personal property", "other"];
export const assetOwnershipTypes: AssetOwnership[] = ["sole", "joint", "POD/TOD", "beneficiary", "trust", "unknown"];
export const documentationStatuses: DocumentationStatus[] = ["missing", "requested", "received", "reviewed"];
export const taskPriorities: TaskPriority[] = ["low", "normal", "high", "urgent"];
export const taskStatuses: TaskStatus[] = ["not started", "in progress", "waiting on client", "waiting on court", "attorney review", "done"];
export const taskCategories: TaskCategory[] = ["court filing", "tax", "client follow-up", "asset collection", "creditor", "accounting", "closing", "internal", "real estate"];

export const deadlineRuleConfig = {
  openingPacketDaysAfterDeath: 30,
  ctEstateTaxMonthsAfterDeath: 6,
  inventoryMonthsAfterAppointment: 2,
  landRecordsMonthsAfterAppointment: 2,
  creditorClaimPeriodDays: 150,
  pc237DaysAfterClaimStart: 210,
  longOpenReviewMonthsAfterAppointment: 12,
  highValueTaxReviewThreshold: 2_000_000,
  inactiveMatterDays: 30,
};

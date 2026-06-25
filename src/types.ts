export type YesNoUnknown = "yes" | "no" | "unknown";
export type ReviewableYesNo = "yes" | "no" | "review";

export type EstateType =
  | "Full estate"
  | "Will filing only"
  | "Small estate/affidavit review"
  | "Trust administration"
  | "Tax-only"
  | "Ancillary"
  | "Unknown";

export type PersonRole =
  | "spouse"
  | "child"
  | "heir"
  | "beneficiary"
  | "creditor"
  | "fiduciary"
  | "attorney"
  | "minor beneficiary"
  | "unknown heir"
  | "other";

export type AssetType =
  | "real estate"
  | "bank account"
  | "brokerage"
  | "retirement"
  | "life insurance"
  | "vehicle"
  | "business interest"
  | "personal property"
  | "other";

export type AssetOwnership =
  | "sole"
  | "joint"
  | "POD/TOD"
  | "beneficiary"
  | "trust"
  | "unknown";

export type DocumentationStatus = "missing" | "requested" | "received" | "reviewed";

export type MatterStage =
  | "Intake"
  | "Pre-opening"
  | "Opening probate"
  | "Awaiting appointment"
  | "Fiduciary appointed"
  | "Asset collection"
  | "Inventory"
  | "Creditor period"
  | "Tax review"
  | "Accounting"
  | "Distribution"
  | "Closing"
  | "Closed";

export type MatterStatus =
  | "Active"
  | "Waiting on client"
  | "Waiting on court"
  | "Attorney review"
  | "On hold"
  | "Closed";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus =
  | "not started"
  | "in progress"
  | "waiting on client"
  | "waiting on court"
  | "attorney review"
  | "done";

export type TaskCategory =
  | "court filing"
  | "tax"
  | "client follow-up"
  | "asset collection"
  | "creditor"
  | "accounting"
  | "closing"
  | "internal"
  | "real estate";

export type DocumentStatus =
  | "not started"
  | "draft needed"
  | "drafted"
  | "attorney review"
  | "ready to send/file"
  | "filed/sent";

export type NoteVisibility = "internal only" | "attorney review" | "client-shareable draft";
export type RiskSeverity = "low" | "medium" | "high";

export interface ProbateCourt {
  id: string;
  name: string;
  district?: string;
}

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  email: string;
  phone: string;
  address: string;
  waiverNeeded: YesNoUnknown;
  waiverReceived: "yes" | "no";
  notes?: string;
}

export interface Asset {
  id: string;
  assetType: AssetType;
  description: string;
  ownership: AssetOwnership;
  estimatedValue: number;
  probateAsset: ReviewableYesNo;
  ctTaxableReportable: ReviewableYesNo;
  documentationStatus: DocumentationStatus;
  notes: string;
  ctRealEstate: "yes" | "no";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  source: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  category: TaskCategory;
  createdAt: string;
  updatedAt: string;
  manual?: boolean;
}

export interface DocumentChecklistItem {
  id: string;
  name: string;
  category: string;
  status: DocumentStatus;
  relatedDueDate?: string;
  notes: string;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  dateTime: string;
  visibility: NoteVisibility;
}

export interface RiskFlag {
  id: string;
  label: string;
  description: string;
  severity: RiskSeverity;
  recommendedAction: string;
}

export interface Matter {
  id: string;
  createdAt: string;
  updatedAt: string;
  decedentFirstName: string;
  decedentLastName: string;
  dateOfDeath: string;
  dateOfBirth: string;
  decedentAddress: string;
  decedentCity: string;
  decedentState: string;
  decedentZip: string;
  ctResident: "yes" | "no";
  probateCourt: string;
  estateType: EstateType;
  originalWillAvailable: YesNoUnknown;
  willDate: string;
  codicils: YesNoUnknown;
  namedExecutor: string;
  bondWaived: YesNoUnknown;
  attorneyReviewRequired: boolean;
  fiduciaryName: string;
  fiduciaryRelationship: string;
  fiduciaryEmail: string;
  fiduciaryPhone: string;
  fiduciaryAddress: string;
  fiduciaryAppointed: "yes" | "no";
  appointmentDate: string;
  claimPeriodStartDate: string;
  assignedParalegal: string;
  stage: MatterStage;
  status: MatterStatus;
  people: Person[];
  assets: Asset[];
  tasks: Task[];
  documents: DocumentChecklistItem[];
  notes: Note[];
  riskFlags: RiskFlag[];
}

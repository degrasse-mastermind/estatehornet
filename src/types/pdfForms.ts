export type PdfMappingMode = "acroform" | "coordinate-overlay";
export type PdfFieldType = "text" | "checkbox" | "radio" | "dropdown" | "date" | "currency" | "list" | "unknown";
export type PdfFormatter = "date" | "currency" | "fullAddress" | "yesNo" | "checkbox" | "multilineList" | "phone";
export type GeneratedPdfStatus = "draft" | "review required" | "approved" | "filed" | "archived";

export interface PdfFieldMapping {
  pdfFieldName: string;
  estateHornetPath: string;
  label: string;
  fieldType: PdfFieldType;
  formatter?: PdfFormatter;
  fallback?: string;
  required: boolean;
  reviewRequired: boolean;
  notes?: string;
  checkedWhen?: string | boolean;
  enabled?: boolean;
}

export interface PdfInspectionField {
  name: string;
  type: PdfFieldType;
  possibleValues?: string[];
  mapped: boolean;
  mappedTo?: string;
  notes?: string;
}

export interface PdfTemplate {
  id: string;
  formNumber: string;
  title: string;
  category: string;
  description: string;
  filePath: string;
  sourceName: string;
  sourceUrl?: string;
  versionLabel?: string;
  mappingMode: PdfMappingMode;
  requiresAttorneyReview: boolean;
  fields: PdfFieldMapping[];
}

export interface GeneratedPdfDocument {
  id: string;
  matterId: string;
  templateId: string;
  formNumber: string;
  title: string;
  fileName: string;
  generatedAt: string;
  generatedBy: string;
  status: GeneratedPdfStatus;
  missingFields: string[];
  reviewWarnings: string[];
  mappedFieldCount: number;
  totalFieldCount: number;
  notes?: string;
}

export interface PdfTemplateStatus {
  found: boolean;
  message?: string;
}

export interface PdfInspectionResult {
  template: PdfTemplate;
  found: boolean;
  fields: PdfInspectionField[];
  totalFieldCount: number;
  noFillableFields: boolean;
  message?: string;
}

export interface PdfPreviewField {
  label: string;
  pdfFieldName: string;
  estateHornetPath: string;
  value: string;
  status: "ready" | "missing" | "unmapped" | "review";
  notes?: string;
}

export interface PdfFillPreview {
  template: PdfTemplate;
  templateFound: boolean;
  mappedFields: PdfPreviewField[];
  missingRequiredValues: string[];
  unmappedPdfFields: PdfInspectionField[];
  reviewWarnings: string[];
  readyToGenerate: boolean;
  totalFieldCount: number;
  mappedFieldCount: number;
  message?: string;
}

export interface PdfGenerationResult {
  bytes: Uint8Array;
  blob: Blob;
  filename: string;
  missingFields: string[];
  reviewWarnings: string[];
  mappedFieldCount: number;
  totalFieldCount: number;
}

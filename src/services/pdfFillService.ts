import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import type { Matter } from "../types";
import type { PdfFieldMapping, PdfFillPreview, PdfGenerationResult, PdfPreviewField } from "../types/pdfForms";
import { makeId, nowIso, todayIso } from "../utils/date";
import { resolveMatterPath } from "../utils/matterPathResolver";
import { formatCheckbox, formatMultilineList, formatPdfCurrency, formatPdfDate, formatPhone, formatYesNo, missingValueLabel } from "../utils/pdfFormatters";
import { fetchPdfBytes, inspectPdfTemplate } from "./pdfFieldInspector";
import { getPdfTemplate } from "./pdfTemplateRegistry";

export { inspectPdfTemplate };

function enabledMappings(mappings: PdfFieldMapping[]) {
  return mappings.filter((mapping) => mapping.enabled !== false);
}

function stringifyRawValue(value: string | number | boolean | null) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatValue(mapping: PdfFieldMapping, rawValue: string | number | boolean | null): string | boolean {
  const rawMissing = rawValue === null || rawValue === undefined || String(rawValue).trim() === "";
  if (rawMissing && mapping.fallback) return mapping.fallback;
  if (mapping.fieldType === "checkbox" || mapping.formatter === "checkbox") {
    return formatCheckbox(typeof rawValue === "number" ? String(rawValue) : rawValue, mapping.checkedWhen);
  }
  if (mapping.formatter === "date") return formatPdfDate(stringifyRawValue(rawValue));
  if (mapping.formatter === "currency") return formatPdfCurrency(typeof rawValue === "boolean" ? null : rawValue);
  if (mapping.formatter === "yesNo") return formatYesNo(typeof rawValue === "number" ? String(rawValue) : rawValue);
  if (mapping.formatter === "multilineList") return formatMultilineList(stringifyRawValue(rawValue));
  if (mapping.formatter === "phone") return formatPhone(stringifyRawValue(rawValue));
  return stringifyRawValue(rawValue);
}

function collectReviewWarnings(matter: Matter, hasPdf: boolean, totalFieldCount: number, mappedFieldCount: number, missingPdfFields: string[]) {
  const warnings = ["Draft only. Review official PC-200 instructions and current court requirements before filing."];
  if (!hasPdf) warnings.push("PC-200.pdf is not installed.");
  if (hasPdf && totalFieldCount === 0) warnings.push("No fillable AcroForm fields were detected. Coordinate-overlay mapping would be needed in a future phase.");
  if (mappedFieldCount === 0) warnings.push("PC-200 mapping has no enabled fields. Inspect the official PDF and update pc200Mapping.ts.");
  if (missingPdfFields.length) warnings.push(`Mapped PDF field names not found: ${missingPdfFields.join(", ")}.`);
  if (matter.originalWillAvailable === "unknown") warnings.push("Original will availability unknown.");
  if (matter.bondWaived === "unknown") warnings.push("Bond status unknown.");
  if (matter.people.some((person) => !person.address.trim())) warnings.push("One or more interested party addresses are missing.");
  if (!matter.probateCourt.trim()) warnings.push("Probate court missing.");
  if (!matter.fiduciaryName.trim()) warnings.push("Fiduciary/client missing.");
  if (matter.attorneyReviewRequired) warnings.push("Matter is already marked attorney review required.");
  warnings.push("Every generated PC-200 must be marked Draft - attorney/paralegal review required.");
  return warnings;
}

function buildPreviewRow(mapping: PdfFieldMapping, matter: Matter, actualFieldNames: Set<string>): PdfPreviewField {
  const rawValue = resolveMatterPath(matter, mapping.estateHornetPath);
  const formattedValue = formatValue(mapping, rawValue);
  const value = typeof formattedValue === "boolean" ? (formattedValue ? "Checked" : "") : formattedValue;
  const enabled = mapping.enabled !== false;
  const missing = mapping.required && !value;
  const fieldMissing = enabled && !actualFieldNames.has(mapping.pdfFieldName);

  return {
    label: mapping.label,
    pdfFieldName: mapping.pdfFieldName,
    estateHornetPath: mapping.estateHornetPath,
    value,
    status: !enabled ? "unmapped" : missing ? "missing" : fieldMissing || mapping.reviewRequired ? "review" : "ready",
    notes: !enabled ? mapping.notes : fieldMissing ? "Enabled mapping does not match a detected PDF field." : mapping.notes,
  };
}

export async function preparePdfFillPreview(templateId: string, matter: Matter): Promise<PdfFillPreview> {
  const template = getPdfTemplate(templateId);
  if (!template) throw new Error(`Unknown PDF template: ${templateId}`);

  const inspection = await inspectPdfTemplate(templateId);
  const actualFieldNames = new Set(inspection.fields.map((field) => field.name));
  const previewRows = template.fields.map((mapping) => buildPreviewRow(mapping, matter, actualFieldNames));
  const activeMappings = enabledMappings(template.fields);
  const missingRequiredValues = previewRows
    .filter((row) => row.status === "missing")
    .map((row) => missingValueLabel(row.label));
  const missingPdfFields = activeMappings
    .filter((mapping) => inspection.found && !actualFieldNames.has(mapping.pdfFieldName))
    .map((mapping) => mapping.pdfFieldName);
  const reviewWarnings = collectReviewWarnings(matter, inspection.found, inspection.totalFieldCount, activeMappings.length, missingPdfFields);
  const mappedFieldCount = activeMappings.length - missingPdfFields.length;
  const unmappedPdfFields = inspection.fields.filter((field) => !field.mapped);

  return {
    template,
    templateFound: inspection.found,
    mappedFields: previewRows,
    missingRequiredValues,
    unmappedPdfFields,
    reviewWarnings,
    readyToGenerate: inspection.found && inspection.totalFieldCount > 0 && activeMappings.length > 0 && missingPdfFields.length === 0 && missingRequiredValues.length === 0,
    totalFieldCount: inspection.totalFieldCount,
    mappedFieldCount: Math.max(mappedFieldCount, 0),
    message: inspection.message,
  };
}

function fillField(form: ReturnType<PDFDocument["getForm"]>, mapping: PdfFieldMapping, value: string | boolean) {
  const field = form.getField(mapping.pdfFieldName);
  if (field instanceof PDFTextField) {
    field.setText(String(value));
    return;
  }
  if (field instanceof PDFCheckBox) {
    Boolean(value) ? field.check() : field.uncheck();
    return;
  }
  if (field instanceof PDFRadioGroup && typeof value === "string" && value) {
    field.select(value);
    return;
  }
  if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof value === "string" && value) {
    field.select(value);
    return;
  }
  if ("setText" in field && typeof value === "string") {
    (field as PDFTextField).setText(value);
  }
}

export async function generateFilledPdf(templateId: string, matter: Matter, options: { flatten?: boolean } = {}): Promise<PdfGenerationResult> {
  const preview = await preparePdfFillPreview(templateId, matter);
  if (!preview.templateFound) throw new Error(preview.message || "PDF template is not installed.");

  const bytes = await fetchPdfBytes(preview.template.filePath);
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const missingFields: string[] = [...preview.missingRequiredValues];
  const mappedFields = enabledMappings(preview.template.fields);
  let filledCount = 0;

  for (const mapping of mappedFields) {
    const rawValue = resolveMatterPath(matter, mapping.estateHornetPath);
    const value = formatValue(mapping, rawValue);
    if (mapping.required && (value === "" || value === false)) {
      missingFields.push(missingValueLabel(mapping.label));
      continue;
    }
    try {
      fillField(form, mapping, value);
      filledCount += 1;
    } catch (error) {
      console.error(`Unable to fill PDF field ${mapping.pdfFieldName}`, error);
      missingFields.push(`PDF field not found: ${mapping.pdfFieldName}`);
    }
  }

  if (options.flatten) form.flatten({ updateFieldAppearances: false });
  const output = await pdfDoc.save({ updateFieldAppearances: false });
  const pdfBuffer = new ArrayBuffer(output.byteLength);
  new Uint8Array(pdfBuffer).set(output);
  const decedentLastName = matter.decedentLastName.trim() || "Matter";
  const filename = `EstateHornet_PC-200_Draft_${decedentLastName}_${todayIso()}.pdf`.replace(/[^\w.-]+/g, "_");
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });

  return {
    bytes: output,
    blob,
    filename,
    missingFields: Array.from(new Set(missingFields)),
    reviewWarnings: preview.reviewWarnings,
    mappedFieldCount: filledCount,
    totalFieldCount: preview.totalFieldCount,
  };
}

export function buildGeneratedPdfRecord(templateId: string, matter: Matter, generatedBy: string, result: PdfGenerationResult) {
  const template = getPdfTemplate(templateId);
  if (!template) throw new Error(`Unknown PDF template: ${templateId}`);
  return {
    id: makeId("generated-pdf"),
    matterId: matter.id,
    templateId: template.id,
    formNumber: template.formNumber,
    title: template.title,
    fileName: result.filename,
    generatedAt: nowIso(),
    generatedBy,
    status: "review required" as const,
    missingFields: result.missingFields,
    reviewWarnings: result.reviewWarnings,
    mappedFieldCount: result.mappedFieldCount,
    totalFieldCount: result.totalFieldCount,
    notes: "PC-200 draft PDF generated. Attorney/paralegal review required.",
  };
}

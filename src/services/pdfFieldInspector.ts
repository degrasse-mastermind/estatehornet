import { PDFCheckBox, PDFDocument, PDFDropdown, PDFField, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import type { PdfFieldMapping, PdfFieldType, PdfInspectionField, PdfInspectionResult, PdfTemplate } from "../types/pdfForms";
import { getPdfTemplate, PDF_TEMPLATE_NOT_INSTALLED_MESSAGE } from "./pdfTemplateRegistry";

export async function fetchPdfBytes(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(PDF_TEMPLATE_NOT_INSTALLED_MESSAGE);
  }
  const bytes = await response.arrayBuffer();
  const pdfBytes = new Uint8Array(bytes);
  const signature = new TextDecoder().decode(pdfBytes.slice(0, 5));
  if (signature !== "%PDF-") {
    throw new Error(PDF_TEMPLATE_NOT_INSTALLED_MESSAGE);
  }
  return pdfBytes;
}

function inferFieldType(field: PDFField): PdfFieldType {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "list";
  return "unknown";
}

function getFieldNotes(field: PDFField, mapping?: PdfFieldMapping) {
  if (field instanceof PDFTextField && field.isRichFormatted()) {
    return `${mapping?.notes ? `${mapping.notes} ` : ""}Rich-text/XFA field detected; pdf-lib cannot safely read this field. Treat as review-only unless converted/fill-tested.`;
  }
  return mapping?.notes;
}

function getPossibleValues(field: PDFField) {
  if (field instanceof PDFDropdown || field instanceof PDFOptionList || field instanceof PDFRadioGroup) {
    try {
      return field.getOptions();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function mapFields(fields: PDFField[], mappings: PdfFieldMapping[]): PdfInspectionField[] {
  const enabledByName = new Map(mappings.filter((mapping) => mapping.enabled !== false).map((mapping) => [mapping.pdfFieldName, mapping]));
  return fields.map((field) => {
    const name = field.getName();
    const mapping = enabledByName.get(name);
    return {
      name,
      type: inferFieldType(field),
      possibleValues: getPossibleValues(field),
      mapped: Boolean(mapping),
      mappedTo: mapping?.estateHornetPath,
      notes: getFieldNotes(field, mapping),
    };
  });
}

export async function inspectPdfTemplate(templateId: string): Promise<PdfInspectionResult> {
  const template = getPdfTemplate(templateId);
  if (!template) throw new Error(`Unknown PDF template: ${templateId}`);

  try {
    const pdfBytes = await fetchPdfBytes(template.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return {
      template,
      found: true,
      fields: mapFields(fields, template.fields),
      totalFieldCount: fields.length,
      noFillableFields: fields.length === 0,
      message: fields.length === 0
        ? "No fillable AcroForm fields were detected. Coordinate-overlay mapping would be needed in a future phase."
        : undefined,
    };
  } catch (error) {
    console.error("Unable to inspect PDF template", error);
    return {
      template,
      found: false,
      fields: [],
      totalFieldCount: 0,
      noFillableFields: false,
      message: error instanceof Error ? error.message : PDF_TEMPLATE_NOT_INSTALLED_MESSAGE,
    };
  }
}

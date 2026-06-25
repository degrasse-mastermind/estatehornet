import type { DocumentTemplate, DocumentTemplateType, GeneratedDocumentStatus } from "../types";
import { nowIso } from "../utils/date";

function template(input: {
  id: string;
  name: string;
  category: string;
  description: string;
  templateType: DocumentTemplateType;
  body: string;
  defaultStatus?: GeneratedDocumentStatus;
  requiresAttorneyReview?: boolean;
}): DocumentTemplate {
  const stamp = nowIso();
  return {
    defaultStatus: "draft",
    requiresAttorneyReview: true,
    createdAt: stamp,
    updatedAt: stamp,
    mergeFields: Array.from(input.body.matchAll(/{{\s*([^}]+?)\s*}}/g)).map((match) => match[1].trim()),
    ...input,
  };
}

export const starterDocumentTemplates: DocumentTemplate[] = [
  template({
    id: "initial-client-welcome-letter",
    name: "Initial Client Welcome Letter",
    category: "Client communication",
    description: "Welcome letter for a fiduciary/client and early expectations.",
    templateType: "letter",
    body: `DRAFT ONLY - Attorney/paralegal review required before sending.

{{today}}

Dear {{fiduciary.name}},

We are sorry for your loss. This draft letter confirms that our office is beginning the estate administration workflow for {{decedent.fullName}}, whose date of death is currently listed as {{decedent.dateOfDeath}}.

Our current probate court reference is {{probateCourt}}. The matter is assigned internally to {{matter.assignedParalegal}}.

Initial items still needed:
{{matter.initialMissingItems}}

This draft is for internal workflow use only. Attorney/paralegal review is required before any communication is sent.`,
  }),
  template({
    id: "initial-estate-information-request",
    name: "Initial Estate Information Request",
    category: "Client communication",
    description: "Request for core estate information and supporting documents.",
    templateType: "checklist-packet",
    body: `DRAFT ONLY - Attorney/paralegal review required before sending.

Matter: {{decedent.fullName}}
Fiduciary/client: {{fiduciary.name}}
Probate court: {{probateCourt}}

Please gather or confirm the following information where available:

1. Death certificates
2. Original will and any codicils
3. Heir and beneficiary names, addresses, emails, and phone numbers
4. Asset information, statements, and title documents
5. Debts, expenses, and known creditors
6. Funeral bill and related payment information
7. Tax documents and date-of-death value support
8. Real estate deeds, tax bills, mortgage information, and insurance information
9. Current contact information for all interested parties

Known missing items:
{{matter.initialMissingItems}}

This request is a draft workflow aid and must be reviewed before use.`,
  }),
  template({
    id: "institution-dod-value-request",
    name: "Bank/Financial Institution Date-of-Death Value Request",
    category: "Institution letter",
    description: "Draft request for date-of-death values and account information.",
    templateType: "institution-letter",
    body: `DRAFT ONLY - Attorney/paralegal review required before sending.

{{today}}

Re: Estate of {{decedent.fullName}}
Date of death: {{decedent.dateOfDeath}}
Fiduciary: {{fiduciary.name}}
Probate court: {{probateCourt}}
Matter reference: {{matter.reference}}

To whom it may concern:

Please provide date-of-death value information and account documentation for:
{{assets.primaryInstitutionDescription}}

This is a draft request prepared from EstateHornet matter data. Review authority, appointment documentation, and institution-specific requirements before sending.`,
  }),
  template({
    id: "beneficiary-contact-information-request",
    name: "Beneficiary/Heir Contact Information Request",
    category: "Notice",
    description: "Draft request or confirmation for interested party contact information.",
    templateType: "letter",
    body: `DRAFT ONLY - Attorney/paralegal review required before sending.

Matter: Estate of {{decedent.fullName}}

Our records currently list the following interested parties:
{{people.interestedPartiesList}}

Please review and confirm current mailing addresses, email addresses, and phone numbers for interested parties. Do not include confidential identifiers in this prototype draft.

Review required before sending.`,
  }),
  template({
    id: "inventory-preparation-memo",
    name: "Inventory Preparation Memo",
    category: "Court filing support",
    description: "Internal memo for known probate assets and missing valuation documents.",
    templateType: "internal-memo",
    body: `DRAFT INTERNAL MEMO - Attorney/paralegal review required.

Matter: {{decedent.fullName}}
Appointment date: {{fiduciary.appointmentDate}}
Probate court: {{probateCourt}}

Known asset summary:
{{assets.summary}}

Missing valuation/documentation items:
{{assets.missingDocumentationList}}

Related deadlines:
{{tasks.upcomingDeadlines}}

This memo is for PC-2407 preparation support only and is not a completed filing.`,
  }),
  template({
    id: "ct706nt-support-checklist",
    name: "CT-706 NT Support Checklist",
    category: "Tax support",
    description: "Internal checklist for date-of-death values and tax support. No tax conclusions.",
    templateType: "checklist-packet",
    body: `DRAFT INTERNAL CHECKLIST - Attorney/paralegal review required.

Matter: {{decedent.fullName}}
Date of death: {{decedent.dateOfDeath}}
Estimated total asset value: {{estate.estimatedTotalValue}}

Support to gather/review:
- Date-of-death values for all reportable assets
- Asset ownership and beneficiary designations
- Real estate valuation support
- Business interest valuation support, if any
- Debts and expenses support
- Prior taxable gift information, if applicable

Known asset review items:
{{assets.reviewItems}}

No legal or tax conclusion is generated by this checklist. Review required.`,
  }),
  template({
    id: "creditor-claim-period-status-memo",
    name: "Creditor Claim Period Status Memo",
    category: "Creditor",
    description: "Internal memo for claim period status and PC-237 preparation.",
    templateType: "internal-memo",
    body: `DRAFT INTERNAL MEMO - Attorney/paralegal review required.

Matter: {{decedent.fullName}}
Claim period start: {{matter.claimPeriodStartDate}}
Claim period end task: {{tasks.creditorClaimPeriodEnd}}

Known creditors/interested creditor entries:
{{people.creditorsList}}

Related creditor tasks:
{{tasks.creditorTasks}}

This memo supports claim-period tracking and PC-237 preparation. Review required before filing decisions.`,
  }),
  template({
    id: "closing-readiness-memo",
    name: "Closing Readiness Memo",
    category: "Closing",
    description: "Internal summary for accounting, distribution, and closing review.",
    templateType: "closing-document",
    body: `DRAFT INTERNAL MEMO - Attorney/paralegal review required.

Matter: {{decedent.fullName}}
Current stage: {{matter.stage}}
Current status: {{matter.status}}

Open tasks:
{{tasks.openTasks}}

Risk flags:
{{matter.riskFlags}}

Document checklist status:
{{documents.checklistStatus}}

This memo does not determine whether the matter is ready to close. Review required.`,
  }),
  template({
    id: "pc200-helper",
    name: "PC-200 Opening Petition Packet Data Summary",
    category: "Court form helper",
    description: "Drafting aid for opening petition packet data review.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Date of death: {{decedent.dateOfDeath}}
Original will available: {{decedent.originalWillAvailable}}
Named executor: {{fiduciary.namedExecutor}}
Bond waived: {{matter.bondWaived}}
Probate court: {{probateCourt}}

Interested parties:
{{people.interestedPartiesList}}

Missing data:
{{matter.initialMissingItems}}

Risk flags:
{{matter.riskFlags}}`,
  }),
  template({
    id: "pc2407-helper",
    name: "PC-2407 Inventory Data Summary",
    category: "Court form helper",
    description: "Drafting aid for inventory data review.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Appointment date: {{fiduciary.appointmentDate}}

Known assets:
{{assets.summary}}

Missing valuation/documentation:
{{assets.missingDocumentationList}}

Related deadlines:
{{tasks.upcomingDeadlines}}

Related checklist items:
{{documents.courtChecklistItems}}`,
  }),
  template({
    id: "pc237-helper",
    name: "PC-237 Creditor Return Data Summary",
    category: "Court form helper",
    description: "Drafting aid for creditor return data review.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Claim period start: {{matter.claimPeriodStartDate}}

Known creditors:
{{people.creditorsList}}

Creditor tasks:
{{tasks.creditorTasks}}

Related checklist items:
{{documents.courtChecklistItems}}`,
  }),
  template({
    id: "accounting-readiness-helper",
    name: "PC-246/PC-242 Accounting Readiness Summary",
    category: "Court form helper",
    description: "Drafting aid for accounting readiness review.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Current stage: {{matter.stage}}
Open tasks:
{{tasks.openTasks}}

Asset documentation status:
{{assets.missingDocumentationList}}

Document checklist status:
{{documents.checklistStatus}}`,
  }),
  template({
    id: "pc213-helper",
    name: "PC-213 Closing Readiness Summary",
    category: "Court form helper",
    description: "Drafting aid for closing affidavit readiness review.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Current stage: {{matter.stage}}
Current status: {{matter.status}}

Open tasks:
{{tasks.openTasks}}

Risk flags:
{{matter.riskFlags}}

Checklist status:
{{documents.checklistStatus}}`,
  }),
  template({
    id: "ct706nt-helper",
    name: "CT-706 NT Support Data Summary",
    category: "Court form helper",
    description: "Drafting aid for CT-706 NT support review. No legal conclusions.",
    templateType: "court-form-helper",
    body: `COURT FORM HELPER - Drafting aid only. Review official form requirements before filing.

Matter: {{decedent.fullName}}
Date of death: {{decedent.dateOfDeath}}
Estimated total asset value: {{estate.estimatedTotalValue}}

Asset review items:
{{assets.reviewItems}}

Tax-related deadlines:
{{tasks.taxTasks}}

This helper does not decide taxability or filing requirements. Attorney/paralegal review required.`,
  }),
];

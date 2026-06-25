import type { Matter, MergeField } from "../types";
import { currency, formatDate } from "../utils/date";

function decedentName(matter: Matter) {
  return `${matter.decedentFirstName} ${matter.decedentLastName}`.trim();
}

function listOrMissing(items: string[], label: string) {
  const filtered = items.filter(Boolean);
  return filtered.length ? filtered.map((item) => `- ${item}`).join("\n") : `[Missing ${label}]`;
}

function missing(label: string) {
  return `[Missing ${label}]`;
}

function assetTotal(matter: Matter) {
  return matter.assets.reduce((sum, asset) => sum + (Number(asset.estimatedValue) || 0), 0);
}

function nextOpenTask(matter: Matter) {
  return matter.tasks.filter((task) => task.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

export const availableMergeFields: MergeField[] = [
  { group: "Matter", key: "matter.reference", label: "Matter reference", description: "Prototype matter ID/reference.", sourcePath: "Matter.id", fallback: "Missing matter reference", example: "matter-123" },
  { group: "Matter", key: "matter.stage", label: "Matter stage", description: "Current estate administration stage.", sourcePath: "Matter.stage", fallback: "Missing matter stage", example: "Inventory" },
  { group: "Matter", key: "matter.status", label: "Matter status", description: "Current matter status.", sourcePath: "Matter.status", fallback: "Missing matter status", example: "Active" },
  { group: "Matter", key: "matter.assignedParalegal", label: "Assigned paralegal", description: "Assigned internal paralegal/staff member.", sourcePath: "Matter.assignedParalegal", fallback: "Missing assigned paralegal", example: "Avery Staff" },
  { group: "Matter", key: "matter.claimPeriodStartDate", label: "Claim period start date", description: "Configured creditor claim period start date.", sourcePath: "Matter.claimPeriodStartDate", fallback: "Missing claim period start date", example: "May 1, 2026" },
  { group: "Matter", key: "matter.bondWaived", label: "Bond waiver status", description: "Bond waived yes/no/unknown.", sourcePath: "Matter.bondWaived", fallback: "Missing bond waiver status", example: "yes" },
  { group: "Matter", key: "matter.initialMissingItems", label: "Initial missing items", description: "Common missing matter data for opening/client drafts.", sourcePath: "Derived from Matter", fallback: "No missing items identified", example: "- Fiduciary email" },
  { group: "Matter", key: "matter.riskFlags", label: "Risk flags", description: "Current automatic risk flags.", sourcePath: "Matter.riskFlags", fallback: "No risk flags", example: "- Connecticut real estate present: ..." },
  { group: "Decedent", key: "decedent.fullName", label: "Decedent full name", description: "Decedent first and last name.", sourcePath: "Matter.decedentFirstName + decedentLastName", fallback: "Missing decedent full name", example: "Jordan Sample" },
  { group: "Decedent", key: "decedent.dateOfDeath", label: "Date of death", description: "Formatted date of death.", sourcePath: "Matter.dateOfDeath", fallback: "Missing date of death", example: "Feb 25, 2026" },
  { group: "Decedent", key: "decedent.originalWillAvailable", label: "Original will available", description: "Original will availability status.", sourcePath: "Matter.originalWillAvailable", fallback: "Missing original will status", example: "yes" },
  { group: "Fiduciary/client", key: "fiduciary.name", label: "Fiduciary/client name", description: "Client or fiduciary full name.", sourcePath: "Matter.fiduciaryName", fallback: "Missing fiduciary name", example: "Alex Sample" },
  { group: "Fiduciary/client", key: "fiduciary.email", label: "Fiduciary email", description: "Client/fiduciary email.", sourcePath: "Matter.fiduciaryEmail", fallback: "Missing fiduciary email", example: "alex.sample@example.test" },
  { group: "Fiduciary/client", key: "fiduciary.phone", label: "Fiduciary phone", description: "Client/fiduciary phone.", sourcePath: "Matter.fiduciaryPhone", fallback: "Missing fiduciary phone", example: "555-0101" },
  { group: "Fiduciary/client", key: "fiduciary.address", label: "Fiduciary address", description: "Client/fiduciary mailing address.", sourcePath: "Matter.fiduciaryAddress", fallback: "Missing fiduciary address", example: "22 Placeholder Road, West Hartford, CT" },
  { group: "Fiduciary/client", key: "fiduciary.appointmentDate", label: "Appointment date", description: "Formatted fiduciary appointment date.", sourcePath: "Matter.appointmentDate", fallback: "Missing appointment date", example: "Mar 15, 2026" },
  { group: "Fiduciary/client", key: "fiduciary.namedExecutor", label: "Named executor", description: "Named executor from intake.", sourcePath: "Matter.namedExecutor", fallback: "Missing named executor", example: "Alex Sample" },
  { group: "Probate court", key: "probateCourt", label: "Probate court", description: "Selected Connecticut probate court.", sourcePath: "Matter.probateCourt", fallback: "Missing probate court", example: "Hartford Probate Court" },
  { group: "Dates/deadlines", key: "today", label: "Today", description: "Current date.", sourcePath: "System date", fallback: "Missing today", example: "Jun 25, 2026" },
  { group: "Dates/deadlines", key: "tasks.nextDeadline", label: "Next deadline", description: "Next open task due date.", sourcePath: "Matter.tasks", fallback: "Missing next deadline", example: "May 25, 2026" },
  { group: "Dates/deadlines", key: "tasks.upcomingDeadlines", label: "Upcoming deadlines", description: "Open deadlines sorted by due date.", sourcePath: "Matter.tasks", fallback: "No upcoming deadlines", example: "- Inventory due May 25, 2026" },
  { group: "Dates/deadlines", key: "tasks.openTasks", label: "Open tasks", description: "Open task list.", sourcePath: "Matter.tasks", fallback: "No open tasks", example: "- Prepare inventory" },
  { group: "Dates/deadlines", key: "tasks.taxTasks", label: "Tax tasks", description: "Tax-related task list.", sourcePath: "Matter.tasks[category=tax]", fallback: "No tax tasks", example: "- CT-706 NT review" },
  { group: "Dates/deadlines", key: "tasks.creditorTasks", label: "Creditor tasks", description: "Creditor-related task list.", sourcePath: "Matter.tasks[category=creditor]", fallback: "No creditor tasks", example: "- PC-237 return" },
  { group: "Dates/deadlines", key: "tasks.creditorClaimPeriodEnd", label: "Creditor claim period end", description: "Task title/date for claim period end.", sourcePath: "Matter.tasks", fallback: "Missing creditor claim period end", example: "Creditor claim period ends - Sep 30, 2026" },
  { group: "People/interested parties", key: "people.beneficiariesList", label: "Beneficiaries list", description: "Beneficiaries and heirs.", sourcePath: "Matter.people", fallback: "Missing beneficiaries", example: "- Robin Sample, beneficiary" },
  { group: "People/interested parties", key: "people.interestedPartiesList", label: "Interested parties list", description: "All interested parties with contact status.", sourcePath: "Matter.people", fallback: "Missing interested parties", example: "- Alex Sample, fiduciary" },
  { group: "People/interested parties", key: "people.creditorsList", label: "Creditors list", description: "Interested parties marked as creditors.", sourcePath: "Matter.people[role=creditor]", fallback: "No known creditor entries", example: "- Example Creditor" },
  { group: "Assets", key: "estate.estimatedTotalValue", label: "Estimated total value", description: "Sum of estimated asset values.", sourcePath: "Matter.assets.estimatedValue", fallback: "Missing asset values", example: "$48,500" },
  { group: "Assets", key: "assets.summary", label: "Assets summary", description: "Known asset ledger summary.", sourcePath: "Matter.assets", fallback: "Missing asset summary", example: "- Bank account: Example Bank, $42,000" },
  { group: "Assets", key: "assets.primaryInstitutionDescription", label: "Primary institution/asset", description: "First asset description for institution letters.", sourcePath: "Matter.assets[0].description", fallback: "Missing institution or asset description", example: "Example Bank checking account" },
  { group: "Assets", key: "assets.missingDocumentationList", label: "Missing asset documentation", description: "Assets with missing/requested documentation.", sourcePath: "Matter.assets.documentationStatus", fallback: "No missing asset documentation identified", example: "- Brokerage statement requested" },
  { group: "Assets", key: "assets.reviewItems", label: "Asset review items", description: "Assets marked probate/reportable review or business/real estate.", sourcePath: "Matter.assets", fallback: "No asset review items", example: "- Brokerage account requires CT reportable review" },
  { group: "Documents", key: "documents.checklistStatus", label: "Checklist status", description: "Document checklist item statuses.", sourcePath: "Matter.documents", fallback: "Missing document checklist", example: "- Death certificate: received" },
  { group: "Documents", key: "documents.courtChecklistItems", label: "Court checklist items", description: "Court-filing checklist items.", sourcePath: "Matter.documents[category]", fallback: "No court checklist items", example: "- PC-2407 Inventory: draft needed" },
];

function getKnownValue(matter: Matter, fieldKey: string): string | undefined {
  const nextTask = nextOpenTask(matter);
  const openTasks = matter.tasks.filter((task) => task.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const missingItems = getMatterDocumentDataIssues(matter).map((issue) => issue.label);

  const valueMap: Record<string, string | undefined> = {
    "matter.reference": matter.id,
    "matter.stage": matter.stage,
    "matter.status": matter.status,
    "matter.assignedParalegal": matter.assignedParalegal,
    "matter.claimPeriodStartDate": matter.claimPeriodStartDate ? formatDate(matter.claimPeriodStartDate) : undefined,
    "matter.bondWaived": matter.bondWaived,
    "matter.initialMissingItems": missingItems.length ? listOrMissing(missingItems, "initial missing items") : "No common missing items identified.",
    "matter.riskFlags": matter.riskFlags.length
      ? listOrMissing(matter.riskFlags.map((flag) => `${flag.label}: ${flag.description}`), "risk flags")
      : "No automatic risk flags currently detected.",
    "decedent.fullName": decedentName(matter),
    "decedent.dateOfDeath": matter.dateOfDeath ? formatDate(matter.dateOfDeath) : undefined,
    "decedent.originalWillAvailable": matter.originalWillAvailable,
    "fiduciary.name": matter.fiduciaryName,
    "fiduciary.email": matter.fiduciaryEmail,
    "fiduciary.phone": matter.fiduciaryPhone,
    "fiduciary.address": matter.fiduciaryAddress,
    "fiduciary.appointmentDate": matter.appointmentDate ? formatDate(matter.appointmentDate) : undefined,
    "fiduciary.namedExecutor": matter.namedExecutor,
    probateCourt: matter.probateCourt,
    today: formatDate(new Date().toISOString().slice(0, 10)),
    "tasks.nextDeadline": nextTask ? `${nextTask.title} - ${formatDate(nextTask.dueDate)}` : undefined,
    "tasks.upcomingDeadlines": listOrMissing(openTasks.slice(0, 8).map((task) => `${task.title} - ${formatDate(task.dueDate)} (${task.status})`), "upcoming deadlines"),
    "tasks.openTasks": listOrMissing(openTasks.map((task) => `${task.title} - ${formatDate(task.dueDate)} (${task.status})`), "open tasks"),
    "tasks.taxTasks": listOrMissing(matter.tasks.filter((task) => task.category === "tax").map((task) => `${task.title} - ${formatDate(task.dueDate)} (${task.status})`), "tax tasks"),
    "tasks.creditorTasks": listOrMissing(matter.tasks.filter((task) => task.category === "creditor").map((task) => `${task.title} - ${formatDate(task.dueDate)} (${task.status})`), "creditor tasks"),
    "tasks.creditorClaimPeriodEnd": matter.tasks.find((task) => task.title === "Creditor claim period ends")
      ? `${matter.tasks.find((task) => task.title === "Creditor claim period ends")?.title} - ${formatDate(matter.tasks.find((task) => task.title === "Creditor claim period ends")?.dueDate)}`
      : undefined,
    "people.beneficiariesList": listOrMissing(matter.people.filter((person) => ["beneficiary", "heir", "child", "spouse"].includes(person.role)).map((person) => `${person.name || "Unnamed"} (${person.role}) - ${person.address || "address missing"}`), "beneficiaries"),
    "people.interestedPartiesList": listOrMissing(matter.people.map((person) => `${person.name || "Unnamed"} (${person.role}) - ${person.address || "address missing"} - ${person.email || "email missing"}`), "interested parties"),
    "people.creditorsList": listOrMissing(matter.people.filter((person) => person.role === "creditor").map((person) => `${person.name || "Unnamed creditor"} - ${person.address || "address missing"}`), "creditors"),
    "estate.estimatedTotalValue": currency(assetTotal(matter)),
    "assets.summary": listOrMissing(matter.assets.map((asset) => `${asset.assetType}: ${asset.description || "description missing"} - ${currency(asset.estimatedValue)} - probate: ${asset.probateAsset} - docs: ${asset.documentationStatus}`), "asset summary"),
    "assets.primaryInstitutionDescription": matter.assets[0]?.description,
    "assets.missingDocumentationList": listOrMissing(matter.assets.filter((asset) => asset.documentationStatus !== "reviewed").map((asset) => `${asset.description || asset.assetType}: ${asset.documentationStatus}`), "missing asset documentation"),
    "assets.reviewItems": listOrMissing(matter.assets.filter((asset) => asset.probateAsset === "review" || asset.ctTaxableReportable === "review" || asset.assetType === "business interest" || asset.ctRealEstate === "yes").map((asset) => `${asset.description || asset.assetType}: probate ${asset.probateAsset}, CT reportable ${asset.ctTaxableReportable}, docs ${asset.documentationStatus}`), "asset review items"),
    "documents.checklistStatus": listOrMissing(matter.documents.map((doc) => `${doc.name}: ${doc.status}`), "document checklist"),
    "documents.courtChecklistItems": listOrMissing(matter.documents.filter((doc) => /court|pc-|inventory|creditor/i.test(`${doc.category} ${doc.name}`)).map((doc) => `${doc.name}: ${doc.status}`), "court checklist items"),
  };

  return valueMap[fieldKey];
}

export function getMergeFieldValue(matter: Matter, fieldKey: string) {
  const field = availableMergeFields.find((item) => item.key === fieldKey);
  const value = getKnownValue(matter, fieldKey);
  if (value && value.trim()) return value;
  return missing(field?.label.toLowerCase() || fieldKey);
}

export function mergeTemplate(templateBody: string, matter: Matter) {
  return templateBody.replace(/{{\s*([^}]+?)\s*}}/g, (_match, key: string) => getMergeFieldValue(matter, key.trim()));
}

export function validateTemplateFields(templateBody: string, availableFields = availableMergeFields) {
  const used = Array.from(templateBody.matchAll(/{{\s*([^}]+?)\s*}}/g)).map((match) => match[1].trim());
  const known = new Set(availableFields.map((field) => field.key));
  return {
    usedFields: Array.from(new Set(used)),
    unknownFields: Array.from(new Set(used.filter((field) => !known.has(field)))),
  };
}

export function listAvailableMergeFields() {
  return availableMergeFields;
}

export function getMissingMergeFields(templateBody: string, matter: Matter) {
  const { usedFields } = validateTemplateFields(templateBody);
  return usedFields
    .filter((key) => getMergeFieldValue(matter, key).startsWith("[Missing "))
    .map((key) => availableMergeFields.find((field) => field.key === key) || {
      key,
      label: key,
      description: "Unknown merge field.",
      sourcePath: "Unknown",
      fallback: `Missing ${key}`,
      group: "Unknown",
    });
}

export function getMatterDocumentDataIssues(matter: Matter) {
  const issues: Array<{ label: string; description: string; severity: "low" | "medium" | "high" }> = [];
  if (!decedentName(matter)) issues.push({ label: "Decedent full name", description: "Enter decedent first and last name.", severity: "high" });
  if (!matter.dateOfDeath) issues.push({ label: "Date of death", description: "Enter date of death for letters and deadline references.", severity: "high" });
  if (!matter.probateCourt) issues.push({ label: "Probate court", description: "Select or enter probate court.", severity: "medium" });
  if (!matter.fiduciaryName) issues.push({ label: "Fiduciary/client name", description: "Enter fiduciary or client name.", severity: "high" });
  if (!matter.fiduciaryEmail) issues.push({ label: "Fiduciary email", description: "Enter fiduciary/client email if drafts will be sent electronically.", severity: "medium" });
  if (!matter.fiduciaryAddress) issues.push({ label: "Fiduciary address", description: "Enter fiduciary/client mailing address.", severity: "medium" });
  if (!matter.appointmentDate) issues.push({ label: "Appointment date", description: "Enter appointment date if fiduciary has been appointed.", severity: "medium" });
  if (matter.people.some((person) => !person.address)) issues.push({ label: "Interested party addresses", description: "One or more interested parties has no address.", severity: "medium" });
  if (matter.assets.some((asset) => !asset.description)) issues.push({ label: "Asset descriptions", description: "One or more assets needs a clear institution or description.", severity: "medium" });
  if (matter.assets.some((asset) => !asset.estimatedValue)) issues.push({ label: "Asset values", description: "One or more assets has no estimated value.", severity: "medium" });
  if (matter.assets.some((asset) => asset.documentationStatus !== "reviewed")) issues.push({ label: "Documentation statuses", description: "One or more assets still needs document review.", severity: "low" });
  return issues;
}

// Future placeholder: AI-assisted drafting can use this same merge output as
// context for summaries, missing-information checklists, or email refinement.
// Do not add external AI API calls until security and approval workflows exist.

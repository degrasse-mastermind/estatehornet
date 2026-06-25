import type { Asset, Matter, Note, Person, Task } from "../types";
import { generateEstateDeadlines } from "../utils/deadlineEngine";
import { generateDocumentChecklist } from "../utils/documentChecklist";
import { addDays, addMonths, makeId, nowIso, todayIso } from "../utils/date";
import { generateRiskFlags } from "../utils/riskEngine";

function person(input: Omit<Person, "id">): Person {
  return { id: makeId("person"), ...input };
}

function asset(input: Omit<Asset, "id">): Asset {
  return { id: makeId("asset"), ...input };
}

function note(text: string, author = "Avery Staff"): Note {
  return {
    id: makeId("note"),
    text,
    author,
    dateTime: nowIso(),
    visibility: "internal only",
  };
}

function manualTask(input: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const stamp = nowIso();
  return { id: makeId("task"), createdAt: stamp, updatedAt: stamp, manual: true, ...input };
}

function buildMatter(input: Omit<Matter, "id" | "createdAt" | "updatedAt" | "tasks" | "documents" | "generatedDocuments" | "generatedPdfDocuments" | "riskFlags"> & { manualTasks?: Task[]; updatedAt?: string }): Matter {
  const createdAt = nowIso();
  const base: Matter = {
    id: makeId("matter"),
    createdAt,
    updatedAt: input.updatedAt || createdAt,
    tasks: [],
    documents: [],
    generatedDocuments: [],
    generatedPdfDocuments: [],
    riskFlags: [],
    ...input,
  };
  const generated = generateEstateDeadlines(base);
  base.tasks = [...generated, ...(input.manualTasks || [])];
  base.documents = generateDocumentChecklist(base);
  base.riskFlags = generateRiskFlags(base);
  return base;
}

export function createSeedMatters(): Matter[] {
  const today = todayIso();

  const cleanEstate = buildMatter({
    decedentFirstName: "Jordan",
    decedentLastName: "Sample",
    dateOfDeath: addMonths(today, -4),
    dateOfBirth: "1941-03-12",
    decedentAddress: "10 Example Lane",
    decedentCity: "West Hartford",
    decedentState: "CT",
    decedentZip: "06107",
    ctResident: "yes",
    probateCourt: "Hartford Probate Court",
    estateType: "Full estate",
    originalWillAvailable: "yes",
    willDate: "2018-04-02",
    codicils: "no",
    namedExecutor: "Alex Sample",
    bondWaived: "yes",
    attorneyReviewRequired: false,
    fiduciaryName: "Alex Sample",
    fiduciaryRelationship: "child",
    fiduciaryEmail: "alex.sample@example.test",
    fiduciaryPhone: "555-0101",
    fiduciaryAddress: "22 Placeholder Road, West Hartford, CT",
    fiduciaryAppointed: "yes",
    appointmentDate: addMonths(today, -3),
    claimPeriodStartDate: addMonths(today, -3),
    assignedParalegal: "Avery Staff",
    stage: "Inventory",
    status: "Active",
    people: [
      person({ name: "Alex Sample", role: "fiduciary", email: "alex.sample@example.test", phone: "555-0101", address: "22 Placeholder Road, West Hartford, CT", waiverNeeded: "no", waiverReceived: "yes", notes: "Primary client." }),
      person({ name: "Robin Sample", role: "beneficiary", email: "robin.sample@example.test", phone: "555-0102", address: "44 Demo Street, Glastonbury, CT", waiverNeeded: "yes", waiverReceived: "yes", notes: "" }),
    ],
    assets: [
      asset({ assetType: "bank account", description: "Example Bank checking account", ownership: "sole", estimatedValue: 42000, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "reviewed", notes: "Fake seed data only.", ctRealEstate: "no" }),
      asset({ assetType: "vehicle", description: "2015 sample sedan", ownership: "sole", estimatedValue: 6500, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "received", notes: "", ctRealEstate: "no" }),
    ],
    notes: [note("Opening packet reviewed. Inventory values mostly complete.")],
  });
  cleanEstate.tasks = cleanEstate.tasks.map((task, index) => index < 2 ? { ...task, status: "done" } : task);
  cleanEstate.riskFlags = generateRiskFlags(cleanEstate);

  const realEstateMatter = buildMatter({
    decedentFirstName: "Morgan",
    decedentLastName: "Example",
    dateOfDeath: addMonths(today, -2),
    dateOfBirth: "1938-11-08",
    decedentAddress: "90 Fictional Avenue",
    decedentCity: "Fairfield",
    decedentState: "CT",
    decedentZip: "06824",
    ctResident: "yes",
    probateCourt: "Fairfield Probate Court",
    estateType: "Full estate",
    originalWillAvailable: "yes",
    willDate: "2020-06-14",
    codicils: "unknown",
    namedExecutor: "Casey Demo",
    bondWaived: "unknown",
    attorneyReviewRequired: false,
    fiduciaryName: "Casey Demo",
    fiduciaryRelationship: "spouse",
    fiduciaryEmail: "casey.demo@example.test",
    fiduciaryPhone: "555-0110",
    fiduciaryAddress: "90 Fictional Avenue, Fairfield, CT",
    fiduciaryAppointed: "yes",
    appointmentDate: addDays(today, -35),
    claimPeriodStartDate: addDays(today, -35),
    assignedParalegal: "Taylor Probate",
    stage: "Asset collection",
    status: "Waiting on court",
    people: [
      person({ name: "Casey Demo", role: "fiduciary", email: "casey.demo@example.test", phone: "555-0110", address: "90 Fictional Avenue, Fairfield, CT", waiverNeeded: "no", waiverReceived: "yes", notes: "" }),
      person({ name: "Riley Placeholder", role: "beneficiary", email: "riley.placeholder@example.test", phone: "555-0111", address: "3 Sample Court, Stamford, CT", waiverNeeded: "yes", waiverReceived: "no", notes: "Follow up on waiver packet." }),
    ],
    assets: [
      asset({ assetType: "real estate", description: "Fictional Fairfield residence", ownership: "sole", estimatedValue: 685000, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "requested", notes: "Connecticut real estate flag should trigger PC-251 review.", ctRealEstate: "yes" }),
      asset({ assetType: "brokerage", description: "Sample brokerage account", ownership: "POD/TOD", estimatedValue: 210000, probateAsset: "review", ctTaxableReportable: "review", documentationStatus: "requested", notes: "Beneficiary designation pending.", ctRealEstate: "no" }),
    ],
    notes: [note("Court appointment decree received. Land records notice review queued.", "Taylor Probate")],
  });

  const overdueMatter = buildMatter({
    decedentFirstName: "Riley",
    decedentLastName: "Placeholder",
    dateOfDeath: addMonths(today, -7),
    dateOfBirth: "1952-01-25",
    decedentAddress: "5 Prototype Drive",
    decedentCity: "New Haven",
    decedentState: "CT",
    decedentZip: "06510",
    ctResident: "yes",
    probateCourt: "New Haven Probate Court",
    estateType: "Unknown",
    originalWillAvailable: "unknown",
    willDate: "",
    codicils: "unknown",
    namedExecutor: "",
    bondWaived: "unknown",
    attorneyReviewRequired: true,
    fiduciaryName: "Jordan Client",
    fiduciaryRelationship: "child",
    fiduciaryEmail: "jordan.client@example.test",
    fiduciaryPhone: "555-0120",
    fiduciaryAddress: "100 Demo Road, New Haven, CT",
    fiduciaryAppointed: "no",
    appointmentDate: "",
    claimPeriodStartDate: "",
    assignedParalegal: "Jamie Admin",
    stage: "Pre-opening",
    status: "Waiting on client",
    people: [
      person({ name: "Jordan Client", role: "child", email: "jordan.client@example.test", phone: "555-0120", address: "100 Demo Road, New Haven, CT", waiverNeeded: "unknown", waiverReceived: "no", notes: "Client gathering family information." }),
      person({ name: "Unknown Heir Sample", role: "unknown heir", email: "", phone: "", address: "", waiverNeeded: "unknown", waiverReceived: "no", notes: "Needs review before notices." }),
    ],
    assets: [
      asset({ assetType: "business interest", description: "Placeholder LLC membership interest", ownership: "unknown", estimatedValue: 125000, probateAsset: "review", ctTaxableReportable: "review", documentationStatus: "missing", notes: "Business interest valuation review needed.", ctRealEstate: "no" }),
    ],
    notes: [note("Client still searching for original will. Attorney review required before opening strategy.", "Jamie Admin")],
    manualTasks: [
      manualTask({
        title: "Follow up for original will and heir list",
        description: "Client has not provided original will or complete interested party list. Review required before next filing step.",
        dueDate: addDays(today, -10),
        source: "Manual intake follow-up",
        priority: "urgent",
        status: "waiting on client",
        assignedTo: "Jamie Admin",
        category: "client follow-up",
      }),
    ],
    updatedAt: addDays(today, -38),
  });

  return [cleanEstate, realEstateMatter, overdueMatter];
}

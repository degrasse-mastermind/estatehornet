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

  const jonesHopson = buildMatter({
    decedentFirstName: "Jones",
    decedentLastName: "Hopson",
    dateOfDeath: "2026-02-03",
    dateOfBirth: "1944-09-18",
    decedentAddress: "44 Mockingbird Lane",
    decedentCity: "West Hartford",
    decedentState: "CT",
    decedentZip: "06107",
    ctResident: "yes",
    probateCourt: "Hartford Probate Court",
    estateType: "Full estate",
    originalWillAvailable: "yes",
    willDate: "2019-05-14",
    codicils: "yes",
    namedExecutor: "Harper Hopson",
    bondWaived: "unknown",
    attorneyReviewRequired: true,
    fiduciaryName: "Harper Hopson",
    fiduciaryRelationship: "spouse and named executor",
    fiduciaryEmail: "harper.hopson@example.test",
    fiduciaryPhone: "555-0201",
    fiduciaryAddress: "44 Mockingbird Lane, West Hartford, CT 06107",
    fiduciaryAppointed: "yes",
    appointmentDate: "2026-05-15",
    claimPeriodStartDate: "2026-05-15",
    assignedParalegal: "Avery Staff",
    stage: "Opening probate",
    status: "Attorney review",
    people: [
      person({ name: "Harper Hopson", role: "spouse", email: "harper.hopson@example.test", phone: "555-0201", address: "44 Mockingbird Lane, West Hartford, CT 06107", waiverNeeded: "yes", waiverReceived: "no", notes: "Fake surviving spouse record for PC-200 spouse field testing." }),
      person({ name: "Avery Jones", role: "child", email: "avery.jones@example.test", phone: "555-0202", address: "12 Sample Farm Road, Simsbury, CT 06070", waiverNeeded: "yes", waiverReceived: "yes", notes: "Adult child; waiver received in prototype data." }),
      person({ name: "Parker Jones", role: "child", email: "parker.jones@example.test", phone: "555-0203", address: "88 Placeholder Street, New Haven, CT 06510", waiverNeeded: "yes", waiverReceived: "no", notes: "Adult child; waiver follow-up pending." }),
      person({ name: "Quinn Beneficiary", role: "beneficiary", email: "quinn.beneficiary@example.test", phone: "555-0204", address: "9 Fictional Circle, Fairfield, CT 06824", waiverNeeded: "yes", waiverReceived: "no", notes: "Named beneficiary under will for PC-200 beneficiary list testing." }),
      person({ name: "Morgan Trust Demo", role: "beneficiary", email: "morgan.trust.demo@example.test", phone: "555-0205", address: "300 Demo Avenue, Stamford, CT 06901", waiverNeeded: "unknown", waiverReceived: "no", notes: "Possible testamentary trust beneficiary; review required." }),
      person({ name: "Unknown Heir Placeholder", role: "unknown heir", email: "", phone: "", address: "", waiverNeeded: "unknown", waiverReceived: "no", notes: "Intentionally incomplete fake unknown-heir record to test missing-address and locate-person warnings." }),
      person({ name: "Example Medical Center Billing", role: "creditor", email: "billing@example-medical.test", phone: "555-0206", address: "1 Demo Billing Plaza, Hartford, CT 06103", waiverNeeded: "no", waiverReceived: "no", notes: "Fake creditor claim placeholder; no real account numbers." }),
      person({ name: "Taylor Probate Counsel", role: "attorney", email: "taylor.probate@example.test", phone: "555-0207", address: "10 Internal Review Way, Hartford, CT 06106", waiverNeeded: "no", waiverReceived: "no", notes: "Internal fake attorney contact for review workflow." }),
    ],
    assets: [
      asset({ assetType: "real estate", description: "Fictional West Hartford residence, 44 Mockingbird Lane", ownership: "sole", estimatedValue: 525000, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "received", notes: "Fake CT real estate asset to test PC-251 and inventory workflow.", ctRealEstate: "yes" }),
      asset({ assetType: "bank account", description: "Example Community Bank checking ending FAKE-1010", ownership: "sole", estimatedValue: 38500, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "reviewed", notes: "Fake account descriptor only; no real account number.", ctRealEstate: "no" }),
      asset({ assetType: "brokerage", description: "Sample Brokerage TOD account - beneficiary designation under review", ownership: "POD/TOD", estimatedValue: 246000, probateAsset: "review", ctTaxableReportable: "review", documentationStatus: "requested", notes: "Tests probate/reportable review flags and asset summary mapping.", ctRealEstate: "no" }),
      asset({ assetType: "retirement", description: "Prototype IRA with beneficiary confirmation pending", ownership: "beneficiary", estimatedValue: 188000, probateAsset: "no", ctTaxableReportable: "review", documentationStatus: "requested", notes: "Tax reporting review only; fake data.", ctRealEstate: "no" }),
      asset({ assetType: "life insurance", description: "Example Life policy with named beneficiaries", ownership: "beneficiary", estimatedValue: 125000, probateAsset: "no", ctTaxableReportable: "review", documentationStatus: "missing", notes: "Missing declaration page; fake data.", ctRealEstate: "no" }),
      asset({ assetType: "vehicle", description: "2019 Demo SUV", ownership: "sole", estimatedValue: 18500, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "received", notes: "Motor vehicle title copy received in prototype notes.", ctRealEstate: "no" }),
      asset({ assetType: "business interest", description: "Hopson Sample LLC membership interest", ownership: "sole", estimatedValue: 310000, probateAsset: "review", ctTaxableReportable: "review", documentationStatus: "requested", notes: "Business interest valuation review needed; fake entity.", ctRealEstate: "no" }),
      asset({ assetType: "personal property", description: "Household contents and jewelry placeholder schedule", ownership: "sole", estimatedValue: 22000, probateAsset: "yes", ctTaxableReportable: "yes", documentationStatus: "missing", notes: "Needs appraisal/review in fake test matter.", ctRealEstate: "no" }),
    ],
    notes: [
      note("Dense fake Jones Hopson matter for PC-200 PDF generation testing. Do not treat any entry as real client information."),
      note("Unknown heir and missing-address entries are intentionally incomplete to test warning panels.", "Jamie Admin"),
      note("CT real estate, business interest, and tax-review assets included to exercise risk flags and checklist workflows.", "Taylor Probate"),
    ],
    manualTasks: [
      manualTask({
        title: "Prepare PC-200 draft and compare against official instructions",
        description: "Use generated draft only as a preparation aid. Confirm all legal selections and interested-party classifications before filing.",
        dueDate: today,
        source: "Manual PDF testing task",
        priority: "urgent",
        status: "in progress",
        assignedTo: "Avery Staff",
        category: "court filing",
      }),
      manualTask({
        title: "Request missing interested-party addresses",
        description: "Unknown heir placeholder has no mailing address. Document actual locate efforts before any filing reliance.",
        dueDate: addDays(today, 3),
        source: "Manual PDF testing task",
        priority: "high",
        status: "waiting on client",
        assignedTo: "Jamie Admin",
        category: "client follow-up",
      }),
      manualTask({
        title: "Business valuation follow-up",
        description: "Request valuation support for Hopson Sample LLC membership interest.",
        dueDate: addDays(today, 7),
        source: "Manual asset review task",
        priority: "normal",
        status: "waiting on client",
        assignedTo: "Jamie Admin",
        category: "asset collection",
      }),
    ],
  });
  jonesHopson.id = "matter-24fb8ef9-8000-4383-9f6e-756641a2c6f5";
  jonesHopson.documents = jonesHopson.documents.map((doc) =>
    doc.name.startsWith("PC-200 ")
      ? { ...doc, status: "attorney review", notes: `${doc.notes} Dense fake test matter. PC-200 draft PDF generated data requires attorney/paralegal review.` }
      : doc,
  );
  jonesHopson.riskFlags = generateRiskFlags(jonesHopson);

  return [jonesHopson, cleanEstate, realEstateMatter, overdueMatter];
}

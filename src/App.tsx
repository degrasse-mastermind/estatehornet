import { useEffect, useMemo, useState } from "react";
import { assetOwnershipTypes, assetTypes, documentationStatuses, estateTypes, matterStages, matterStatuses, paralegals, personRoles, probateCourts, taskCategories, taskPriorities, taskStatuses } from "./data/constants";
import { getMergeFieldValue, mergeTemplate, getMatterDocumentDataIssues, getMissingMergeFields, listAvailableMergeFields, validateTemplateFields } from "./services/documentMergeService";
import { buildGeneratedPdfRecord, generateFilledPdf, inspectPdfTemplate, preparePdfFillPreview } from "./services/pdfFillService";
import { PDF_TEMPLATE_NOT_INSTALLED_MESSAGE, getPc200Template } from "./services/pdfTemplateRegistry";
import { matterStorage } from "./services/matterStorage";
import { templateStorage } from "./services/templateStorage";
import type { Asset, DocumentChecklistItem, DocumentTemplate, GeneratedDocument, Matter, Note, Person, Task } from "./types";
import type { GeneratedPdfDocument, PdfFillPreview, PdfGenerationResult, PdfInspectionResult } from "./types/pdfForms";
import { currency, formatDate, isDueWithin, isOverdue, makeId, nowIso } from "./utils/date";
import { generateEstateDeadlines } from "./utils/deadlineEngine";
import { generateDocumentChecklist } from "./utils/documentChecklist";
import { generateRiskFlags } from "./utils/riskEngine";

type Route =
  | { page: "dashboard" }
  | { page: "matters" }
  | { page: "new" }
  | { page: "templates" }
  | { page: "merge-fields" }
  | { page: "pdf-forms" }
  | { page: "settings" }
  | { page: "matter"; id: string };

type IntakeMatter = Omit<Matter, "id" | "createdAt" | "updatedAt" | "tasks" | "documents" | "generatedDocuments" | "generatedPdfDocuments" | "notes" | "riskFlags"> & { notes: Note[] };

const emptyPerson = (): Person => ({
  id: makeId("person"),
  name: "",
  role: "beneficiary",
  email: "",
  phone: "",
  address: "",
  waiverNeeded: "unknown",
  waiverReceived: "no",
  notes: "",
});

const emptyAsset = (): Asset => ({
  id: makeId("asset"),
  assetType: "bank account",
  description: "",
  ownership: "unknown",
  estimatedValue: 0,
  probateAsset: "review",
  ctTaxableReportable: "review",
  documentationStatus: "missing",
  notes: "",
  ctRealEstate: "no",
});

const emptyTask = (assignedTo = "Unassigned"): Task => {
  const stamp = nowIso();
  return {
    id: makeId("task"),
    title: "",
    description: "",
    dueDate: "",
    source: "Manual task",
    priority: "normal",
    status: "not started",
    assignedTo,
    category: "internal",
    createdAt: stamp,
    updatedAt: stamp,
    manual: true,
  };
};

const emptyNote = (): Note => ({
  id: makeId("note"),
  text: "",
  author: "Avery Staff",
  dateTime: nowIso(),
  visibility: "internal only",
});

const blankIntakeMatter = (): IntakeMatter => ({
  decedentFirstName: "",
  decedentLastName: "",
  dateOfDeath: "",
  dateOfBirth: "",
  decedentAddress: "",
  decedentCity: "",
  decedentState: "CT",
  decedentZip: "",
  ctResident: "yes",
  probateCourt: "Hartford Probate Court",
  estateType: "Full estate",
  originalWillAvailable: "unknown",
  willDate: "",
  codicils: "unknown",
  namedExecutor: "",
  bondWaived: "unknown",
  attorneyReviewRequired: false,
  fiduciaryName: "",
  fiduciaryRelationship: "",
  fiduciaryEmail: "",
  fiduciaryPhone: "",
  fiduciaryAddress: "",
  fiduciaryAppointed: "no",
  appointmentDate: "",
  claimPeriodStartDate: "",
  assignedParalegal: "Unassigned",
  stage: "Intake",
  status: "Active",
  people: [],
  assets: [],
  notes: [],
});

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return { page: "dashboard" };
  if (hash === "matters") return { page: "matters" };
  if (hash === "new") return { page: "new" };
  if (hash === "templates") return { page: "templates" };
  if (hash === "merge-fields") return { page: "merge-fields" };
  if (hash === "pdf-forms") return { page: "pdf-forms" };
  if (hash === "settings") return { page: "settings" };
  if (hash.startsWith("matter/")) return { page: "matter", id: hash.split("/")[1] };
  return { page: "dashboard" };
}

function routeToHash(route: Route) {
  if (route.page === "dashboard") return "#/";
  if (route.page === "matter") return `#/matter/${route.id}`;
  return `#/${route.page}`;
}

function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  useEffect(() => {
    matterStorage.seedMattersIfEmpty();
    setMatters(matterStorage.getMatters());
    setTemplates(templateStorage.getTemplates());
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = routeToHash(next);
    setRoute(next);
  };

  const refresh = () => setMatters(matterStorage.getMatters());
  const refreshTemplates = () => setTemplates(templateStorage.getTemplates());

  const updateMatter = (id: string, updates: Partial<Matter>) => {
    const updated = matterStorage.updateMatter(id, updates);
    refresh();
    return updated;
  };

  const selectedMatter = route.page === "matter" ? matters.find((matter) => matter.id === route.id) : undefined;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate({ page: "dashboard" })} aria-label="EstateHornet dashboard">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>
            <strong>EstateHornet</strong>
            <small>CT estate command center</small>
          </span>
        </button>
        <nav className="nav-list" aria-label="Primary navigation">
          <NavButton active={route.page === "dashboard"} label="Dashboard" icon="grid" onClick={() => navigate({ page: "dashboard" })} />
          <NavButton active={route.page === "matters" || route.page === "matter"} label="Matters" icon="folder" onClick={() => navigate({ page: "matters" })} />
          <NavButton active={route.page === "new"} label="New Matter" icon="plus" onClick={() => navigate({ page: "new" })} />
          <NavButton active={route.page === "templates"} label="Templates" icon="doc" onClick={() => navigate({ page: "templates" })} />
          <NavButton active={route.page === "merge-fields"} label="Merge Fields" icon="code" onClick={() => navigate({ page: "merge-fields" })} />
          <NavButton active={route.page === "pdf-forms"} label="PDF Forms" icon="doc" onClick={() => navigate({ page: "pdf-forms" })} />
          <NavButton active={route.page === "settings"} label="Settings/About" icon="info" onClick={() => navigate({ page: "settings" })} />
        </nav>
        <div className="sidebar-note">Internal workflow tool only. Deadlines and filings require attorney/paralegal review.</div>
      </aside>

      <main className="main">
        {route.page === "dashboard" && <Dashboard matters={matters} navigate={navigate} />}
        {route.page === "matters" && <MatterList matters={matters} navigate={navigate} />}
        {route.page === "new" && <IntakeWizard onCreate={(matter) => { matterStorage.createMatter(matter); refresh(); navigate({ page: "matter", id: matter.id }); }} />}
        {route.page === "templates" && <TemplatesPage templates={templates} matters={matters} onRefresh={refreshTemplates} />}
        {route.page === "merge-fields" && <MergeFieldsPage matters={matters} />}
        {route.page === "pdf-forms" && <PdfFormsPage />}
        {route.page === "settings" && <SettingsAbout />}
        {route.page === "matter" && selectedMatter && <MatterDetail matter={selectedMatter} templates={templates} updateMatter={updateMatter} navigate={navigate} />}
        {route.page === "matter" && !selectedMatter && <EmptyState title="Matter not found" message="The selected matter may have been deleted or the local prototype data was reset." actionLabel="Back to matters" onAction={() => navigate({ page: "matters" })} />}
      </main>
    </div>
  );
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: "grid" | "folder" | "plus" | "info" | "doc" | "code"; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function Icon({ name }: { name: "grid" | "folder" | "plus" | "info" | "arrow" | "check" | "doc" | "code" }) {
  const paths = {
    grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    folder: <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    info: <path d="M12 17v-6M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
    arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
    check: <path d="M20 6 9 17l-5-5" />,
    doc: <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" />,
    code: <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Dashboard({ matters, navigate }: { matters: Matter[]; navigate: (route: Route) => void }) {
  const openMatters = matters.filter((matter) => matter.status !== "Closed");
  const allTasks = matters.flatMap((matter) => matter.tasks.map((task) => ({ matter, task })));
  const dueSoon = allTasks.filter(({ task }) => isDueWithin(task.dueDate, 14, task.status));
  const overdue = allTasks.filter(({ task }) => isOverdue(task.dueDate, task.status));
  const waitingClient = matters.filter((matter) => matter.status === "Waiting on client");
  const waitingCourt = matters.filter((matter) => matter.status === "Waiting on court");
  const attorneyReview = matters.filter((matter) => matter.status === "Attorney review" || matter.riskFlags.some((flag) => flag.label === "Attorney review required"));
  const recent = [...matters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const stingList = [...overdue, ...dueSoon].sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate)).slice(0, 6);

  return (
    <Page title="Dashboard" kicker="Daily command center" actions={<button className="primary-button" onClick={() => navigate({ page: "new" })}><Icon name="plus" />Create New Matter</button>}>
      <section className="metric-grid">
        <Metric label="Open matters" value={openMatters.length} tone="blue" onClick={() => navigate({ page: "matters" })} />
        <Metric label="Deadlines due in 14 days" value={dueSoon.length} tone="yellow" onClick={() => navigate({ page: "matters" })} />
        <Metric label="Overdue tasks" value={overdue.length} tone="red" onClick={() => navigate({ page: "matters" })} />
        <Metric label="Waiting on client" value={waitingClient.length} tone="yellow" onClick={() => navigate({ page: "matters" })} />
        <Metric label="Waiting on court" value={waitingCourt.length} tone="blue" onClick={() => navigate({ page: "matters" })} />
        <Metric label="Attorney review" value={attorneyReview.length} tone="red" onClick={() => navigate({ page: "matters" })} />
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Sting List</h2>
            <span>Urgent and upcoming work</span>
          </div>
          <div className="stack-list">
            {stingList.map(({ matter, task }) => (
              <button key={`${matter.id}-${task.id}`} className={`task-row ${isOverdue(task.dueDate, task.status) ? "overdue" : ""}`} onClick={() => navigate({ page: "matter", id: matter.id })}>
                <span>
                  <strong>{task.title}</strong>
                  <small>{matter.decedentFirstName} {matter.decedentLastName} · {task.category}</small>
                </span>
                <span className="date-chip">{formatDate(task.dueDate)}</span>
              </button>
            ))}
            {stingList.length === 0 && <p className="muted">No urgent tasks in the next 14 days.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Recently Updated Matters</h2>
            <span>Latest local activity</span>
          </div>
          <div className="stack-list">
            {recent.map((matter) => <MatterMiniRow key={matter.id} matter={matter} onClick={() => navigate({ page: "matter", id: matter.id })} />)}
          </div>
        </section>
      </div>
    </Page>
  );
}

function Metric({ label, value, tone, onClick }: { label: string; value: number; tone: "blue" | "yellow" | "red"; onClick: () => void }) {
  return (
    <button className={`metric-card ${tone}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function MatterList({ matters, navigate }: { matters: Matter[]; navigate: (route: Route) => void }) {
  const [query, setQuery] = useState("");
  const [paralegal, setParalegal] = useState("all");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");

  const filtered = matters.filter((matter) => {
    const haystack = `${matter.decedentFirstName} ${matter.decedentLastName} ${matter.fiduciaryName} ${matter.probateCourt} ${matter.assignedParalegal}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (paralegal !== "all" && matter.assignedParalegal !== paralegal) return false;
    if (stage !== "all" && matter.stage !== stage) return false;
    if (status !== "all" && matter.status !== status) return false;
    if (flagFilter === "client" && matter.status !== "Waiting on client") return false;
    if (flagFilter === "court" && matter.status !== "Waiting on court") return false;
    if (flagFilter === "review" && matter.status !== "Attorney review" && !matter.riskFlags.some((flag) => flag.label === "Attorney review required")) return false;
    if (flagFilter === "overdue" && !matter.tasks.some((task) => isOverdue(task.dueDate, task.status))) return false;
    return true;
  });

  return (
    <Page title="Matters" kicker={`${filtered.length} of ${matters.length} matters`} actions={<button className="primary-button" onClick={() => navigate({ page: "new" })}><Icon name="plus" />New Matter</button>}>
      <section className="filters panel">
        <label>
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Decedent, fiduciary, court..." />
        </label>
        <Select label="Assigned paralegal" value={paralegal} onChange={setParalegal} options={["all", ...paralegals]} />
        <Select label="Stage" value={stage} onChange={setStage} options={["all", ...matterStages]} />
        <Select label="Status" value={status} onChange={setStatus} options={["all", ...matterStatuses]} />
        <Select label="Quick filter" value={flagFilter} onChange={setFlagFilter} options={["all", "client", "court", "review", "overdue"]} />
      </section>
      <section className="matter-list">
        {filtered.map((matter) => <MatterCard key={matter.id} matter={matter} onClick={() => navigate({ page: "matter", id: matter.id })} />)}
        {filtered.length === 0 && <EmptyState title="No matters match the filters" message="Adjust the filters or create a new matter." />}
      </section>
    </Page>
  );
}

function MatterCard({ matter, onClick }: { matter: Matter; onClick: () => void }) {
  const nextTask = getNextTask(matter);
  const tone = matterTone(matter);
  const hasOverdueTasks = matter.tasks.some((task) => isOverdue(task.dueDate, task.status));
  return (
    <button className="matter-card" onClick={onClick}>
      <div className="matter-primary">
        <span className={`status-dot ${tone}`} />
        <div>
          <h3>{matter.decedentFirstName} {matter.decedentLastName}</h3>
          <p>{matter.fiduciaryName || "No fiduciary entered"} · {matter.probateCourt}</p>
        </div>
      </div>
      <div className="matter-meta">
        <Badge>{matter.stage}</Badge>
        <Badge tone={tone}>{matter.status}</Badge>
        {hasOverdueTasks && <Badge tone="red">Overdue</Badge>}
        <span><strong>Next action</strong>{nextTask?.title || "No open task"}</span>
        <span><strong>Next deadline</strong>{nextTask ? formatDate(nextTask.dueDate) : "None"}</span>
        <span><strong>Assigned</strong>{matter.assignedParalegal}</span>
        <span><strong>Date of death</strong>{formatDate(matter.dateOfDeath)}</span>
      </div>
    </button>
  );
}

function MatterMiniRow({ matter, onClick }: { matter: Matter; onClick: () => void }) {
  const nextTask = getNextTask(matter);
  return (
    <button className="mini-row" onClick={onClick}>
      <span>
        <strong>{matter.decedentFirstName} {matter.decedentLastName}</strong>
        <small>{matter.stage} · {matter.assignedParalegal}</small>
      </span>
      <span>{nextTask ? formatDate(nextTask.dueDate) : "No deadline"}</span>
    </button>
  );
}

function IntakeWizard({ onCreate }: { onCreate: (matter: Matter) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<IntakeMatter>(blankIntakeMatter);
  const steps = ["Decedent", "Will / Type", "Fiduciary", "Parties", "Assets", "Review"];

  const setField = <K extends keyof IntakeMatter>(key: K, value: IntakeMatter[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const createMatter = () => {
    const stamp = nowIso();
    const matter: Matter = {
      id: makeId("matter"),
      createdAt: stamp,
      updatedAt: stamp,
      ...draft,
      tasks: [],
      documents: [],
      generatedDocuments: [],
      generatedPdfDocuments: [],
      riskFlags: [],
    };
    matter.tasks = generateEstateDeadlines(matter);
    matter.documents = generateDocumentChecklist(matter);
    matter.riskFlags = generateRiskFlags(matter);
    onCreate(matter);
  };

  return (
    <Page title="New Matter Intake" kicker={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}>
      <div className="wizard">
        <div className="stepper">
          {steps.map((label, index) => <button key={label} className={index === step ? "active" : ""} onClick={() => setStep(index)}>{index + 1}<span>{label}</span></button>)}
        </div>
        <section className="panel form-panel">
          {step === 0 && (
            <FormGrid>
              <Input label="First name" value={draft.decedentFirstName} onChange={(value) => setField("decedentFirstName", value)} required />
              <Input label="Last name" value={draft.decedentLastName} onChange={(value) => setField("decedentLastName", value)} required />
              <Input label="Date of death" type="date" value={draft.dateOfDeath} onChange={(value) => setField("dateOfDeath", value)} required />
              <Input label="Date of birth" type="date" value={draft.dateOfBirth} onChange={(value) => setField("dateOfBirth", value)} />
              <Input label="Last address" value={draft.decedentAddress} onChange={(value) => setField("decedentAddress", value)} className="wide" />
              <Input label="Town/city" value={draft.decedentCity} onChange={(value) => setField("decedentCity", value)} />
              <Input label="State" value={draft.decedentState} onChange={(value) => setField("decedentState", value)} />
              <Input label="Zip" value={draft.decedentZip} onChange={(value) => setField("decedentZip", value)} />
              <Select label="Connecticut resident?" value={draft.ctResident} onChange={(value) => setField("ctResident", value as "yes" | "no")} options={["yes", "no"]} />
              <Select label="Probate court" value={draft.probateCourt} onChange={(value) => setField("probateCourt", value)} options={probateCourts.map((court) => court.name)} />
            </FormGrid>
          )}
          {step === 1 && (
            <FormGrid>
              <Select label="Original will available?" value={draft.originalWillAvailable} onChange={(value) => setField("originalWillAvailable", value as IntakeMatter["originalWillAvailable"])} options={["yes", "no", "unknown"]} />
              <Input label="Date of will" type="date" value={draft.willDate} onChange={(value) => setField("willDate", value)} />
              <Select label="Codicils?" value={draft.codicils} onChange={(value) => setField("codicils", value as IntakeMatter["codicils"])} options={["yes", "no", "unknown"]} />
              <Input label="Named executor" value={draft.namedExecutor} onChange={(value) => setField("namedExecutor", value)} />
              <Select label="Bond waived?" value={draft.bondWaived} onChange={(value) => setField("bondWaived", value as IntakeMatter["bondWaived"])} options={["yes", "no", "unknown"]} />
              <Select label="Estate type" value={draft.estateType} onChange={(value) => setField("estateType", value as IntakeMatter["estateType"])} options={estateTypes} />
              <Input label="Claim period start date" type="date" value={draft.claimPeriodStartDate} onChange={(value) => setField("claimPeriodStartDate", value)} />
              <label className="check-row wide"><input type="checkbox" checked={draft.attorneyReviewRequired} onChange={(event) => setField("attorneyReviewRequired", event.target.checked)} /> Attorney review required</label>
            </FormGrid>
          )}
          {step === 2 && (
            <FormGrid>
              <Input label="Fiduciary/client full name" value={draft.fiduciaryName} onChange={(value) => setField("fiduciaryName", value)} required />
              <Input label="Relationship to decedent" value={draft.fiduciaryRelationship} onChange={(value) => setField("fiduciaryRelationship", value)} />
              <Input label="Email" type="email" value={draft.fiduciaryEmail} onChange={(value) => setField("fiduciaryEmail", value)} />
              <Input label="Phone" value={draft.fiduciaryPhone} onChange={(value) => setField("fiduciaryPhone", value)} />
              <Input label="Address" value={draft.fiduciaryAddress} onChange={(value) => setField("fiduciaryAddress", value)} className="wide" />
              <Select label="Has fiduciary been appointed?" value={draft.fiduciaryAppointed} onChange={(value) => setField("fiduciaryAppointed", value as "yes" | "no")} options={["yes", "no"]} />
              <Input label="Appointment date" type="date" value={draft.appointmentDate} onChange={(value) => setField("appointmentDate", value)} />
              <Select label="Assigned paralegal" value={draft.assignedParalegal} onChange={(value) => setField("assignedParalegal", value)} options={paralegals} />
              <Select label="Stage" value={draft.stage} onChange={(value) => setField("stage", value as IntakeMatter["stage"])} options={matterStages} />
              <Select label="Status" value={draft.status} onChange={(value) => setField("status", value as IntakeMatter["status"])} options={matterStatuses} />
            </FormGrid>
          )}
          {step === 3 && <PeopleEditor people={draft.people} onChange={(people) => setField("people", people)} />}
          {step === 4 && <AssetsEditor assets={draft.assets} onChange={(assets) => setField("assets", assets)} />}
          {step === 5 && <ReviewIntake draft={draft} />}
        </section>
        <div className="wizard-actions">
          <button className="secondary-button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
          {step < steps.length - 1 ? <button className="primary-button" onClick={() => setStep((current) => current + 1)}>Continue<Icon name="arrow" /></button> : <button className="primary-button" onClick={createMatter}>Create Matter<Icon name="check" /></button>}
        </div>
      </div>
    </Page>
  );
}

function MatterDetail({ matter, templates, updateMatter, navigate }: { matter: Matter; templates: DocumentTemplate[]; updateMatter: (id: string, updates: Partial<Matter>) => Matter | undefined; navigate: (route: Route) => void }) {
  const [tab, setTab] = useState("overview");
  const save = (updates: Partial<Matter>) => updateMatter(matter.id, updates);

  return (
    <Page title={`${matter.decedentFirstName} ${matter.decedentLastName}`} kicker={`${matter.stage} · ${matter.probateCourt}`} actions={<button className="secondary-button" onClick={() => navigate({ page: "matters" })}>Back to Matters</button>}>
      <div className="detail-header panel">
        <div>
          <Badge tone={matterTone(matter)}>{matter.status}</Badge>
          <p>{matter.fiduciaryName || "No fiduciary entered"} · assigned to {matter.assignedParalegal}</p>
        </div>
        <div className="detail-actions">
          <Select label="Stage" value={matter.stage} onChange={(value) => save({ stage: value as Matter["stage"] })} options={matterStages} />
          <Select label="Status" value={matter.status} onChange={(value) => save({ status: value as Matter["status"] })} options={matterStatuses} />
        </div>
      </div>
      <div className="tabs">
        {["overview", "people", "assets", "deadlines & tasks", "documents", "notes"].map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}</button>)}
      </div>
      {tab === "overview" && <Overview matter={matter} />}
      {tab === "people" && <PeopleEditor people={matter.people} onChange={(people) => save({ people })} />}
      {tab === "assets" && <AssetsEditor assets={matter.assets} onChange={(assets) => save({ assets })} />}
      {tab === "deadlines & tasks" && <TasksEditor matter={matter} onChange={(tasks) => save({ tasks })} />}
      {tab === "documents" && <DocumentsEditor matter={matter} templates={templates} onChange={save} />}
      {tab === "notes" && <NotesEditor notes={matter.notes} onChange={(notes) => save({ notes })} />}
    </Page>
  );
}

function Overview({ matter }: { matter: Matter }) {
  const openTasks = matter.tasks.filter((task) => task.status !== "done");
  const overdue = matter.tasks.filter((task) => isOverdue(task.dueDate, task.status));
  const totalAssets = matter.assets.reduce((sum, asset) => sum + Number(asset.estimatedValue || 0), 0);
  const nextTask = getNextTask(matter);

  return (
    <div className="overview-grid">
      <section className="panel span-2">
        <div className="panel-heading"><h2>Matter Summary</h2><span>Attorney review recommended for risk-sensitive items</span></div>
        <div className="summary-grid">
          <Readout label="Decedent" value={`${matter.decedentFirstName} ${matter.decedentLastName}`} />
          <Readout label="Date of death" value={formatDate(matter.dateOfDeath)} />
          <Readout label="Fiduciary/client" value={matter.fiduciaryName || "Not entered"} />
          <Readout label="Probate court" value={matter.probateCourt} />
          <Readout label="Current stage" value={matter.stage} />
          <Readout label="Next action" value={nextTask?.title || "No open task"} />
          <Readout label="Next deadline" value={nextTask ? formatDate(nextTask.dueDate) : "None"} />
          <Readout label="Estimated estate value" value={currency(totalAssets)} />
          <Readout label="Overdue item count" value={String(overdue.length)} />
          <Readout label="Open tasks" value={String(openTasks.length)} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><h2>Risk Flags</h2><span>{matter.riskFlags.length} active</span></div>
        <div className="flag-list">
          {matter.riskFlags.map((flag) => (
            <div key={flag.id} className={`risk-flag ${flag.severity}`}>
              <strong>{flag.label}</strong>
              <p>{flag.description}</p>
              <small>{flag.recommendedAction}</small>
            </div>
          ))}
          {matter.riskFlags.length === 0 && <p className="muted">No automatic risk flags currently detected.</p>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><h2>Important Dates</h2><span>Core tracked dates</span></div>
        <Readout label="Date of birth" value={formatDate(matter.dateOfBirth)} />
        <Readout label="Appointment date" value={formatDate(matter.appointmentDate)} />
        <Readout label="Claim period start" value={formatDate(matter.claimPeriodStartDate)} />
        <Readout label="Last updated" value={formatDate(matter.updatedAt.slice(0, 10))} />
      </section>
      <DocumentDataQualityPanel matter={matter} />
      <section className="panel span-2">
        <div className="panel-heading"><h2>Internal Notes Summary</h2><span>Most recent entries</span></div>
        {matter.notes.slice(0, 3).map((note) => <p key={note.id} className="note-preview">{note.text}<small>{note.author} · {formatDate(note.dateTime.slice(0, 10))}</small></p>)}
        {matter.notes.length === 0 && <p className="muted">No internal notes yet.</p>}
      </section>
    </div>
  );
}

function PeopleEditor({ people, onChange }: { people: Person[]; onChange: (people: Person[]) => void }) {
  const [editing, setEditing] = useState<Person | null>(null);
  const savePerson = () => {
    if (!editing) return;
    onChange(people.some((person) => person.id === editing.id) ? people.map((person) => person.id === editing.id ? editing : person) : [...people, editing]);
    setEditing(null);
  };
  return (
    <section className="panel editor-panel">
      <div className="panel-heading"><h2>Interested Parties</h2><button className="secondary-button" onClick={() => setEditing(emptyPerson())}>Add person</button></div>
      <div className="cards-grid">
        {people.map((person) => (
          <article key={person.id} className="record-card">
            <h3>{person.name || "Unnamed person"}</h3>
            <p>{person.role} · waiver needed: {person.waiverNeeded} · received: {person.waiverReceived}</p>
            <small>{person.email || "No email"} · {person.phone || "No phone"}</small>
            <div className="row-actions"><button onClick={() => setEditing(person)}>Edit</button><button onClick={() => onChange(people.filter((item) => item.id !== person.id))}>Delete</button></div>
          </article>
        ))}
      </div>
      {editing && (
        <InlineEditor title="Person details" onCancel={() => setEditing(null)} onSave={savePerson}>
          <FormGrid>
            <Input label="Name" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
            <Select label="Role" value={editing.role} onChange={(value) => setEditing({ ...editing, role: value as Person["role"] })} options={personRoles} />
            <Input label="Email" value={editing.email} onChange={(value) => setEditing({ ...editing, email: value })} />
            <Input label="Phone" value={editing.phone} onChange={(value) => setEditing({ ...editing, phone: value })} />
            <Input label="Address" value={editing.address} onChange={(value) => setEditing({ ...editing, address: value })} className="wide" />
            <Select label="Waiver needed?" value={editing.waiverNeeded} onChange={(value) => setEditing({ ...editing, waiverNeeded: value as Person["waiverNeeded"] })} options={["yes", "no", "unknown"]} />
            <Select label="Waiver received?" value={editing.waiverReceived} onChange={(value) => setEditing({ ...editing, waiverReceived: value as "yes" | "no" })} options={["yes", "no"]} />
            <Input label="Notes" value={editing.notes || ""} onChange={(value) => setEditing({ ...editing, notes: value })} className="wide" />
          </FormGrid>
        </InlineEditor>
      )}
    </section>
  );
}

function AssetsEditor({ assets, onChange }: { assets: Asset[]; onChange: (assets: Asset[]) => void }) {
  const [editing, setEditing] = useState<Asset | null>(null);
  const saveAsset = () => {
    if (!editing) return;
    onChange(assets.some((asset) => asset.id === editing.id) ? assets.map((asset) => asset.id === editing.id ? editing : asset) : [...assets, editing]);
    setEditing(null);
  };
  return (
    <section className="panel editor-panel">
      <div className="panel-heading"><h2>Asset Ledger</h2><button className="secondary-button" onClick={() => setEditing(emptyAsset())}>Add asset</button></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Type</th><th>Description</th><th>Ownership</th><th>Value</th><th>Probate</th><th>CT reportable</th><th>Docs</th><th /></tr></thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.assetType}</td><td>{asset.description || "No description"}</td><td>{asset.ownership}</td><td>{currency(asset.estimatedValue)}</td><td>{asset.probateAsset}</td><td>{asset.ctTaxableReportable}</td><td>{asset.documentationStatus}</td>
                <td className="table-actions"><button onClick={() => setEditing(asset)}>Edit</button><button onClick={() => onChange(assets.filter((item) => item.id !== asset.id))}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <InlineEditor title="Asset details" onCancel={() => setEditing(null)} onSave={saveAsset}>
          <FormGrid>
            <Select label="Asset type" value={editing.assetType} onChange={(value) => setEditing({ ...editing, assetType: value as Asset["assetType"] })} options={assetTypes} />
            <Input label="Institution/description" value={editing.description} onChange={(value) => setEditing({ ...editing, description: value })} />
            <Select label="Ownership" value={editing.ownership} onChange={(value) => setEditing({ ...editing, ownership: value as Asset["ownership"] })} options={assetOwnershipTypes} />
            <Input label="Estimated value" type="number" value={String(editing.estimatedValue)} onChange={(value) => setEditing({ ...editing, estimatedValue: Number(value) })} />
            <Select label="Probate asset?" value={editing.probateAsset} onChange={(value) => setEditing({ ...editing, probateAsset: value as Asset["probateAsset"] })} options={["yes", "no", "review"]} />
            <Select label="CT taxable/reportable?" value={editing.ctTaxableReportable} onChange={(value) => setEditing({ ...editing, ctTaxableReportable: value as Asset["ctTaxableReportable"] })} options={["yes", "no", "review"]} />
            <Select label="Documentation status" value={editing.documentationStatus} onChange={(value) => setEditing({ ...editing, documentationStatus: value as Asset["documentationStatus"] })} options={documentationStatuses} />
            <Select label="Connecticut real estate?" value={editing.ctRealEstate} onChange={(value) => setEditing({ ...editing, ctRealEstate: value as "yes" | "no" })} options={["yes", "no"]} />
            <Input label="Notes" value={editing.notes} onChange={(value) => setEditing({ ...editing, notes: value })} className="wide" />
          </FormGrid>
        </InlineEditor>
      )}
    </section>
  );
}

function TasksEditor({ matter, onChange }: { matter: Matter; onChange: (tasks: Task[]) => void }) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const filtered = matter.tasks
    .filter((task) => statusFilter === "all" || task.status === statusFilter)
    .filter((task) => categoryFilter === "all" || task.category === categoryFilter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const saveTask = () => {
    if (!editing) return;
    const stamped = { ...editing, updatedAt: nowIso() };
    onChange(matter.tasks.some((task) => task.id === stamped.id) ? matter.tasks.map((task) => task.id === stamped.id ? stamped : task) : [...matter.tasks, stamped]);
    setEditing(null);
  };
  return (
    <section className="panel editor-panel">
      <div className="panel-heading"><h2>Deadlines & Tasks</h2><button className="secondary-button" onClick={() => setEditing(emptyTask(matter.assignedParalegal))}>Add manual task</button></div>
      <div className="filters compact">
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["all", ...taskStatuses]} />
        <Select label="Category" value={categoryFilter} onChange={setCategoryFilter} options={["all", ...taskCategories]} />
      </div>
      <div className="stack-list">
        {filtered.map((task) => (
          <article key={task.id} className={`task-card ${isOverdue(task.dueDate, task.status) ? "overdue" : ""} ${isDueWithin(task.dueDate, 14, task.status) ? "soon" : ""}`}>
            <div>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <small>{task.source} · {task.category} · assigned to {task.assignedTo}</small>
            </div>
            <div className="task-card-side">
              <Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "yellow" : "green"}>{task.priority}</Badge>
              <strong>{formatDate(task.dueDate)}</strong>
              <span>{task.status}</span>
              <button onClick={() => onChange(matter.tasks.map((item) => item.id === task.id ? { ...item, status: "done", updatedAt: nowIso() } : item))}>Mark complete</button>
              <button onClick={() => setEditing(task)}>Edit</button>
              <button onClick={() => onChange(matter.tasks.filter((item) => item.id !== task.id))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <InlineEditor title="Task details" onCancel={() => setEditing(null)} onSave={saveTask}>
          <FormGrid>
            <Input label="Title" value={editing.title} onChange={(value) => setEditing({ ...editing, title: value })} className="wide" />
            <Input label="Description" value={editing.description} onChange={(value) => setEditing({ ...editing, description: value })} className="wide" />
            <Input label="Due date" type="date" value={editing.dueDate} onChange={(value) => setEditing({ ...editing, dueDate: value })} />
            <Input label="Source/trigger" value={editing.source} onChange={(value) => setEditing({ ...editing, source: value })} />
            <Select label="Priority" value={editing.priority} onChange={(value) => setEditing({ ...editing, priority: value as Task["priority"] })} options={taskPriorities} />
            <Select label="Status" value={editing.status} onChange={(value) => setEditing({ ...editing, status: value as Task["status"] })} options={taskStatuses} />
            <Input label="Assigned to" value={editing.assignedTo} onChange={(value) => setEditing({ ...editing, assignedTo: value })} />
            <Select label="Category" value={editing.category} onChange={(value) => setEditing({ ...editing, category: value as Task["category"] })} options={taskCategories} />
          </FormGrid>
        </InlineEditor>
      )}
    </section>
  );
}

function DocumentsEditor({ matter, templates, onChange }: { matter: Matter; templates: DocumentTemplate[]; onChange: (updates: Partial<Matter>) => void }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [updateChecklist, setUpdateChecklist] = useState(true);
  const [generatedBy, setGeneratedBy] = useState(matter.assignedParalegal || "Unassigned");
  const [draftBody, setDraftBody] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const missingFields = selectedTemplate ? getMissingMergeFields(selectedTemplate.body, matter) : [];
  const generatedDocuments = matter.generatedDocuments || [];
  const generatedPdfDocuments = matter.generatedPdfDocuments || [];

  const generatePreview = () => {
    if (!selectedTemplate) return;
    setDraftTitle(selectedTemplate.name);
    setDraftBody(mergeTemplate(selectedTemplate.body, matter));
    setDraftNotes(selectedTemplate.requiresAttorneyReview ? "Draft generated for attorney/paralegal review." : "");
    setActiveDocumentId("");
  };

  const saveDraft = () => {
    if (!selectedTemplate || !draftBody.trim()) return;
    const stamp = nowIso();
    const saved: GeneratedDocument = {
      id: activeDocumentId || makeId("generated-doc"),
      matterId: matter.id,
      templateId: selectedTemplate.id,
      title: draftTitle || selectedTemplate.name,
      category: selectedTemplate.category,
      generatedBody: draftBody,
      status: selectedTemplate.requiresAttorneyReview ? "attorney review" : selectedTemplate.defaultStatus,
      generatedAt: activeDocumentId ? generatedDocuments.find((doc) => doc.id === activeDocumentId)?.generatedAt || stamp : stamp,
      updatedAt: stamp,
      generatedBy,
      notes: draftNotes,
      relatedDocumentChecklistItemId: selectedChecklistId || undefined,
    };
    const nextGeneratedDocuments = activeDocumentId
      ? generatedDocuments.map((doc) => doc.id === activeDocumentId ? saved : doc)
      : [saved, ...generatedDocuments];
    const nextDocuments = updateChecklist && selectedChecklistId
      ? matter.documents.map((doc) => doc.id === selectedChecklistId ? { ...doc, status: selectedTemplate.requiresAttorneyReview ? "attorney review" : "drafted" as DocumentChecklistItem["status"] } : doc)
      : matter.documents;
    onChange({ generatedDocuments: nextGeneratedDocuments, documents: nextDocuments });
    setActiveDocumentId(saved.id);
  };

  const loadGenerated = (doc: GeneratedDocument) => {
    setActiveDocumentId(doc.id);
    setSelectedTemplateId(doc.templateId);
    setSelectedChecklistId(doc.relatedDocumentChecklistItemId || "");
    setDraftTitle(doc.title);
    setDraftBody(doc.generatedBody);
    setDraftNotes(doc.notes);
    setGeneratedBy(doc.generatedBy);
  };

  const updateGeneratedDocument = (id: string, updates: Partial<GeneratedDocument>) => {
    onChange({ generatedDocuments: generatedDocuments.map((doc) => doc.id === id ? { ...doc, ...updates, updatedAt: nowIso() } : doc) });
  };

  const updateGeneratedPdfDocument = (id: string, updates: Partial<GeneratedPdfDocument>) => {
    onChange({ generatedPdfDocuments: generatedPdfDocuments.map((doc) => doc.id === id ? { ...doc, ...updates } : doc) });
  };

  return (
    <section className="documents-workspace">
      <div className="panel editor-panel">
        <div className="panel-heading"><h2>Document Checklist</h2><span>Checklist plus generated draft integration</span></div>
        <div className="document-list">
          {matter.documents.map((doc) => (
            <article key={doc.id} className="document-row">
              <div><strong>{doc.name}</strong><small>{doc.category}{doc.relatedDueDate ? ` · related date ${formatDate(doc.relatedDueDate)}` : ""}</small><p>{doc.notes}</p></div>
              <Select label="Status" value={doc.status} onChange={(value) => onChange({ documents: matter.documents.map((item) => item.id === doc.id ? { ...item, status: value as DocumentChecklistItem["status"] } : item) })} options={["not started", "draft needed", "drafted", "attorney review", "ready to send/file", "filed/sent"]} />
            </article>
          ))}
        </div>
      </div>

      <Pc200DraftPanel matter={matter} onChange={onChange} />

      <div className="documents-grid">
        <section className="panel editor-panel">
          <div className="panel-heading"><h2>Generate Draft</h2><span>Draft only; review required</span></div>
          <FormGrid>
            <Select label="Template" value={selectedTemplate?.id || ""} onChange={setSelectedTemplateId} options={templates.map((template) => template.id)} />
            <Select label="Link checklist item" value={selectedChecklistId} onChange={setSelectedChecklistId} options={["", ...matter.documents.map((doc) => doc.id)]} />
            <Input label="Generated by" value={generatedBy} onChange={setGeneratedBy} />
            <label className="check-row"><input type="checkbox" checked={updateChecklist} onChange={(event) => setUpdateChecklist(event.target.checked)} /> Update checklist status on save</label>
          </FormGrid>
          {selectedTemplate && (
            <div className="template-summary">
              <strong>{selectedTemplate.name}</strong>
              <p>{selectedTemplate.description}</p>
              {selectedTemplate.requiresAttorneyReview && <Badge tone="red">Review required</Badge>}
            </div>
          )}
          {missingFields.length > 0 && (
            <div className="warning-box">
              <strong>Missing merge field data</strong>
              <p>{missingFields.map((field) => field.label).join(", ")}</p>
            </div>
          )}
          <button className="primary-button" onClick={generatePreview}>Generate Draft</button>
        </section>

        <section className="panel editor-panel">
          <div className="panel-heading"><h2>Draft Preview</h2><span>Edit before saving</span></div>
          <Input label="Draft title" value={draftTitle} onChange={setDraftTitle} />
          <label>
            <span>Generated body</span>
            <textarea className="document-textarea" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="Generate a draft from a template to preview it here." />
          </label>
          <Input label="Notes" value={draftNotes} onChange={setDraftNotes} />
          <div className="row-actions">
            <button className="primary-small" onClick={saveDraft}>Save draft</button>
            <button onClick={() => copyText(draftBody)}>Copy text</button>
            <button onClick={() => printTextDocument(draftTitle || "EstateHornet Draft", draftBody)}>Print</button>
            <button onClick={() => downloadText(`${draftTitle || "estatehornet-draft"}.txt`, draftBody)}>Download .txt</button>
            <button onClick={() => downloadText(`${draftTitle || "estatehornet-draft"}.html`, `<pre>${escapeHtml(draftBody)}</pre>`)}>Download .html</button>
          </div>
        </section>
      </div>

      <section className="panel editor-panel">
        <div className="panel-heading"><h2>Generated Documents</h2><span>{generatedDocuments.length} saved drafts</span></div>
        <div className="document-list">
          {generatedDocuments.map((doc) => {
            const template = templates.find((item) => item.id === doc.templateId);
            return (
              <article key={doc.id} className="generated-document-row">
                <div>
                  <strong>{doc.title}</strong>
                  <small>{template?.name || "Unknown template"} · {doc.category} · generated {formatDate(doc.generatedAt.slice(0, 10))} · updated {formatDate(doc.updatedAt.slice(0, 10))}</small>
                  {template?.requiresAttorneyReview && <Badge tone="red">Review required</Badge>}
                  <p>{doc.notes || "No notes."}</p>
                </div>
                <div className="generated-actions">
                  <Select label="Status" value={doc.status} onChange={(value) => updateGeneratedDocument(doc.id, { status: value as GeneratedDocument["status"] })} options={["draft", "attorney review", "approved", "sent", "filed", "archived"]} />
                  <Input label="Notes" value={doc.notes} onChange={(value) => updateGeneratedDocument(doc.id, { notes: value })} />
                  <div className="row-actions">
                    <button onClick={() => loadGenerated(doc)}>Preview/Edit</button>
                    <button onClick={() => copyText(doc.generatedBody)}>Copy</button>
                    <button onClick={() => printTextDocument(doc.title, doc.generatedBody)}>Print</button>
                    <button onClick={() => downloadText(`${doc.title}.txt`, doc.generatedBody)}>Download</button>
                    <button onClick={() => onChange({ generatedDocuments: generatedDocuments.filter((item) => item.id !== doc.id) })}>Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
          {generatedDocuments.length === 0 && <p className="muted">No generated drafts saved yet.</p>}
        </div>
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading"><h2>Generated PDF Drafts</h2><span>{generatedPdfDocuments.length} saved metadata records</span></div>
        <div className="document-list">
          {generatedPdfDocuments.map((doc) => (
            <article key={doc.id} className="generated-document-row">
              <div>
                <strong>{doc.formNumber} {doc.title}</strong>
                <small>{doc.fileName} · generated {formatDate(doc.generatedAt.slice(0, 10))} by {doc.generatedBy}</small>
                <Badge tone="red">Draft - review required</Badge>
                <p>{doc.notes || "Generated PDF metadata only; PDF bytes are not stored in localStorage."}</p>
                {doc.missingFields.length > 0 && <small>Missing: {doc.missingFields.join(", ")}</small>}
              </div>
              <div className="generated-actions">
                <Select label="Status" value={doc.status} onChange={(value) => updateGeneratedPdfDocument(doc.id, { status: value as GeneratedPdfDocument["status"] })} options={["draft", "review required", "approved", "filed", "archived"]} />
                <Input label="Notes" value={doc.notes || ""} onChange={(value) => updateGeneratedPdfDocument(doc.id, { notes: value })} />
                <div className="row-actions">
                  <button onClick={() => onChange({ generatedPdfDocuments: generatedPdfDocuments.filter((item) => item.id !== doc.id) })}>Delete metadata</button>
                </div>
              </div>
            </article>
          ))}
          {generatedPdfDocuments.length === 0 && <p className="muted">No generated PDF metadata saved yet.</p>}
        </div>
      </section>
    </section>
  );
}

function Pc200DraftPanel({ matter, onChange }: { matter: Matter; onChange: (updates: Partial<Matter>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<PdfFillPreview | null>(null);
  const [generated, setGenerated] = useState<PdfGenerationResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [generatedBy, setGeneratedBy] = useState(matter.assignedParalegal || "Unassigned");
  const [updateChecklist, setUpdateChecklist] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pc200ChecklistItem = matter.documents.find((doc) => /PC-200 Petition\/Administration or Probate of Will/i.test(doc.name) || /^PC-200\b/i.test(doc.name));

  const loadPreview = async () => {
    setLoading(true);
    setError("");
    try {
      setPreview(await preparePdfFillPreview("pc-200", matter));
    } catch (caught) {
      console.error("Unable to prepare PC-200 preview", caught);
      setError(caught instanceof Error ? caught.message : "Unable to prepare PC-200 preview.");
    } finally {
      setLoading(false);
    }
  };

  const generateDraft = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateFilledPdf("pc-200", matter);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setGenerated(result);
      setPdfUrl(URL.createObjectURL(result.blob));
    } catch (caught) {
      console.error("Unable to generate PC-200 draft PDF", caught);
      setError(caught instanceof Error ? caught.message : "Unable to generate PC-200 draft PDF.");
    } finally {
      setLoading(false);
    }
  };

  const saveMetadata = () => {
    if (!generated) return;
    const record = buildGeneratedPdfRecord("pc-200", matter, generatedBy, generated);
    const nextPdfRecords = [record, ...(matter.generatedPdfDocuments || [])];
    const nextDocuments = updateChecklist && pc200ChecklistItem
      ? matter.documents.map((doc) => doc.id === pc200ChecklistItem.id ? {
        ...doc,
        status: "attorney review" as DocumentChecklistItem["status"],
        notes: `${doc.notes ? `${doc.notes}\n` : ""}PC-200 draft PDF generated. Attorney/paralegal review required.`,
      } : doc)
      : matter.documents;
    onChange({ generatedPdfDocuments: nextPdfRecords, documents: nextDocuments });
  };

  const openInspector = () => {
    window.location.hash = "#/pdf-forms";
  };

  return (
    <section className="panel editor-panel pc200-panel">
      <div className="panel-heading">
        <div>
          <h2>PC-200 Draft PDF</h2>
          <span>Phase 3A official PDF template proof of concept</span>
        </div>
        <button className="primary-small" onClick={() => { setExpanded((current) => !current); if (!expanded && !preview) void loadPreview(); }}>
          {expanded ? "Hide PC-200 prep" : "Prepare PC-200 Draft PDF"}
        </button>
      </div>
      <div className="warning-box">
        <strong>Draft - attorney/paralegal review required</strong>
        <p>Generated PC-200 PDFs are draft preparation aids only. Review official PC-200 instructions and current court requirements before filing.</p>
      </div>
      {expanded && (
        <div className="pc200-workspace">
          <div className="summary-grid">
            <Readout label="Matter" value={`${matter.decedentFirstName} ${matter.decedentLastName}`} />
            <Readout label="Template installed" value={preview?.templateFound ? "Yes" : "No"} />
            <Readout label="Detected PDF fields" value={String(preview?.totalFieldCount || 0)} />
            <Readout label="Mapped fields ready" value={String(preview?.mappedFieldCount || 0)} />
          </div>
          {(!preview?.templateFound || preview.message) && (
            <div className="warning-box">
              <strong>PC-200 template status</strong>
              <p>{preview?.message || PDF_TEMPLATE_NOT_INSTALLED_MESSAGE}</p>
            </div>
          )}
          {error && <div className="warning-box"><strong>PC-200 error</strong><p>{error}</p></div>}
          <FormGrid>
            <Input label="Generated by" value={generatedBy} onChange={setGeneratedBy} />
            <label className="check-row"><input type="checkbox" checked={updateChecklist} onChange={(event) => setUpdateChecklist(event.target.checked)} /> Update PC-200 checklist item to attorney review</label>
          </FormGrid>
          <div className="row-actions">
            <button onClick={openInspector}>Inspect PC-200 Fields</button>
            <button onClick={loadPreview} disabled={loading}>{loading ? "Working..." : "Refresh Preview"}</button>
            <button className="primary-small" onClick={generateDraft} disabled={loading || !preview?.readyToGenerate}>Generate Draft PC-200 PDF</button>
            <button onClick={() => generated && downloadBlob(generated.filename, generated.blob)} disabled={!generated}>Download Draft PDF</button>
            <button onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")} disabled={!pdfUrl}>Open PDF preview</button>
            <button onClick={saveMetadata} disabled={!generated}>Save generated PDF record to matter</button>
          </div>
          {pc200ChecklistItem && <p className="muted">Checklist item: {pc200ChecklistItem.name} is currently {pc200ChecklistItem.status}.</p>}
          {preview && (
            <>
              <div className="warning-list">
                {preview.reviewWarnings.map((warning) => <span key={warning}>{warning}</span>)}
              </div>
              {preview.missingRequiredValues.length > 0 && (
                <div className="warning-box">
                  <strong>Missing matter data</strong>
                  <p>{preview.missingRequiredValues.join(", ")}</p>
                </div>
              )}
              <div className="table-wrap responsive-table">
                <table>
                  <thead><tr><th>Label</th><th>PDF field name</th><th>EstateHornet value</th><th>Status</th></tr></thead>
                  <tbody>
                    {preview.mappedFields.map((field) => (
                      <tr key={`${field.pdfFieldName}-${field.estateHornetPath}`}>
                        <td>{field.label}<small>{field.estateHornetPath}</small></td>
                        <td><code>{field.pdfFieldName}</code></td>
                        <td>{field.value || "Blank / missing"}</td>
                        <td><Badge tone={field.status === "ready" ? "green" : field.status === "missing" ? "red" : "yellow"}>{field.status}</Badge>{field.notes && <small>{field.notes}</small>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function NotesEditor({ notes, onChange }: { notes: Note[]; onChange: (notes: Note[]) => void }) {
  const [draft, setDraft] = useState<Note>(emptyNote);
  const [editing, setEditing] = useState<Note | null>(null);
  const addNote = () => {
    if (!draft.text.trim()) return;
    onChange([{ ...draft, id: makeId("note"), dateTime: nowIso() }, ...notes]);
    setDraft(emptyNote());
  };
  const saveNote = () => {
    if (!editing?.text.trim()) return;
    onChange(notes.map((note) => note.id === editing.id ? editing : note));
    setEditing(null);
  };
  return (
    <section className="panel editor-panel">
      <div className="panel-heading"><h2>Internal Notes</h2><span>All Phase 1 notes remain internal</span></div>
      <FormGrid>
        <Input label="Note text" value={draft.text} onChange={(value) => setDraft({ ...draft, text: value })} className="wide" />
        <Input label="Author" value={draft.author} onChange={(value) => setDraft({ ...draft, author: value })} />
        <Select label="Visibility" value={draft.visibility} onChange={(value) => setDraft({ ...draft, visibility: value as Note["visibility"] })} options={["internal only", "attorney review", "client-shareable draft"]} />
      </FormGrid>
      <button className="primary-button" onClick={addNote}>Add note</button>
      {editing && (
        <InlineEditor title="Edit note" onCancel={() => setEditing(null)} onSave={saveNote}>
          <FormGrid>
            <Input label="Note text" value={editing.text} onChange={(value) => setEditing({ ...editing, text: value })} className="wide" />
            <Input label="Author" value={editing.author} onChange={(value) => setEditing({ ...editing, author: value })} />
            <Select label="Visibility" value={editing.visibility} onChange={(value) => setEditing({ ...editing, visibility: value as Note["visibility"] })} options={["internal only", "attorney review", "client-shareable draft"]} />
          </FormGrid>
        </InlineEditor>
      )}
      <div className="notes-list">
        {notes.map((note) => (
          <article key={note.id} className="note-card">
            <p>{note.text}</p>
            <small>{note.author} · {formatDate(note.dateTime.slice(0, 10))} · {note.visibility}</small>
            <div className="row-actions">
              <button onClick={() => setEditing(note)}>Edit</button>
              <button onClick={() => onChange(notes.filter((item) => item.id !== note.id))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewIntake({ draft }: { draft: IntakeMatter }) {
  const previewMatter: Matter = { id: "preview", createdAt: nowIso(), updatedAt: nowIso(), ...draft, tasks: [], documents: [], generatedDocuments: [], generatedPdfDocuments: [], riskFlags: [] };
  const tasks = generateEstateDeadlines(previewMatter);
  const documents = generateDocumentChecklist(previewMatter);
  const risks = generateRiskFlags({ ...previewMatter, tasks, documents });
  return (
    <div className="review-grid">
      <Readout label="Matter" value={`${draft.decedentFirstName || "New"} ${draft.decedentLastName || "matter"}`} />
      <Readout label="Fiduciary/client" value={draft.fiduciaryName || "Not entered"} />
      <Readout label="Probate court" value={draft.probateCourt} />
      <Readout label="Estate type" value={draft.estateType} />
      <Readout label="Generated tasks" value={String(tasks.length)} />
      <Readout label="Checklist items" value={String(documents.length)} />
      <Readout label="Risk flags" value={String(risks.length)} />
      <p className="muted wide">Creating the matter will save fake/prototype data locally, generate default Connecticut workflow tasks, build the document checklist, and open the matter detail page.</p>
    </div>
  );
}

function PdfFormsPage() {
  const template = getPc200Template();
  const [inspection, setInspection] = useState<PdfInspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const enabledCount = template.fields.filter((field) => field.enabled !== false).length;

  const runInspection = async () => {
    setLoading(true);
    try {
      setInspection(await inspectPdfTemplate(template.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runInspection();
  }, []);

  return (
    <Page title="PDF Forms" kicker="Phase 3A PDF Form Engine">
      <section className="panel editor-panel">
        <div className="panel-heading">
          <div>
            <h2>PC-200 Inspector</h2>
            <span>Dev/admin tool for official fillable PDF field mapping</span>
          </div>
          <button className="primary-small" onClick={runInspection} disabled={loading}>{loading ? "Inspecting..." : "Refresh / reinspect fields"}</button>
        </div>
        <div className="summary-grid">
          <Readout label="Form" value={`${template.formNumber} ${template.title}`} />
          <Readout label="Template path" value={template.filePath} />
          <Readout label="PDF installed" value={inspection?.found ? "Yes" : "No"} />
          <Readout label="Detected fields" value={String(inspection?.totalFieldCount || 0)} />
          <Readout label="Enabled mappings" value={String(enabledCount)} />
          <Readout label="Mapping mode" value={template.mappingMode} />
        </div>
        {!inspection?.found && (
          <div className="warning-box">
            <strong>PC-200 template missing</strong>
            <p>{inspection?.message || PDF_TEMPLATE_NOT_INSTALLED_MESSAGE}</p>
          </div>
        )}
        {inspection?.noFillableFields && (
          <div className="warning-box">
            <strong>No AcroForm fields detected</strong>
            <p>{inspection.message}</p>
          </div>
        )}
        <div className="warning-box">
          <strong>Draft-only form automation</strong>
          <p>Field names may change if the official PDF is updated. Generated PC-200 PDFs are drafts only and require attorney/paralegal review before filing.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>PDF field name</th><th>Type</th><th>Mapped?</th><th>EstateHornet mapping path</th><th>Notes</th></tr></thead>
            <tbody>
              {(inspection?.fields || []).map((field) => (
                <tr key={field.name}>
                  <td><code>{field.name}</code></td>
                  <td>{field.type}</td>
                  <td>{field.mapped ? "yes" : "no"}</td>
                  <td>{field.mappedTo || "Unmapped"}</td>
                  <td>{field.possibleValues?.length ? `Options: ${field.possibleValues.join(", ")}` : field.notes || ""}</td>
                </tr>
              ))}
              {inspection?.found && inspection.fields.length === 0 && (
                <tr><td colSpan={5}>No fillable fields were detected in the installed PC-200 PDF.</td></tr>
              )}
              {!inspection?.found && (
                <tr><td colSpan={5}>Install the official PC-200 PDF to inspect field names.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading"><h2>PC-200 Mapping Status</h2><span>{template.fields.length} logical mappings</span></div>
        <div className="pdf-card-grid">
          {template.fields.map((field) => (
            <article key={`${field.pdfFieldName}-${field.estateHornetPath}`} className="record-card">
              <h3>{field.label}</h3>
              <p>{field.estateHornetPath}</p>
              <small>{field.enabled === false ? "Disabled until inspection" : field.pdfFieldName}</small>
              {field.reviewRequired && <Badge tone="yellow">Review</Badge>}
            </article>
          ))}
        </div>
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading"><h2>Future Forms Placeholder</h2><span>Not implemented in Phase 3A</span></div>
        <div className="roadmap-list">
          {["PC-200CI", "PC-237", "PC-2407/current inventory", "PC-246/PC-242 accounting", "PC-213"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </Page>
  );
}

function SettingsAbout() {
  return (
    <Page title="Settings / About" kicker="Phase 3A Prototype">
      <section className="panel about">
        <h2>EstateHornet</h2>
        <p className="lead">A Connecticut estate administration command center for deadlines, documents, clients, and matter control.</p>
        <div className="warning-box">
          <strong>Internal workflow prototype only</strong>
          <p>EstateHornet is an internal workflow and matter management prototype. It does not provide legal advice. All deadlines, filings, tax issues, distributions, communications, generated drafts, and documents require attorney/paralegal review.</p>
        </div>
        <div className="warning-box">
          <strong>Data warning</strong>
          <p>Do not enter real client data into this prototype unless proper security, authentication, access controls, database controls, and firm approval are in place. localStorage is not secure for confidential production data.</p>
        </div>
        <div className="warning-box">
          <strong>Document generation warning</strong>
          <p>Generated documents are drafts only. Official court forms must be reviewed against current Connecticut Probate Court requirements before filing. Court form helpers are drafting aids, not completed official forms.</p>
        </div>
        <div className="warning-box">
          <strong>PDF Form Engine: Phase 3A Prototype</strong>
          <p>PC-200 support is draft-only. Generated PDFs require attorney/paralegal review, official form versions may change, and the app must use the current official Connecticut Probate Court PDF supplied locally by the firm.</p>
        </div>
        <div className="warning-box">
          <strong>Prototype storage warning</strong>
          <p>Do not use real client data in this localStorage prototype. localStorage is not secure for production legal data, generated PDFs, court filings, tax documents, or confidential estate information.</p>
        </div>
        <h3>Future roadmap</h3>
        <div className="roadmap-list">
          {["Secure database", "Authentication", "Role-based permissions", "Audit logs", "SharePoint/OneDrive integration", "Outlook email draft integration", "Real template governance", "Official PDF form filling if approved", "Client portal", "Secure uploads", "E-signature workflow", "Attorney approval queues", "Production deployment", "AI-assisted draft emails and summaries"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </Page>
  );
}

function TemplatesPage({ templates, matters, onRefresh }: { templates: DocumentTemplate[]; matters: Matter[]; onRefresh: () => void }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [selectedMatterId, setSelectedMatterId] = useState(matters[0]?.id || "");
  const [editingBody, setEditingBody] = useState("");
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedMatter = matters.find((matter) => matter.id === selectedMatterId) || matters[0];
  const validation = selectedTemplate ? validateTemplateFields(selectedTemplate.body) : { usedFields: [], unknownFields: [] };
  const preview = selectedTemplate && selectedMatter ? mergeTemplate(selectedTemplate.body, selectedMatter) : "";

  useEffect(() => {
    if (selectedTemplate) setEditingBody(selectedTemplate.body);
  }, [selectedTemplate?.id]);

  const saveTemplate = () => {
    if (!selectedTemplate) return;
    templateStorage.updateTemplate(selectedTemplate.id, {
      body: editingBody,
      mergeFields: validateTemplateFields(editingBody).usedFields,
    });
    onRefresh();
  };

  return (
    <Page title="Templates" kicker={`${templates.length} local prototype templates`}>
      <section className="panel editor-panel">
        <div className="panel-heading">
          <h2>Template Library</h2>
          <div className="row-actions">
            <button onClick={() => { if (selectedTemplate) { templateStorage.duplicateTemplate(selectedTemplate.id); onRefresh(); } }}>Duplicate selected</button>
            <button onClick={() => { templateStorage.resetTemplates(); onRefresh(); }}>Reset starter templates</button>
          </div>
        </div>
        <div className="template-library">
          <div className="template-list">
            {templates.map((template) => (
              <button key={template.id} className={`template-list-item ${template.id === selectedTemplate?.id ? "active" : ""}`} onClick={() => setSelectedTemplateId(template.id)}>
                <strong>{template.name}</strong>
                <small>{template.category} · {template.templateType}</small>
                {template.requiresAttorneyReview && <Badge tone="red">Review required</Badge>}
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <div className="template-editor">
              <div className="summary-grid">
                <Readout label="Category" value={selectedTemplate.category} />
                <Readout label="Type" value={selectedTemplate.templateType} />
                <Readout label="Merge fields used" value={String(validation.usedFields.length)} />
                <Readout label="Unknown fields" value={String(validation.unknownFields.length)} />
              </div>
              <p className="muted">{selectedTemplate.description}</p>
              <label>
                <span>Template body</span>
                <textarea className="document-textarea" value={editingBody} onChange={(event) => setEditingBody(event.target.value)} />
              </label>
              <div className="row-actions">
                <button className="primary-small" onClick={saveTemplate}>Save local template</button>
                <Select label="Preview with matter" value={selectedMatter?.id || ""} onChange={setSelectedMatterId} options={matters.map((matter) => matter.id)} />
              </div>
              <div className="merge-chip-list">
                {validation.usedFields.map((field) => <span key={field}>{`{{${field}}}`}</span>)}
              </div>
              {validation.unknownFields.length > 0 && <div className="warning-box"><strong>Unknown merge fields</strong><p>{validation.unknownFields.join(", ")}</p></div>}
              <div className="document-preview"><pre>{preview}</pre></div>
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}

function MergeFieldsPage({ matters }: { matters: Matter[] }) {
  const [selectedMatterId, setSelectedMatterId] = useState(matters[0]?.id || "");
  const selectedMatter = matters.find((matter) => matter.id === selectedMatterId) || matters[0];
  const groups = useMemo(() => {
    return listAvailableMergeFields().reduce<Record<string, ReturnType<typeof listAvailableMergeFields>>>((acc, field) => {
      const group = field.group || "Other";
      acc[group] = acc[group] || [];
      acc[group].push(field);
      return acc;
    }, {});
  }, []);

  return (
    <Page title="Merge Fields" kicker="Template reference">
      <section className="panel editor-panel">
        <div className="panel-heading">
          <h2>Available Merge Fields</h2>
          <Select label="Example matter" value={selectedMatter?.id || ""} onChange={setSelectedMatterId} options={matters.map((matter) => matter.id)} />
        </div>
        <div className="merge-field-groups">
          {Object.entries(groups).map(([group, fields]) => (
            <section key={group} className="merge-field-group">
              <h3>{group}</h3>
              <div className="merge-field-list">
                {fields.map((field) => (
                  <article key={field.key} className="merge-field-card">
                    <code>{`{{${field.key}}}`}</code>
                    <strong>{field.label}</strong>
                    <p>{field.description}</p>
                    <small>Source: {field.sourcePath}</small>
                    <Readout label="Example output" value={selectedMatter ? getPreviewFieldValue(selectedMatter, field.key) : field.example || field.fallback} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </Page>
  );
}

function DocumentDataQualityPanel({ matter }: { matter: Matter }) {
  const issues = getMatterDocumentDataIssues(matter);
  return (
    <section className="panel span-2">
      <div className="panel-heading"><h2>Data Needed For Documents</h2><span>{issues.length} items to review</span></div>
      <div className="data-quality-list">
        {issues.map((issue) => (
          <article key={issue.label} className={`risk-flag ${issue.severity}`}>
            <strong>{issue.label}</strong>
            <p>{issue.description}</p>
            <small>Review required before relying on generated drafts.</small>
          </article>
        ))}
        {issues.length === 0 && <p className="muted">Common document-generation fields look complete for this prototype.</p>}
      </div>
    </section>
  );
}

function Page({ title, kicker, actions, children }: { title: string; kicker?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <header className="page-header">
        <div><p>{kicker}</p><h1>{title}</h1></div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
      <footer>Internal workflow tool only. Deadlines and filings require attorney/paralegal review.</footer>
    </>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function Input({ label, value, onChange, type = "text", className = "", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string; required?: boolean }) {
  return (
    <label className={className}>
      <span>{label}{required ? " *" : ""}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T | string; onChange: (value: string) => void; options: readonly T[] | string[] }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function InlineEditor({ title, children, onCancel, onSave }: { title: string; children: React.ReactNode; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="inline-editor">
      <div className="panel-heading"><h3>{title}</h3><div className="row-actions"><button onClick={onCancel}>Cancel</button><button className="primary-small" onClick={onSave}>Save</button></div></div>
      {children}
    </div>
  );
}

function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Readout({ label, value }: { label: string; value: string }) {
  return <div className="readout"><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyState({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return <section className="empty-state panel"><h2>{title}</h2><p>{message}</p>{actionLabel && onAction && <button className="primary-button" onClick={onAction}>{actionLabel}</button>}</section>;
}

function getPreviewFieldValue(matter: Matter, fieldKey: string) {
  return getMergeFieldValue(matter, fieldKey);
}

function copyText(text: string) {
  if (!text.trim()) return;
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function downloadText(filename: string, text: string) {
  if (!text.trim()) return;
  const blob = new Blob([text], { type: filename.endsWith(".html") ? "text/html" : "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[^\w.-]+/g, "-");
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[^\w.-]+/g, "-");
  link.click();
  URL.revokeObjectURL(url);
}

function printTextDocument(title: string, body: string) {
  if (!body.trim()) return;
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.5;margin:40px;white-space:pre-wrap}.review{border:1px solid #d33;padding:10px;margin-bottom:18px;color:#9b1c1c;font-weight:700}</style></head><body><div class="review">Draft only. Attorney/paralegal review required before use.</div>${escapeHtml(body)}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

function getNextTask(matter: Matter) {
  return matter.tasks.filter((task) => task.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

function matterTone(matter: Matter): "green" | "yellow" | "red" | "blue" {
  if (matter.tasks.some((task) => isOverdue(task.dueDate, task.status)) || matter.riskFlags.some((flag) => flag.severity === "high")) return "red";
  if (matter.status === "Waiting on client" || matter.status === "Waiting on court" || matter.status === "Attorney review") return "yellow";
  if (matter.status === "Closed") return "green";
  return "blue";
}

export default App;

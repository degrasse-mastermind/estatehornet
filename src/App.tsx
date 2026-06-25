import { useEffect, useMemo, useState } from "react";
import { assetOwnershipTypes, assetTypes, documentationStatuses, estateTypes, matterStages, matterStatuses, paralegals, personRoles, probateCourts, taskCategories, taskPriorities, taskStatuses } from "./data/constants";
import { matterStorage } from "./services/matterStorage";
import type { Asset, DocumentChecklistItem, Matter, Note, Person, Task } from "./types";
import { currency, formatDate, isDueWithin, isOverdue, makeId, nowIso } from "./utils/date";
import { generateEstateDeadlines } from "./utils/deadlineEngine";
import { generateDocumentChecklist } from "./utils/documentChecklist";
import { generateRiskFlags } from "./utils/riskEngine";

type Route =
  | { page: "dashboard" }
  | { page: "matters" }
  | { page: "new" }
  | { page: "settings" }
  | { page: "matter"; id: string };

type IntakeMatter = Omit<Matter, "id" | "createdAt" | "updatedAt" | "tasks" | "documents" | "notes" | "riskFlags"> & { notes: Note[] };

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

  useEffect(() => {
    matterStorage.seedMattersIfEmpty();
    setMatters(matterStorage.getMatters());
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = routeToHash(next);
    setRoute(next);
  };

  const refresh = () => setMatters(matterStorage.getMatters());

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
          <NavButton active={route.page === "settings"} label="Settings/About" icon="info" onClick={() => navigate({ page: "settings" })} />
        </nav>
        <div className="sidebar-note">Internal workflow tool only. Deadlines and filings require attorney/paralegal review.</div>
      </aside>

      <main className="main">
        {route.page === "dashboard" && <Dashboard matters={matters} navigate={navigate} />}
        {route.page === "matters" && <MatterList matters={matters} navigate={navigate} />}
        {route.page === "new" && <IntakeWizard onCreate={(matter) => { matterStorage.createMatter(matter); refresh(); navigate({ page: "matter", id: matter.id }); }} />}
        {route.page === "settings" && <SettingsAbout />}
        {route.page === "matter" && selectedMatter && <MatterDetail matter={selectedMatter} updateMatter={updateMatter} navigate={navigate} />}
        {route.page === "matter" && !selectedMatter && <EmptyState title="Matter not found" message="The selected matter may have been deleted or the local prototype data was reset." actionLabel="Back to matters" onAction={() => navigate({ page: "matters" })} />}
      </main>
    </div>
  );
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: "grid" | "folder" | "plus" | "info"; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function Icon({ name }: { name: "grid" | "folder" | "plus" | "info" | "arrow" | "check" }) {
  const paths = {
    grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    folder: <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    info: <path d="M12 17v-6M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
    arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
    check: <path d="M20 6 9 17l-5-5" />,
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

function MatterDetail({ matter, updateMatter, navigate }: { matter: Matter; updateMatter: (id: string, updates: Partial<Matter>) => Matter | undefined; navigate: (route: Route) => void }) {
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
      {tab === "documents" && <DocumentsEditor documents={matter.documents} onChange={(documents) => save({ documents })} />}
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

function DocumentsEditor({ documents, onChange }: { documents: DocumentChecklistItem[]; onChange: (documents: DocumentChecklistItem[]) => void }) {
  return (
    <section className="panel editor-panel">
      <div className="panel-heading"><h2>Document Checklist</h2><span>Checklist only; no document generation in Phase 1</span></div>
      <div className="document-list">
        {documents.map((doc) => (
          <article key={doc.id} className="document-row">
            <div><strong>{doc.name}</strong><small>{doc.category}{doc.relatedDueDate ? ` · related date ${formatDate(doc.relatedDueDate)}` : ""}</small><p>{doc.notes}</p></div>
            <Select label="Status" value={doc.status} onChange={(value) => onChange(documents.map((item) => item.id === doc.id ? { ...item, status: value as DocumentChecklistItem["status"] } : item))} options={["not started", "draft needed", "drafted", "attorney review", "ready to send/file", "filed/sent"]} />
          </article>
        ))}
      </div>
    </section>
  );
}

function NotesEditor({ notes, onChange }: { notes: Note[]; onChange: (notes: Note[]) => void }) {
  const [draft, setDraft] = useState<Note>(emptyNote);
  const addNote = () => {
    if (!draft.text.trim()) return;
    onChange([{ ...draft, id: makeId("note"), dateTime: nowIso() }, ...notes]);
    setDraft(emptyNote());
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
      <div className="notes-list">
        {notes.map((note) => <article key={note.id} className="note-card"><p>{note.text}</p><small>{note.author} · {formatDate(note.dateTime.slice(0, 10))} · {note.visibility}</small></article>)}
      </div>
    </section>
  );
}

function ReviewIntake({ draft }: { draft: IntakeMatter }) {
  const previewMatter: Matter = { id: "preview", createdAt: nowIso(), updatedAt: nowIso(), ...draft, tasks: [], documents: [], riskFlags: [] };
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

function SettingsAbout() {
  return (
    <Page title="Settings / About" kicker="Phase 1 Prototype">
      <section className="panel about">
        <h2>EstateHornet</h2>
        <p className="lead">A Connecticut estate administration command center for deadlines, documents, clients, and matter control.</p>
        <div className="warning-box">
          <strong>Internal workflow prototype only</strong>
          <p>EstateHornet is an internal workflow and matter management prototype. It does not provide legal advice. All deadlines, filings, tax issues, distributions, communications, and documents require attorney/paralegal review.</p>
        </div>
        <div className="warning-box">
          <strong>Data warning</strong>
          <p>Do not enter real client data into this prototype unless proper security, authentication, access controls, and firm approval are in place.</p>
        </div>
        <h3>Future roadmap</h3>
        <div className="roadmap-list">
          {["Document generation engine", "PDF form filling", "DOCX template generation", "Client portal", "Secure client document uploads", "Email automation", "Outlook/Microsoft 365 integration", "SharePoint/OneDrive integration", "Supabase/Postgres database adapter", "Secure file storage", "Audit log", "Role-based permissions", "Attorney approval workflow", "AI-assisted draft emails and summaries"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
    </Page>
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

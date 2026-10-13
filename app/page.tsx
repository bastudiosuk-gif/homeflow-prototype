"use client";

import {
  Activity, AlertTriangle, ArrowRight, BarChart3, BedDouble, BellRing, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleGauge, Clock3,
  ClipboardCheck, DoorOpen, FileCheck2, HeartHandshake, Home, Info, LayoutDashboard, Link2, ListChecks,
  LockKeyhole, LogIn, LogOut, Maximize2, Menu, MessageSquareText, Minimize2, MonitorUp, PhoneCall, Pill, Play, Presentation,
  RefreshCcw, Route, ShieldCheck, Sparkles, Stethoscope, Target, TrendingDown,
  UserRoundCheck, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "dashboard" | "board" | "risk" | "journey" | "pharmacy" | "community" | "family" | "escalation" | "integration" | "analytics" | "pilot";
type AccessView = "login" | "welcome" | "app";
type Rag = "Green" | "Amber" | "Red";
type FamilyState = "awaiting" | "confirmed" | "support" | "contact";
type TtoStage = "awaiting-prescription" | "submitted" | "received" | "clarification" | "preparing" | "ready" | "delivered";
type TtoRecord = { stage: TtoStage; submittedAt: string; target: string; priority: "Routine" | "High" | "Urgent"; assignee: string; note: string };
type HandoverStatus = "draft" | "sent" | "read" | "acknowledged" | "clarification" | "accepted";
type HandoverRecord = { team: string; hasChanges: boolean; change: string; action: string; due: string; authorisedBy: string; status: HandoverStatus; note: string };
type ActivityKind = "ward" | "escalation" | "acknowledgement" | "completion" | "family" | "pharmacy" | "handover" | "departure";
type ActivityEntry = { id: string; time: string; kind: ActivityKind; action: string; actor: string; detail: string; previous: string; current: string };
type Patient = { id: string; name: string; ward: string; bed: string; expected: string; rag: Rag; barrier: string; owner: string; deadline: string; family: string; update: string };
type PatientUpdate = { barrierComplete?: boolean; familyState?: FamilyState; familyAlerted?: boolean; familyResponded?: boolean; escalated?: boolean; leftWard?: boolean };
type DemoState = { ttoComplete: boolean; familyState: FamilyState; familyAlerted?: boolean; familyResponded?: boolean; escalated: boolean; patientUpdates?: Record<string, PatientUpdate>; ttoRecords?: Record<string, TtoRecord>; handoverRecords?: Record<string, HandoverRecord>; activityLog?: Record<string, ActivityEntry[]>; updatedAt: number };

const DEMO_STATE_KEY = "homeflow-demo-state-v3";
const DEMO_CHANNEL = "homeflow-demo-sync-v3";
const DEMO_SESSION_KEY = "homeflow-demo-session-v1";
const OFFICIAL_EMAIL = "basintaleuk@gmail.com";
const DEMO_PASSWORD_SHA256 = "51afc6a537a4f50e409c1d71419b5624e5ae9af1e4654f7d75ccd328da705b9b";

const navItems: { id: View; label: string; short: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Executive overview", short: "Overview", icon: LayoutDashboard },
  { id: "board", label: "Ward discharge board", short: "Ward board", icon: ListChecks },
  { id: "journey", label: "Patient journey", short: "Journey", icon: Route },
  { id: "pharmacy", label: "Pharmacy TTO queue", short: "Pharmacy", icon: Pill },
  { id: "community", label: "Community handover", short: "Handover", icon: HeartHandshake },
  { id: "family", label: "Family communication", short: "Family", icon: MessageSquareText },
  { id: "escalation", label: "Barrier escalation", short: "Escalation", icon: BellRing },
  { id: "integration", label: "Existing systems", short: "Integration", icon: Link2 },
  { id: "analytics", label: "Analytics & QI", short: "Analytics", icon: BarChart3 },
  { id: "pilot", label: "The pilot ask", short: "Pilot", icon: Presentation },
];
const wardNavItems = navItems.filter((item) => item.id !== "pharmacy");

const basePatients: Patient[] = [
  { id: "margaret", name: "Margaret T.", ward: "Ward 3", bed: "Bed 12", expected: "Today · 14:00", rag: "Amber", barrier: "TTO medication", owner: "Medical team", deadline: "11:00", family: "Ready to collect", update: "TTO prescribed · 10:18" },
  { id: "david", name: "David R.", ward: "Ward 3", bed: "Bed 08", expected: "Today · 12:30", rag: "Green", barrier: "None — ready to go", owner: "Ward team", deadline: "Complete", family: "Collection confirmed", update: "Summary complete · 10:42" },
  { id: "elsie", name: "Elsie W.", ward: "Ward 3", bed: "Bed 04", expected: "Today · 16:00", rag: "Red", barrier: "Home equipment", owner: "Community team", deadline: "12:00", family: "Support required", update: "Delivery slot unconfirmed · 10:31" },
  { id: "alan", name: "Alan K.", ward: "Ward 3", bed: "Bed 19", expected: "Tomorrow · 10:00", rag: "Amber", barrier: "Therapy review", owner: "Physiotherapy", deadline: "15:00", family: "Awaiting response", update: "Mobility review requested · 09:55" },
  { id: "sadia", name: "Sadia N.", ward: "Ward 3", bed: "Bed 15", expected: "Today · 15:30", rag: "Amber", barrier: "Transport", owner: "Discharge hub", deadline: "13:30", family: "Not collecting", update: "Transport request accepted · 10:07" },
  { id: "grace", name: "Grace P.", ward: "Ward 3", bed: "Bed 02", expected: "Today · 13:15", rag: "Green", barrier: "None — ready to go", owner: "Ward team", deadline: "Complete", family: "Collection confirmed", update: "Discharge medicines received · 10:50" },
  { id: "ibrahim", name: "Ibrahim H.", ward: "Ward 3", bed: "Bed 06", expected: "Tomorrow · 11:00", rag: "Amber", barrier: "Package of care", owner: "Social care", deadline: "16:00", family: "Awaiting response", update: "Care provider contacted · 10:25" },
  { id: "moira", name: "Moira B.", ward: "Ward 3", bed: "Bed 10", expected: "Today · 17:00", rag: "Red", barrier: "Clinical review", owner: "Medical team", deadline: "12:30", family: "Support required", update: "Senior review requested · 10:36" },
  { id: "thomas", name: "Thomas J.", ward: "Ward 3", bed: "Bed 17", expected: "Tomorrow · 12:00", rag: "Amber", barrier: "Community nursing", owner: "Discharge hub", deadline: "14:30", family: "Ready to collect", update: "Referral awaiting acceptance · 10:14" },
  { id: "priya", name: "Priya S.", ward: "Ward 3", bed: "Bed 21", expected: "Today · 14:45", rag: "Green", barrier: "None — ready to go", owner: "Ward team", deadline: "Complete", family: "Collection confirmed", update: "Transport and summary complete · 10:58" },
];

const initialActivityLog: Record<string, ActivityEntry[]> = Object.fromEntries(basePatients.map((patient, index) => {
  const [action, time = "10:00"] = patient.update.split(" · ");
  return [patient.id, [{
    id: `initial-${patient.id}-${index}`,
    time,
    kind: "ward" as ActivityKind,
    action,
    actor: patient.owner,
    detail: "Imported from the fictional ward record.",
    previous: "Awaiting update",
    current: action,
  }]];
}));

const initialTtoRecords: Record<string, TtoRecord> = {
  margaret: { stage: "submitted", submittedAt: "10:18", target: "12:30", priority: "High", assignee: "Main dispensary", note: "Expected discharge today at 14:00." },
  grace: { stage: "ready", submittedAt: "09:24", target: "11:30", priority: "Routine", assignee: "Main dispensary", note: "Ready for ward collection." },
  sadia: { stage: "received", submittedAt: "10:07", target: "13:00", priority: "High", assignee: "Main dispensary", note: "Transport booked for 15:30." },
  priya: { stage: "preparing", submittedAt: "09:58", target: "12:45", priority: "Routine", assignee: "Dispensary bench 2", note: "Clinical screen complete." },
  alan: { stage: "awaiting-prescription", submittedAt: "Not submitted", target: "15:00", priority: "Routine", assignee: "Medical team", note: "Ward has identified likely TTO requirement." },
};

const initialHandoverRecords: Record<string, HandoverRecord> = {
  margaret: { team: "Community Diabetes Team", hasChanges: true, change: "Diabetes management plan updated during admission", action: "Review the verified discharge medication record and monitoring plan; contact the patient within 48 hours.", due: "14 Oct · 12:00", authorisedBy: "Diabetes Specialist Nurse", status: "draft", note: "Clinical detail remains in the approved discharge record." },
  thomas: { team: "Community Nursing Team", hasChanges: true, change: "Wound-care plan revised before discharge", action: "Acknowledge the handover and confirm the first planned community visit.", due: "12 Oct · 10:00", authorisedBy: "Tissue Viability Nurse", status: "sent", note: "Sent in demonstration mode at 10:26." },
  ibrahim: { team: "Community Care Coordinator", hasChanges: true, change: "Package-of-care requirements updated", action: "Confirm whether the revised support plan can start tomorrow morning.", due: "Today · 16:00", authorisedBy: "Discharge Coordinator", status: "read", note: "Read by receiving team at 11:18." },
};

const receivingTeams = [
  "Community Diabetes Team",
  "Community Nursing Team",
  "Community Care Coordinator",
  "District Nursing Team",
  "Hospital at Home",
  "GP Practice",
  "Adult Social Care",
];

const ttoStageCopy: Record<TtoStage, { label: string; owner: string; tone: Rag }> = {
  "awaiting-prescription": { label: "Awaiting prescription", owner: "Medical team", tone: "Amber" },
  submitted: { label: "Submitted to pharmacy", owner: "Pharmacy", tone: "Amber" },
  received: { label: "Received by pharmacy", owner: "Pharmacy", tone: "Amber" },
  clarification: { label: "Ward clarification required", owner: "Ward team", tone: "Red" },
  preparing: { label: "In preparation", owner: "Pharmacy", tone: "Amber" },
  ready: { label: "Ready for collection", owner: "Ward team", tone: "Green" },
  delivered: { label: "Delivered to ward", owner: "Ward team", tone: "Green" },
};

const handoverStatusCopy: Record<HandoverStatus, { label: string; tone: Rag }> = {
  draft: { label: "Draft", tone: "Amber" }, sent: { label: "Sent", tone: "Amber" }, read: { label: "Read", tone: "Amber" },
  acknowledged: { label: "Acknowledged", tone: "Green" }, clarification: { label: "Clarification requested", tone: "Red" }, accepted: { label: "Action accepted", tone: "Green" },
};

const bottlenecks = [
  { label: "TTO / medication", count: 7, share: 31, color: "#005eb8" },
  { label: "Transport", count: 5, share: 22, color: "#2a8c80" },
  { label: "Family availability", count: 4, share: 17, color: "#7c5aa6" },
  { label: "Therapy", count: 3, share: 12, color: "#e28c32" },
  { label: "Equipment", count: 2, share: 8, color: "#d15b5b" },
  { label: "Community care", count: 1, share: 6, color: "#4f7194" },
  { label: "Medical review", count: 1, share: 4, color: "#778393" },
];

const screenCopy: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: "Friday 2 October · Ward 3 demo", title: "Discharge flow, visible at a glance", subtitle: "A single coordination view bringing clinical progress, barriers and family readiness together." },
  board: { eyebrow: "Live coordination view · fictional patients", title: "Ward discharge board", subtitle: "See who is leaving, what is holding them back and who owns the next action." },
  risk: { eyebrow: "Priority view · fictional patients", title: "Patients at risk of discharge delay", subtitle: "See every at-risk patient, the reason for concern, the responsible owner and the next required action." },
  journey: { eyebrow: "HomeFlow intelligence · fictional demo patient", title: "What will unlock this discharge?", subtitle: "Transparent workflow guidance identifies the next action, owner, target and reason—without making a clinical decision." },
  pharmacy: { eyebrow: "Role view · pharmacy operations · fictional patients", title: "TTO work, visible from request to ward", subtitle: "Prioritise expected discharges, update progress and send prescription queries back to the ward for prescriber follow-up without relying on telephone chasing." },
  community: { eyebrow: "Care transition · simulated secure workflow", title: "Close the loop with community teams", subtitle: "Send a structured, verified update and see whether the receiving service has read, acknowledged and accepted the next action." },
  family: { eyebrow: "Simulated communication · nominated contact", title: "Help families prepare before the ward is ready", subtitle: "One clear early alert gives the likely discharge time, manages expectations and makes the family response visible to the ward." },
  escalation: { eyebrow: "Automated detection · demo only", title: "Spot overdue actions before they become lost hours", subtitle: "HomeFlow highlights the barrier, owner and next step—without contacting anyone in this prototype." },
  integration: { eyebrow: "Proposed coordination layer · not a replacement system", title: "Connect and enhance what already exists", subtitle: "HomeFlow brings selected information into a simplified view while each source system keeps its role." },
  analytics: { eyebrow: "Quality improvement · illustrative values", title: "Turn daily friction into measurable learning", subtitle: "Understand where discharge hours are lost and whether a small pilot makes a meaningful difference." },
  pilot: { eyebrow: "Dragons’ Den proposal", title: "Start small. Learn quickly. Scale what works.", subtitle: "A focused ward pilot to test workflow, usability, outcomes and integration feasibility." },
};

function StatusPill({ status }: { status: Rag }) { return <span className={`status-pill status-${status.toLowerCase()}`}><span /> {status}</span>; }
function Button({ children, onClick, variant = "primary", disabled = false, activateOnPointerUp = false }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "quiet" | "success"; disabled?: boolean; activateOnPointerUp?: boolean }) {
  const pointerHandledRef = useRef(false);
  const handlePointerUp = () => {
    if (!activateOnPointerUp || disabled) return;
    pointerHandledRef.current = true;
    onClick?.();
  };
  const handleClick = () => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    onClick?.();
  };
  return <button type="button" className={`button button-${variant}`} onPointerUp={handlePointerUp} onClick={handleClick} disabled={disabled}>{children}</button>;
}

function UnlockDischarge({ patient, barrierComplete, familyState, tto, onFamily, onPharmacy, onEscalation }: { patient: Patient; barrierComplete: boolean; familyState: FamilyState; tto?: TtoRecord; onFamily: () => void; onPharmacy: () => void; onEscalation: () => void }) {
  const familyConfirmed = familyState === "confirmed" || patient.family.toLowerCase().includes("confirmed");
  const remaining = Number(!barrierComplete) + Number(!familyConfirmed);
  const ready = remaining === 0;
  const activeTto = !barrierComplete && tto && tto.stage !== "delivered" ? tto : undefined;
  const ttoActions: Record<TtoStage, string> = {
    "awaiting-prescription": "Submit the discharge prescription",
    submitted: "Acknowledge the TTO in Pharmacy",
    received: "Begin preparing the discharge medicines",
    clarification: "Coordinate Pharmacy’s query with the prescriber",
    preparing: "Complete preparation of the discharge medicines",
    ready: "Collect the discharge medicines from Pharmacy",
    delivered: "Complete the final discharge check",
  };
  const title = ready
    ? "Discharge is unlocked"
    : !barrierComplete
      ? activeTto ? ttoActions[activeTto.stage] : `Complete: ${patient.barrier}`
      : "Confirm the collection or transport plan";
  const owner = ready ? "Ward team" : !barrierComplete ? activeTto ? ttoStageCopy[activeTto.stage].owner : patient.owner : "Ward coordinator";
  const target = ready ? "Complete" : !barrierComplete ? activeTto?.target ?? patient.deadline : patient.expected.split(" · ")[1] ?? "Before discharge";
  const impact = ready
    ? "All recorded dependencies are complete. The patient can move to the final departure check."
    : remaining === 1
      ? "Completing this action clears the final recorded dependency and moves the patient to discharge-ready."
      : `This is the first of ${remaining} remaining dependencies. Family or transport confirmation follows next.`;
  const evidence = ready
    ? "Barrier complete · collection confirmed"
    : !barrierComplete
      ? `${patient.barrier} remains open · latest update: ${patient.update}`
      : `Main barrier complete · family status: ${patient.family}`;
  const handleAction = activeTto ? onPharmacy : !barrierComplete ? onEscalation : onFamily;
  const actionLabel = activeTto ? "Open pharmacy action" : !barrierComplete ? `Coordinate with ${owner}` : "Confirm collection";

  return <section className={`unlock-card ${ready ? "unlock-ready" : `unlock-${patient.rag.toLowerCase()}`}`} aria-labelledby="unlock-title">
    <div className="unlock-header"><div className="unlock-heading"><span className="unlock-mark"><Sparkles size={22} /></span><div><p className="section-kicker">HomeFlow guidance · rules based</p><h2 id="unlock-title">What will unlock this discharge?</h2></div></div><span className={`unlock-count ${ready ? "complete" : ""}`}>{ready ? <CheckCircle2 size={16} /> : <CircleGauge size={16} />}{ready ? "All dependencies complete" : `${remaining} ${remaining === 1 ? "dependency" : "dependencies"} remaining`}</span></div>
    <div className="unlock-body"><div className="unlock-priority"><span>Next best operational action</span><h3>{title}</h3><p>{impact}</p></div><dl className="unlock-details"><div><dt>Owner</dt><dd>{owner}</dd></div><div><dt>Target</dt><dd>{target}</dd></div><div><dt>Why this action</dt><dd>{evidence}</dd></div></dl></div>
    <div className="unlock-footer"><span><ShieldCheck size={16} /> Explainable workflow guidance only — no clinical decision or prediction.</span>{!ready && <Button onClick={handleAction}>{actionLabel}<ArrowRight size={16} /></Button>}</div>
  </section>;
}
function KpiCard({ label, value, note, icon: Icon, tone = "blue", onOpen, destination }: { label: string; value: string | number; note: string; icon: typeof Home; tone?: "blue" | "green" | "amber" | "red" | "purple"; onOpen?: () => void; destination?: string }) {
  const content = <><div className={`kpi-icon tone-${tone}`}><Icon size={19} /></div><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div><div className="kpi-note">{note}</div>{onOpen && <div className="kpi-open">Open {destination}<ArrowRight size={14} /></div>}</>;
  if (onOpen) return <button type="button" className={`kpi-card kpi-card-openable kpi-tone-${tone}`} onClick={onOpen} aria-label={`Open ${destination} for ${label}`}>{content}</button>;
  return <article className={`kpi-card kpi-tone-${tone}`}>{content}</article>;
}

function ExceptionQueue({ patients, onOpen, onViewAll }: { patients: Patient[]; onOpen: (patientId: string) => void; onViewAll: () => void }) {
  const exceptions = patients
    .filter((patient) => patient.rag === "Red" || (patient.rag === "Amber" && patient.expected.startsWith("Today")) || /support required|contact requested/i.test(patient.family))
    .sort((a, b) => Number(b.rag === "Red") - Number(a.rag === "Red"));
  return <section className="exception-panel" aria-labelledby="exception-title">
    <header className="exception-heading"><div><p className="section-kicker">Exception view · no routine updates</p><h2 id="exception-title">Needs attention now</h2><span>Only patients with a current risk, response or time-sensitive action appear here.</span></div><div className="exception-heading-actions"><strong>{exceptions.length}</strong><span>active exceptions</span><button onClick={onViewAll}>View priority list <ArrowRight size={15} /></button></div></header>
    {exceptions.length ? <div className="exception-list">{exceptions.slice(0, 4).map((patient) => {
      const reason = patient.rag === "Red" ? "High priority" : /support required|contact requested/i.test(patient.family) ? "Family response" : "Due today";
      const action = /TTO|medication/i.test(patient.barrier) ? "Pharmacy action needed" : `${patient.owner} action needed`;
      return <button type="button" className={`exception-item exception-${patient.rag.toLowerCase()}`} onClick={() => onOpen(patient.id)} key={patient.id} aria-label={`Open unlock plan for ${patient.name}: ${patient.barrier}`}>
        <span className="exception-rag"><i />{reason}</span><span className="exception-patient"><span className="exception-avatar">{patient.name.charAt(0)}</span><span><strong>{patient.name}</strong><small>{patient.bed} · {patient.expected}</small></span></span><span className="exception-issue"><small>What needs attention</small><strong>{patient.barrier}</strong><em>{action}</em></span><span className="exception-owner"><small>Owner · target</small><strong>{patient.owner}</strong><em>{patient.deadline}</em></span><span className="exception-open">Unlock plan <ChevronRight size={17} /></span>
      </button>;
    })}</div> : <div className="exception-clear"><CheckCircle2 size={26} /><div><strong>No exceptions need attention</strong><span>Routine patients remain available on the ward board.</span></div></div>}
    <footer><ShieldCheck size={15} /> Fictional demonstration data only · Green patients stay out of this queue.</footer>
  </section>;
}

function Dashboard({ ready, atRiskCount, openTtos, pendingHandovers, patients, onNavigate, onOpenPatient }: { ready: boolean; atRiskCount: number; openTtos: number; pendingHandovers: number; patients: Patient[]; onNavigate: (view: View) => void; onOpenPatient: (patientId: string) => void }) {
  return <div className="screen-stack dashboard-stack">
    <section className="kpi-grid" aria-label="Discharge metrics">
      <KpiCard label="Expected today" value={18} note="Across 3 demo wards" icon={Users} destination="ward board" onOpen={() => onNavigate("board")} />
      <KpiCard label="Ready for discharge" value={ready ? 7 : 6} note={ready ? "Margaret is now ready" : "2 awaiting collection"} icon={CheckCircle2} tone="green" destination="ward board" onOpen={() => onNavigate("board")} />
      <KpiCard label="Outstanding barriers" value={ready ? 4 : 5} note={ready ? "1 resolved in demo" : "3 actions due by noon"} icon={AlertTriangle} tone="amber" destination="barrier escalation" onOpen={() => onNavigate("escalation")} />
      <KpiCard label="At risk of delay" value={atRiskCount} note="Open the full priority list" icon={Activity} tone="red" destination="patients at risk" onOpen={() => onNavigate("risk")} />
      <KpiCard label="TTOs in progress" value={openTtos} note="Stages visible on the ward board" icon={Pill} tone="purple" destination="ward board" onOpen={() => onNavigate("board")} />
      <KpiCard label="Community handovers" value={pendingHandovers} note="Awaiting closed-loop confirmation" icon={HeartHandshake} tone="green" destination="community handover" onOpen={() => onNavigate("community")} />
    </section>
    <ExceptionQueue patients={patients} onOpen={onOpenPatient} onViewAll={() => onNavigate("risk")} />
    <section className="content-grid">
      <article className="panel bottleneck-panel"><div className="panel-heading"><div><p className="section-kicker">Operational view</p><h2>Today’s discharge bottlenecks</h2></div><span className="mini-badge">23 open actions</span></div><div className="bottleneck-list">{bottlenecks.map((item) => <div className="bar-row" key={item.label}><div className="bar-meta"><span>{item.label}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(item.share * 2.55, 10)}%`, background: item.color }} /></div></div>)}</div></article>
      <div className="side-stack"><article className="panel readiness-panel"><div className="panel-heading compact"><div><p className="section-kicker">Family readiness</p><h2>{ready ? 79 : 71}% confirmed</h2></div><div className="readiness-ring" style={{ "--progress": `${ready ? 79 : 71}%` } as React.CSSProperties}><Users size={22} /></div></div><div className="readiness-bars"><span style={{ width: `${ready ? 79 : 71}%` }} /></div><div className="legend-row"><span><i className="dot dot-green" /> Confirmed {ready ? 11 : 10}</span><span><i className="dot dot-amber" /> Waiting 3</span><span><i className="dot dot-red" /> Support 1</span></div></article><article className="insight-card"><div className="insight-icon"><Sparkles size={20} /></div><div><p className="section-kicker">Flow insight</p><h3>Medication is today’s biggest opportunity</h3><p>Seven patients are waiting on TTO-related steps. Earlier visibility could protect up to 8.5 discharge hours.</p></div></article></div>
    </section>
  </div>;
}

function RiskPatients({ patients, onJourney, onEscalation, onOverview }: { patients: Patient[]; onJourney: (patientId: string) => void; onEscalation: (patientId: string) => void; onOverview: () => void }) {
  const redCount = patients.filter((patient) => patient.rag === "Red").length;
  const amberCount = patients.filter((patient) => patient.rag === "Amber").length;
  if (!patients.length) return <section className="panel empty-journey"><CheckCircle2 size={34} /><div><p className="section-kicker">No current risks</p><h2>No patients are currently flagged at risk</h2><p>Live discharge and barrier updates have cleared the current risk list.</p></div><Button variant="secondary" onClick={onOverview}>Return to overview</Button></section>;
  return <div className="screen-stack">
    <section className="risk-summary" aria-label="At-risk patient summary"><article><span>Total at risk</span><strong>{patients.length}</strong><small>Require active coordination</small></article><article className="risk-red"><span>High priority</span><strong>{redCount}</strong><small>Red discharge-risk status</small></article><article className="risk-amber"><span>Overdue barrier</span><strong>{amberCount}</strong><small>Amber but beyond target</small></article></section>
    <section className="risk-patient-list" aria-label="Patients at risk of discharge delay">{patients.map((patient) => <article className={`risk-patient-card risk-${patient.rag.toLowerCase()}`} key={patient.id}><header><div><span className="risk-demo-id">DEMO-{String(basePatients.findIndex((item) => item.id === patient.id) + 101)}</span><h2>{patient.name}</h2><p>{patient.ward} · {patient.bed}</p></div><StatusPill status={patient.rag} /></header><div className="risk-detail-grid"><div><span>Expected discharge</span><strong>{patient.expected}</strong></div><div><span>Outstanding barrier</span><strong>{patient.barrier}</strong></div><div><span>Owner and target</span><strong>{patient.owner} · {patient.deadline}</strong></div><div><span>Family readiness</span><strong>{patient.family}</strong></div><div className="risk-latest"><span>Latest update</span><strong>{patient.update}</strong></div></div><footer><Button variant="secondary" onClick={() => onJourney(patient.id)}><Sparkles size={16} /> See unlock plan</Button><Button onClick={() => onEscalation(patient.id)}><BellRing size={16} /> Escalate to {patient.owner}</Button></footer></article>)}</section>
    <div className="risk-privacy"><ShieldCheck size={17} /> Fictional patient names, identifiers and clinical scenarios for demonstration only.</div>
  </div>;
}

function WardBoard({ patients, ttoRecords, onOpen }: { patients: Patient[]; ttoRecords: Record<string, TtoRecord>; onOpen: (patientId: string) => void }) {
  const [filter, setFilter] = useState<"all" | "today" | "risk">("all");
  const todayCount = patients.filter((patient) => patient.expected.startsWith("Today")).length;
  const greenCount = patients.filter((patient) => patient.rag === "Green").length;
  const amberCount = patients.filter((patient) => patient.rag === "Amber").length;
  const redCount = patients.filter((patient) => patient.rag === "Red").length;
  const filteredPatients = filter === "today" ? patients.filter((patient) => patient.expected.startsWith("Today")) : filter === "risk" ? patients.filter((patient) => patient.rag === "Red") : patients;
  const filterLabel = filter === "today" ? "Expected today" : filter === "risk" ? "At risk" : "All patients";
  return <div className="screen-stack ward-board-stack"><div className="board-toolbar"><div className="board-toolbar-copy"><span><i /> Live ward position</span><strong>Ward 3 discharge flow</strong><small>{filterLabel} · showing {filteredPatients.length} of {patients.length} fictional patients</small></div><div className="board-toolbar-controls"><div className="filter-group" aria-label="Filter ward patients">{([{"id":"all","label":"All patients","count":patients.length},{"id":"today","label":"Today","count":todayCount},{"id":"risk","label":"At risk","count":redCount}] as const).map((item) => <button key={item.id} className={`filter ${filter === item.id ? "active" : ""}`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label} <span>{item.count}</span></button>)}</div><div className="board-summary"><span><i className="dot dot-green" /> <strong>{greenCount}</strong> Green</span><span><i className="dot dot-amber" /> <strong>{amberCount}</strong> Amber</span><span><i className="dot dot-red" /> <strong>{redCount}</strong> Red</span></div></div></div>
    <section className="panel table-panel premium-board-table"><div className="table-scroll"><table><thead><tr><th>Patient / location</th><th>Expected discharge</th><th>Status</th><th>Main barrier</th><th>Owner / target</th><th>Family readiness</th><th>Latest update</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filteredPatients.map((p) => <tr key={p.id} className={`board-row rag-${p.rag.toLowerCase()} ${p.id === "margaret" ? "focus-row" : ""}`}><td><div className="patient-cell"><span className="patient-avatar">{p.name.charAt(0)}</span><div><div className="patient-name">{p.name}</div><div className="muted">{p.ward} / {p.bed}</div></div></div></td><td><strong className="discharge-day">{p.expected.split(" · ")[0]}</strong><div className="muted">{p.expected.split(" · ")[1]}</div></td><td><StatusPill status={p.rag} /></td><td><strong>{p.barrier}</strong></td><td><strong>{p.owner}</strong><div className="muted">Target {p.deadline}</div></td><td><div className="family-state"><UserRoundCheck size={16} /> {p.family}</div></td><td><span className="latest-update"><i />{p.update}</span></td><td><button className="row-open-button" aria-label={`See what will unlock discharge for ${p.name}`} onClick={() => onOpen(p.id)}>Unlock plan <ChevronRight size={16} /></button></td></tr>)}</tbody></table></div><div className="table-foot"><Info size={16} /><span>{filterLabel}: {filteredPatients.length} fictional patient{filteredPatients.length === 1 ? "" : "s"}. Select a patient to see what will unlock their discharge.</span><strong><RefreshCcw size={14} /> Synced with ward display</strong></div></section>
    <section className="mobile-patient-list" aria-label={`${filterLabel} on the phone-friendly ward discharge board`}>{filteredPatients.map((patient) => { const tto = ttoRecords[patient.id]; return <article className={`mobile-patient-card rag-${patient.rag.toLowerCase()}`} key={patient.id}>
      <header><div className="mobile-patient-identity"><span className="patient-avatar">{patient.name.charAt(0)}</span><div><span className="mobile-demo-id">DEMO-{String(basePatients.findIndex((item) => item.id === patient.id) + 101)}</span><h2>{patient.name}</h2><p>{patient.ward} · {patient.bed.replace("Bed ", "Bed D-")}</p></div></div><StatusPill status={patient.rag} /></header>
      <div className="mobile-patient-grid"><div><span>Expected discharge</span><strong>{patient.expected}</strong></div><div><span>Main barrier</span><strong>{patient.barrier}</strong></div><div><span>Owner / target</span><strong>{patient.owner} · {patient.deadline}</strong></div><div><span>Family readiness</span><strong>{patient.family}</strong></div></div>
      <button className={`mobile-pharmacy-status ${tto ? `stage-${ttoStageCopy[tto.stage].tone.toLowerCase()}` : "stage-none"}`} onClick={() => onOpen(patient.id)} aria-label={`${patient.name} pharmacy status: ${tto ? ttoStageCopy[tto.stage].label : "No active TTO"}. Open patient journey`}><span className="mobile-pharmacy-icon"><Pill size={18} /></span><span><small>Pharmacy status</small><strong>{tto ? ttoStageCopy[tto.stage].label : "No active TTO"}</strong>{tto ? <em>Owner: {ttoStageCopy[tto.stage].owner} · Target {tto.target}</em> : <em>No pharmacy action currently recorded</em>}</span><ChevronRight size={19} /></button>
      <div className="mobile-patient-footer"><span>{patient.update}</span><button onClick={() => onOpen(patient.id)} aria-label={`See what will unlock discharge for fictional patient ${patient.name}`}>See what unlocks <ChevronRight size={18} /></button></div>
    </article>; })}<div className="mobile-privacy-note"><Info size={16} /> Fictional names, demo IDs and bed numbers only.</div></section>
  </div>;
}

function ActivityTrail({ patient, entries }: { patient: Patient; entries: ActivityEntry[] }) {
  return <section className="panel activity-trail" aria-label={`Activity and accountability trail for ${patient.name}`}>
    <div className="panel-heading"><div><p className="section-kicker">Activity &amp; accountability</p><h2>{patient.name} · who did what and when</h2></div><span className="mini-badge"><ShieldCheck size={14} /> Demo audit trail</span></div>
    <div className="activity-list">{entries.length ? entries.map((entry) => <article className={`activity-entry activity-${entry.kind}`} key={entry.id}>
      <time>{entry.time}</time><div className="activity-marker"><Activity size={15} /></div><div className="activity-copy"><div><strong>{entry.action}</strong><span>{entry.actor}</span></div><p>{entry.detail}</p><dl><div><dt>Previous</dt><dd>{entry.previous}</dd></div><ChevronRight size={15} /><div><dt>Now</dt><dd>{entry.current}</dd></div></dl></div>
    </article>) : <div className="activity-empty"><Clock3 size={22} /><p>No prototype actions have been recorded for this patient yet.</p></div>}</div>
    <div className="activity-safety"><Info size={16} /> Demonstration entries only. A live service would use authenticated users, immutable timestamps and the approved clinical record.</div>
  </section>;
}

function Journey({ patient, barrierComplete, familyState, tto, handover, activity, onBarrier, onFamily, onPatientLeft, onCommunity, onPharmacy, onEscalation }: { patient: Patient; barrierComplete: boolean; familyState: FamilyState; tto?: TtoRecord; handover?: HandoverRecord; activity: ActivityEntry[]; onBarrier: () => void; onFamily: () => void; onPatientLeft: () => void; onCommunity: () => void; onPharmacy: () => void; onEscalation: () => void }) {
  const familyConfirmed = familyState === "confirmed" || patient.family.toLowerCase().includes("confirmed");
  const ready = barrierComplete && familyConfirmed;
  const initials = patient.name.split(" ").map((part) => part[0]).join("").replace(".", "").slice(0, 2).toUpperCase();
  const steps = [
    { label: "Medically fit / discharge expected", owner: "Consultant team", meta: "Completed 09:10", done: true },
    { label: "Primary discharge barrier", owner: patient.owner, meta: barrierComplete ? "Completed just now" : `Target ${patient.deadline}`, done: barrierComplete, action: !barrierComplete },
    { label: "Therapy complete", owner: "Physiotherapy", meta: "Completed 09:42", done: true },
    { label: "Transport / family confirmed", owner: "Ward coordinator", meta: familyConfirmed ? "Collection confirmed" : "Awaiting confirmation", done: familyConfirmed, familyAction: !familyConfirmed },
    { label: "Discharge summary complete", owner: "Medical team", meta: "Completed 10:32", done: true },
    { label: "Ready to leave", owner: "Ward team", meta: ready ? "All dependencies complete" : "Waiting on dependencies", done: ready },
  ];
  return <div className="screen-stack"><UnlockDischarge patient={patient} barrierComplete={barrierComplete} familyState={familyState} tto={tto} onFamily={onFamily} onPharmacy={onPharmacy} onEscalation={onEscalation} /><section className={`barrier-hero ${ready ? "resolved" : ""}`}><div className="barrier-symbol">{ready ? <CheckCircle2 /> : <Pill />}</div><div className="barrier-copy"><p className="section-kicker">{ready ? "Ready to go" : "Main barrier right now"}</p><h2>{ready ? "All discharge actions complete" : barrierComplete ? "Family collection confirmation" : patient.barrier}</h2><p>{ready ? `${patient.name} is now Green. The ward board and ward display have updated.` : barrierComplete ? "The main barrier is complete. The ward is waiting for family or transport confirmation." : `Action is owned by ${patient.owner} with a target of ${patient.deadline}. Completing it updates every HomeFlow view.`}</p></div><StatusPill status={ready ? "Green" : patient.rag} /></section>
    <section className="journey-layout"><article className="panel journey-panel"><div className="panel-heading"><div><p className="section-kicker">Discharge timeline</p><h2>{steps.length} coordinated steps</h2></div><span className="mini-badge">{steps.filter((s) => s.done).length} of {steps.length} complete</span></div><div className="timeline">{steps.map((step, index) => <div className={`timeline-step ${step.done ? "done" : "pending"}`} key={step.label}><div className="timeline-marker">{step.done ? <Check size={16} /> : index + 1}</div><div className="timeline-content"><h3>{step.label}</h3><p>{step.owner}</p></div><div className="timeline-meta"><span>{step.meta}</span>{step.action && <Button onClick={onBarrier}>Mark barrier complete</Button>}{step.familyAction && <Button variant="secondary" onClick={onFamily}>Confirm collection</Button>}</div></div>)}</div></article>
      <aside className="patient-card panel"><div className="avatar">{initials}</div><h2>{patient.name}</h2><p className="muted">Fictional demo patient</p><dl><div><dt>Location</dt><dd>{patient.ward} · {patient.bed}</dd></div><div><dt>Expected discharge</dt><dd>{patient.expected}</dd></div><div><dt>Pathway</dt><dd>Pathway 0 · Home</dd></div><div><dt>Family readiness</dt><dd>{patient.family}</dd></div></dl>{tto && <div className="journey-status-card"><Pill size={18} /><span><small>Pharmacy stage</small><strong>{ttoStageCopy[tto.stage].label}</strong></span><StatusPill status={ttoStageCopy[tto.stage].tone} /></div>}{handover && <button className="journey-link-card" onClick={onCommunity}><HeartHandshake size={18} /><span><small>Community handover</small><strong>{handoverStatusCopy[handover.status].label}</strong></span><ChevronRight size={17} /></button>}<div className="completion"><div><span>Journey completion</span><strong>{Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%</strong></div><div className="progress"><span style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }} /></div></div><div className="departure-action"><DoorOpen size={20} /><div><strong>Patient departure</strong><span>{ready ? "Remove this patient from live ward views." : "Complete the journey before recording departure."}</span></div><Button variant="secondary" onClick={onPatientLeft} disabled={!ready}>Patient has left ward</Button></div></aside>
    </section><ActivityTrail patient={patient} entries={activity} /></div>;
}

function EmptyJourney({ onBoard }: { onBoard: () => void }) {
  return <section className="panel empty-journey"><CheckCircle2 size={34} /><div><p className="section-kicker">Ward cleared</p><h2>No patients remain on the live ward board</h2><p>All fictional demo patients have been recorded as having left the ward. Use Reset demo to restore the starting cohort.</p></div><Button variant="secondary" onClick={onBoard}>Return to ward board</Button></section>;
}

function FamilyScreen({ patient, familyState, alertSent, responded, onAlert, onFamily }: { patient: Patient; familyState: FamilyState; alertSent: boolean; responded: boolean; onAlert: () => void; onFamily: (state: "confirmed" | "support" | "contact") => void }) {
  const familyConfirmed = familyState === "confirmed" || patient.family.toLowerCase().includes("confirmed");
  const statusLabel = familyConfirmed ? "Confirmed" : familyState === "support" ? "Support required" : familyState === "contact" ? "Contact requested" : "Awaiting response";
  const statusCopy = familyConfirmed ? `Collection confirmed for ${patient.expected.split(" · ")[1] ?? patient.expected}. The ward discharge view has updated.` : familyState === "support" ? "The nominated contact may have difficulty collecting. The ward view now highlights that support is required." : familyState === "contact" ? "The nominated contact has requested a call from the ward before collection arrangements are confirmed." : alertSent ? "The discharge alert has been sent. The ward is waiting for the nominated contact to respond." : "The nurse has not yet sent the discharge alert to the nominated contact.";
  const [expectedDay, expectedTime] = patient.expected.split(" · ");
  const message = `Hello. Your relative is likely to be ready for discharge ${expectedDay.toLowerCase()} at around ${expectedTime}. Please prepare to collect them at about this time. There may be a short delay while final checks, medicines or transport are completed. We will let you know if the expected time changes. Please use one of the options below to tell the ward whether you can collect them or need support.`;
  return <div className="screen-stack family-layout"><section className="phone-panel"><div className="phone"><div className="phone-top"><span>9:41</span><span className="phone-notch" /><span>•••</span></div><div className="message-header"><div className="message-logo"><Home size={19} /></div><div><strong>HomeFlow demo</strong><span>{patient.name} · one simulated message</span></div></div><div className="message-thread single-message"><div className={`message-stage active ${alertSent ? "sent" : "preview"}`}><div className="message-meta"><strong>{alertSent ? "Discharge alert sent" : "Message preview"}</strong><span>{alertSent ? "Today · 11:35" : "Not yet sent"}</span></div><div className="message-bubble">{message}</div><span className="delivery">{alertSent ? "Delivered · demonstration only" : "Preview · no message sent"}</span></div></div></div></section>
    <section className="family-actions"><article className={`family-status-card ${familyConfirmed ? "confirmed" : ""}`}><div className="family-status-top"><div className="family-status-icon">{familyConfirmed ? <CheckCircle2 /> : <Clock3 />}</div><div><p className="section-kicker">Family readiness · {patient.name}</p><h2>{statusLabel}</h2></div></div><p>{statusCopy}</p><div className="completion-checks" aria-label="Family communication progress"><div className={alertSent ? "complete" : "pending"}>{alertSent ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}<span><strong>Family alerted</strong><small>{alertSent ? "Alert sent at 11:35" : "Waiting for nurse action"}</small></span></div><div className={responded ? "complete" : "pending"}>{responded ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}<span><strong>Family responded</strong><small>{responded ? `Response recorded: ${statusLabel}` : "No response recorded yet"}</small></span></div></div></article>
      <article className="panel nurse-alert-panel"><div><p className="section-kicker">Nurse action</p><h2>Send the early discharge alert</h2><p>This sends the single simulated message shown on the phone and records that the family has been alerted.</p></div><Button variant={alertSent ? "success" : "primary"} onClick={onAlert} disabled={alertSent} activateOnPointerUp>{alertSent ? <CheckCircle2 size={17} /> : <BellRing size={17} />}{alertSent ? " Family alerted" : " Alert family"}</Button></article>
      <article className="panel response-panel"><div className="panel-heading"><div><p className="section-kicker">Simulated family response</p><h2>Family reply options</h2></div><span className="simulation-tag">Demonstration only</span></div><p className="response-question">Can you collect your relative at around {expectedTime}?</p><div className="response-buttons"><button className={familyState === "confirmed" ? "selected" : ""} aria-pressed={familyState === "confirmed"} onClick={() => onFamily("confirmed")} disabled={!alertSent}><Check size={17} /> I can collect</button><button className={familyState === "support" ? "selected" : ""} aria-pressed={familyState === "support"} onClick={() => onFamily("support")} disabled={!alertSent}><AlertTriangle size={17} /> I may have difficulty</button><button className={familyState === "contact" ? "selected" : ""} aria-pressed={familyState === "contact"} onClick={() => onFamily("contact")} disabled={!alertSent}><MessageSquareText size={17} /> Please contact me</button></div>{!alertSent && <p className="response-help">The reply options become available after the nurse clicks Alert family.</p>}</article>
      {familyState === "contact" && <article className="call-request-card"><div className="call-request-icon"><PhoneCall size={21} /></div><div><p className="section-kicker">Family requested contact</p><h2>Call the nominated contact</h2><p>01632 960000 · fictional demonstration number</p></div><a className="family-call-button" href="tel:+441632960000" aria-label={`Call ${patient.name}'s nominated contact using the fictional demonstration number`}><PhoneCall size={18} /> Call now</a></article>}
      <article className="privacy-note"><ShieldCheck size={22} /><div><strong>Designed around approved communication routes</strong><p>Any real messaging would use an approved platform, consent model, nominated contact record and Information Governance review.</p></div></article>
    </section></div>;
}

function Escalation({ patient, escalated, acknowledged, barrierComplete, onEscalate, onAcknowledge, onBarrier }: { patient: Patient; escalated: boolean; acknowledged: boolean; barrierComplete: boolean; onEscalate: () => void; onAcknowledge: () => void; onBarrier: () => void }) {
  const deadlineParts = patient.deadline.match(/^(\d{2}):(\d{2})$/);
  const deadlineMinutes = deadlineParts ? Number(deadlineParts[1]) * 60 + Number(deadlineParts[2]) : 0;
  const overdueMinutes = deadlineMinutes ? Math.max(0, 11 * 60 + 35 - deadlineMinutes) : 0;
  const isOverdue = !barrierComplete && overdueMinutes > 0;
  const timingLabel = isOverdue ? `Overdue by ${overdueMinutes} minutes` : barrierComplete ? "Barrier complete" : `Action due by ${patient.deadline}`;
  const timingValue = isOverdue ? `+${String(Math.floor(overdueMinutes / 60)).padStart(2, "0")}:${String(overdueMinutes % 60).padStart(2, "0")}` : barrierComplete ? "Done" : patient.deadline;
  return <div className="screen-stack"><section className={`overdue-card ${barrierComplete ? "resolved" : ""}`}><div className="overdue-clock">{barrierComplete ? <CheckCircle2 /> : <Clock3 />}</div><div><p className="section-kicker">{barrierComplete ? "Barrier resolved" : "Deadline monitor · " + patient.name}</p><h2>{timingLabel}</h2><p>{barrierComplete ? "The patient journey and ward board now reflect completion." : `${patient.barrier} · escalation recipient: ${patient.owner} · demo current time 11:35`}</p></div><div className="overdue-number">{timingValue}</div></section>
    <section className="content-grid escalation-grid"><article className="panel escalation-detail"><div className="panel-heading"><div><p className="section-kicker">Barrier detail</p><h2>{patient.barrier} · {patient.name}</h2></div><StatusPill status={barrierComplete ? "Green" : patient.rag} /></div><dl className="detail-grid"><div><dt>Escalation recipient</dt><dd><Stethoscope size={18} /> {patient.owner}</dd></div><div><dt>Target completion</dt><dd><Clock3 size={18} /> {patient.expected.split(" · ")[0]} · {patient.deadline}</dd></div><div><dt>Escalation status</dt><dd><BellRing size={18} /> {barrierComplete ? "Action completed" : acknowledged ? `Acknowledged by ${patient.owner}` : escalated ? `Sent to ${patient.owner} · demo` : `Not sent · will go to ${patient.owner}`}</dd></div><div><dt>Patient impact</dt><dd><BedDouble size={18} /> {barrierComplete ? "Barrier no longer delaying discharge" : "Discharge cannot complete"}</dd></div></dl><div className="suggested-action"><div className="suggested-icon"><Target size={20} /></div><div><span>Who will receive this escalation?</span><strong>{barrierComplete ? "No escalation required" : `${patient.owner} — the team responsible for ${patient.barrier.toLowerCase()}.`}</strong></div></div><div className="action-row"><Button variant={escalated ? "success" : "primary"} onClick={onEscalate} disabled={escalated || barrierComplete} activateOnPointerUp>{escalated ? <CheckCircle2 size={17} /> : <BellRing size={17} />} {escalated ? `Escalated to ${patient.owner}` : `Escalate to ${patient.owner}`}</Button>{escalated && !barrierComplete ? <Button variant={acknowledged ? "success" : "secondary"} onClick={onAcknowledge} disabled={acknowledged}>{acknowledged ? <CheckCircle2 size={17} /> : <UserRoundCheck size={17} />} {acknowledged ? "Team acknowledged" : "Simulate acknowledgement"}</Button> : null}<Button variant="secondary" onClick={onBarrier} disabled={barrierComplete}><Check size={17} /> {barrierComplete ? "Action completed" : "Mark action complete"}</Button></div><div className={`escalation-check ${acknowledged || barrierComplete ? "complete" : "pending"}`}>{acknowledged || barrierComplete ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}<div><strong>{barrierComplete ? "Escalation closed" : acknowledged ? "Responsible team acknowledged" : escalated ? "Sent · awaiting acknowledgement" : "Escalation not yet sent"}</strong><span>{barrierComplete ? "The action and ward display are complete." : acknowledged ? `${patient.owner} has accepted responsibility in demonstration mode.` : escalated ? `Waiting for ${patient.owner} to confirm receipt.` : `Will be directed to ${patient.owner}.`}</span></div></div></article>
      <aside className="panel escalation-log"><div className="panel-heading"><div><p className="section-kicker">Activity</p><h2>{patient.name} · escalation trail</h2></div></div><div className="log-list"><div><span>{patient.update.match(/\d{2}:\d{2}/)?.[0] ?? "10:18"}</span><p><strong>Latest ward update</strong>{patient.update.split(" · ")[0]}.</p></div><div><span>{patient.deadline === "Complete" ? "Done" : patient.deadline}</span><p><strong>Target review</strong>{barrierComplete ? "Action completed." : isOverdue ? "Target passed without completion." : "Completion target remains active."}</p></div><div><span>11:35</span><p><strong>HomeFlow check</strong>{barrierComplete ? "No reminder required." : `If escalated, the alert will be directed to ${patient.owner}.`}</p></div>{escalated && <div className="latest"><span>Demo</span><p><strong>Escalation to {patient.owner} logged</strong>Demonstration only — no person or system was contacted.</p></div>}{acknowledged && <div><span>Demo</span><p><strong>{patient.owner} acknowledged</strong>Responsibility accepted in the simulated workflow.</p></div>}</div></aside>
    </section></div>;
}

function PharmacyQueue({ patients, records, activity, onAdvance, onClarification, onAcknowledge }: { patients: Patient[]; records: Record<string, TtoRecord>; activity: Record<string, ActivityEntry[]>; onAdvance: (patientId: string) => void; onClarification: (patientId: string, clarification: string) => void; onAcknowledge: (patientId: string) => void }) {
  const [clarificationDrafts, setClarificationDrafts] = useState<Record<string, string>>({});
  const queue = Object.entries(records).flatMap(([patientId, record]) => {
    const patient = patients.find((item) => item.id === patientId);
    return patient ? [{ patient, record }] : [];
  });
  const hasPharmacyEscalation = (patientId: string) => (activity[patientId] ?? []).some((entry) => entry.kind === "escalation" && entry.action.toLowerCase().includes("pharmacy"));
  const urgent = queue.filter(({ patient, record }) => record.priority === "Urgent" || record.stage === "clarification" || hasPharmacyEscalation(patient.id)).length;
  const escalatedToPharmacy = queue.filter(({ patient }) => hasPharmacyEscalation(patient.id)).length;
  const ready = queue.filter(({ record }) => record.stage === "ready").length;
  const nextAction = (stage: TtoStage) => stage === "awaiting-prescription" ? "Confirm submitted" : stage === "submitted" ? "Accept into pharmacy" : stage === "received" ? "Start preparation" : stage === "clarification" ? "Ward confirmed resolved" : stage === "preparing" ? "Mark ready" : stage === "ready" ? "Confirm ward delivery" : "Delivered";
  return <div className="screen-stack">
    <section className="workflow-summary" aria-label="Pharmacy queue summary"><article><Pill /><div><span>Active TTO queue</span><strong>{queue.filter(({ record }) => record.stage !== "delivered").length}</strong><small>Fictional patients requiring coordination</small></div></article><article className="summary-alert"><AlertTriangle /><div><span>Action required</span><strong>{urgent}</strong><small>{escalatedToPharmacy ? `${escalatedToPharmacy} ward escalation${escalatedToPharmacy === 1 ? "" : "s"} included` : "Urgent or awaiting clarification"}</small></div></article><article className="summary-ready"><CheckCircle2 /><div><span>Ready for ward</span><strong>{ready}</strong><small>Awaiting collection or delivery</small></div></article></section>
    <section className="role-scope"><ShieldCheck size={20} /><div><strong>Operational coordination only</strong><p>Prescribing, clinical screening and dispensing remain in the approved clinical and pharmacy systems. This prototype records workflow status only.</p></div></section>
    <section className="pharmacy-queue" aria-label="Fictional TTO pharmacy worklist">{queue.map(({ patient, record }) => {
      const stage = ttoStageCopy[record.stage];
      const complete = record.stage === "delivered";
      const patientActivity = activity[patient.id] ?? [];
      const pharmacyEscalation = patientActivity.find((entry) => entry.kind === "escalation" && entry.action.toLowerCase().includes("pharmacy"));
      const pharmacyAcknowledgement = pharmacyEscalation ? patientActivity.find((entry) => entry.kind === "acknowledgement" && entry.action.toLowerCase().includes("pharmacy")) : undefined;
      const clarificationOpen = Object.prototype.hasOwnProperty.call(clarificationDrafts, patient.id);
      const clarificationText = clarificationDrafts[patient.id] ?? "";
      return <article className={`panel pharmacy-card stage-${stage.tone.toLowerCase()} ${pharmacyEscalation ? "has-ward-escalation" : ""}`} key={patient.id}><header><div><span className="queue-id">DEMO-{String(basePatients.findIndex((item) => item.id === patient.id) + 101)}</span><h2>{patient.name}</h2><p>{patient.ward} · {patient.bed} · expected {patient.expected.toLowerCase()}</p></div><StatusPill status={stage.tone} /></header>{pharmacyEscalation ? <div className={`pharmacy-escalation ${pharmacyAcknowledgement ? "acknowledged" : ""}`}><div className="pharmacy-escalation-icon">{pharmacyAcknowledgement ? <CheckCircle2 size={19} /> : <BellRing size={19} />}</div><div><span>Ward escalation · {pharmacyEscalation.time}</span><strong>{pharmacyAcknowledgement ? "Acknowledged by Pharmacy" : "Escalated to Pharmacy"}</strong><small>{pharmacyAcknowledgement ? `Receipt confirmed at ${pharmacyAcknowledgement.time}; the ward escalation trail has updated.` : `${pharmacyEscalation.actor} flagged this patient for pharmacy attention. Awaiting acknowledgement.`}</small></div></div> : null}<div className="pharmacy-stage"><div className="stage-icon">{complete ? <CheckCircle2 /> : record.stage === "clarification" ? <AlertTriangle /> : <Pill />}</div><div><span>Current TTO stage</span><strong>{stage.label}</strong><small>Current owner: {stage.owner}</small></div></div><dl className="queue-details"><div><dt>Submitted</dt><dd>{record.submittedAt}</dd></div><div><dt>Target</dt><dd>{record.target}</dd></div><div><dt>Priority</dt><dd>{record.priority}</dd></div><div><dt>Assigned</dt><dd>{record.assignee}</dd></div></dl><p className="queue-note">{record.note}</p>{clarificationOpen ? <div className="clarification-editor"><label htmlFor={`clarification-${patient.id}`}>What clarification is required?</label><textarea id={`clarification-${patient.id}`} value={clarificationText} onChange={(event) => setClarificationDrafts((current) => ({ ...current, [patient.id]: event.target.value }))} rows={3} placeholder="For example: Please confirm the intended dose and frequency recorded in the approved prescribing system." autoFocus /><small>This is a coordination message only. Do not prescribe or amend medicines in HomeFlow.</small><div><Button variant="quiet" onClick={() => setClarificationDrafts((current) => { const next = { ...current }; delete next[patient.id]; return next; })}>Cancel</Button><Button variant="primary" onClick={() => { onClarification(patient.id, clarificationText); setClarificationDrafts((current) => { const next = { ...current }; delete next[patient.id]; return next; }); }} disabled={!clarificationText.trim()}><MessageSquareText size={16} /> Send to ward</Button></div></div> : null}<footer>{pharmacyEscalation ? <Button variant={pharmacyAcknowledgement ? "success" : "secondary"} onClick={() => onAcknowledge(patient.id)} disabled={Boolean(pharmacyAcknowledgement)}>{pharmacyAcknowledgement ? <CheckCircle2 size={16} /> : <UserRoundCheck size={16} />} {pharmacyAcknowledgement ? "Pharmacy acknowledged" : "Acknowledge escalation"}</Button> : null}<Button variant="secondary" onClick={() => setClarificationDrafts((current) => ({ ...current, [patient.id]: "" }))} disabled={complete || record.stage === "clarification" || clarificationOpen}><MessageSquareText size={16} /> Request clarification</Button><Button variant={complete ? "success" : "primary"} onClick={() => onAdvance(patient.id)} disabled={complete}>{complete ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />} {nextAction(record.stage)}</Button></footer></article>;
    })}</section>
    <div className="risk-privacy"><RefreshCcw size={17} /> Every demo update is time-stamped and immediately synchronised with the ward views in this browser.</div>
  </div>;
}

function CommunityHandover({ patients, records, onAdvance, onClarification, onJourney, onTeamChange, onChangesChoice, onChangeText }: { patients: Patient[]; records: Record<string, HandoverRecord>; onAdvance: (patientId: string) => void; onClarification: (patientId: string) => void; onJourney: (patientId: string) => void; onTeamChange: (patientId: string, team: string) => void; onChangesChoice: (patientId: string, hasChanges: boolean) => void; onChangeText: (patientId: string, change: string) => void }) {
  const items = Object.entries(records).flatMap(([patientId, record]) => {
    const patient = patients.find((item) => item.id === patientId);
    return patient ? [{ patient, record }] : [];
  });
  const nextAction = (status: HandoverStatus) => status === "draft" ? "Send verified update" : status === "sent" ? "Simulate read" : status === "read" ? "Acknowledge receipt" : status === "acknowledged" ? "Accept next action" : status === "clarification" ? "Send amended update" : "Accepted";
  return <div className="screen-stack">
    <section className="handover-principle"><HeartHandshake size={28} /><div><p className="section-kicker">Closed-loop transfer of care</p><h2>The handover is complete only when the receiving team acknowledges the action.</h2><p>Clinical details remain in the approved record. HomeFlow makes responsibility, acknowledgement and follow-up visible.</p></div></section>
    <section className="handover-list" aria-label="Fictional community handovers">{items.map(({ patient, record }) => {
      const status = handoverStatusCopy[record.status];
      const complete = record.status === "accepted";
      const hasChanges = record.hasChanges !== false;
      return <article className="panel handover-card" key={patient.id}><header><div><span className="queue-id">{patient.ward} · {patient.bed} · DEMO-{String(basePatients.findIndex((item) => item.id === patient.id) + 101)}</span><h2>{patient.name}</h2><p>Receiving service: <strong>{record.team}</strong></p></div><StatusPill status={status.tone} /></header><div className="handover-body"><label className="receiving-team-field"><span>Choose receiving team</span><select value={record.team} onChange={(event) => onTeamChange(patient.id, event.target.value)} aria-label={`Receiving team for ${patient.name}`}>{receivingTeams.map((team) => <option value={team} key={team}>{team}</option>)}</select><small>Changing the team returns this handover to Draft so it can be checked before sending.</small></label><label className="handover-change-choice"><span>Changes to communicate?</span><select value={hasChanges ? "yes" : "no"} onChange={(event) => onChangesChoice(patient.id, event.target.value === "yes")} aria-label={`Changes to communicate for ${patient.name}`}><option value="yes">Yes — add the changes</option><option value="no">No changes</option></select></label>{hasChanges ? <label className="handover-change-editor"><span>What has changed?</span><textarea value={record.change} onChange={(event) => onChangeText(patient.id, event.target.value)} rows={4} placeholder="Describe the verified change for the receiving team" aria-label={`Describe changes for ${patient.name}`} /><small>Use concise, verified information. The formal clinical record remains the source of truth.</small></label> : null}<div className="handover-action"><span>Action requested</span><p>{record.action}</p></div><dl><div><dt>Authorised by</dt><dd>{record.authorisedBy}</dd></div><div><dt>Response due</dt><dd>{record.due}</dd></div><div><dt>Communication status</dt><dd>{status.label}</dd></div></dl></div><footer><a className="button button-secondary handover-call-button" href="tel:+441632960000" aria-label={`Call ${record.team} using the fictional demonstration number`} title="Fictional demonstration number"><PhoneCall size={16} /> Call team</a><Button variant="quiet" onClick={() => onJourney(patient.id)}><Route size={16} /> Patient journey</Button><Button variant="secondary" onClick={() => onClarification(patient.id)} disabled={complete || record.status === "clarification"}><MessageSquareText size={16} /> Request clarification</Button><Button variant={complete ? "success" : "primary"} onClick={() => onAdvance(patient.id)} disabled={complete}>{complete ? <CheckCircle2 size={16} /> : <ClipboardCheck size={16} />} {nextAction(record.status)}</Button></footer></article>;
    })}</section>
    <section className="approval-banner"><ShieldCheck size={22} /><div><strong>Demonstration workflow only—no community service has received a message.</strong><p>A live service would require approved identity, transfer-of-care standards, data-sharing arrangements, clinical-safety assurance and write-back to the formal patient record.</p></div></section>
  </div>;
}

const systems = [
  { name: "Nervecentre / EPR / PAS", icon: FileCheck2, tag: "Existing capability", copy: "Patient demographics, ward, bed and available discharge information", side: "left" },
  { name: "NHS FDP / OPTICA", icon: ListChecks, tag: "Proposed connection", copy: "Potential discharge pathway, tasks and ownership—subject to Trust adoption", side: "left" },
  { name: "Pharmacy systems", icon: Pill, tag: "Requires confirmation", copy: "Future source for prescribing and dispensing milestones if interfaces permit", side: "left" },
  { name: "DrDoctor / approved messaging", icon: MessageSquareText, tag: "Proposed connection", copy: "Patient and nominated family communications", side: "right" },
  { name: "Community care systems", icon: HeartHandshake, tag: "Proposed connection", copy: "Verified handover, acknowledgement and acceptance milestones", side: "right" },
  { name: "Approved analytics", icon: BarChart3, tag: "Requires confirmation", copy: "Aggregated pilot measures—not the live operational workflow", side: "right" },
];
function SystemCard({ name, icon: Icon, tag, copy }: { name: string; icon: typeof Home; tag: string; copy: string }) {
  const tone = tag === "Existing capability" ? "existing" : tag === "Proposed connection" ? "proposed" : "confirm";
  return <article className="system-card"><div className="system-icon"><Icon size={20} /></div><div><span className={`system-tag ${tone}`}>{tag}</span><h3>{name}</h3><p>{copy}</p></div></article>;
}
function Integration() {
  return <div className="screen-stack"><section className="integration-statement"><Link2 size={24} /><div><strong>HomeFlow is designed to connect and enhance existing capability, not replace existing systems.</strong><p>This diagram shows a proposed future state. No technical integration is claimed or included in this prototype.</p></div></section><section className="integration-canvas panel"><div className="system-column">{systems.filter((s) => s.side === "left").map((s) => <SystemCard key={s.name} {...s} />)}</div><div className="flow-lines left-lines"><span /><span /><span /></div><article className="homeflow-hub"><div className="hub-mark"><Home size={27} /><span><i /><i /><i /></span></div><p>PROPOSED COORDINATION LAYER</p><h2>HomeFlow</h2><ul><li><Check size={15} /> Simplified ward view</li><li><Check size={15} /> TTO coordination</li><li><Check size={15} /> Community handover</li><li><Check size={15} /> Family readiness</li></ul><small>Prototype only</small></article><div className="flow-lines right-lines"><span /><span /><span /></div><div className="system-column">{systems.filter((s) => s.side === "right").map((s) => <SystemCard key={s.name} {...s} />)}</div></section><section className="approval-banner"><ShieldCheck size={22} /><div><strong>Integration subject to Digital, Information Governance and supplier approval.</strong><p>Data flows, interoperability standards, lawful basis, DPIA, clinical safety, access controls and supplier feasibility would all require formal confirmation.</p></div></section><div className="integration-legend"><span><i className="legend-existing" /> Existing capability</span><span><i className="legend-proposed" /> Proposed connection</span><span><i className="legend-confirm" /> Requires confirmation</span></div></div>;
}

function Analytics() {
  const lostHours = [{ name: "TTO", value: 2.8 }, { name: "Transport", value: 2.2 }, { name: "Family", value: 1.7 }, { name: "Therapy", value: 1.4 }, { name: "Equipment", value: 1.2 }];
  const times = [{ time: "08–10", value: 8 }, { time: "10–12", value: 19 }, { time: "12–14", value: 28 }, { time: "14–16", value: 32 }, { time: "16–18", value: 13 }];
  return <div className="screen-stack"><section className="analytics-kpis"><KpiCard label="Before midday" value="27%" note="Target: 35%" icon={CircleGauge} /><KpiCard label="Family collection delay" value="46m" note="Illustrative average" icon={Users} tone="purple" /><KpiCard label="Lost discharge hours" value="38h" note="This demo week" icon={TrendingDown} tone="red" /><KpiCard label="Ready-to-leave time" value="2.4h" note="Baseline average" icon={Clock3} tone="amber" /></section><section className="analytics-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="section-kicker">Top causes of delay</p><h2>Share of recorded barriers</h2></div><span className="mini-badge">n = 86</span></div><div className="donut-layout"><div className="donut-chart"><div><strong>31%</strong><span>TTO</span></div></div><div className="donut-legend">{bottlenecks.slice(0, 6).map((b) => <div key={b.label}><i style={{ background: b.color }} /><span>{b.label}</span><strong>{b.share}%</strong></div>)}</div></div></article><article className="panel chart-panel"><div className="panel-heading"><div><p className="section-kicker">Average lost hours</p><h2>Time impact by barrier</h2></div></div><div className="horizontal-chart">{lostHours.map((item) => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.value / 3 * 100}%` }} /></div><strong>{item.value}h</strong></div>)}</div></article><article className="panel chart-panel wide"><div className="panel-heading"><div><p className="section-kicker">Discharges by time of day</p><h2>Too many patients leave after 14:00</h2></div><span className="mini-badge">Demo baseline</span></div><div className="column-chart">{times.map((item) => <div key={item.time}><span className="column-value">{item.value}%</span><i style={{ height: `${item.value * 3.2}px` }} /><span>{item.time}</span></div>)}</div></article><article className="impact-card"><div><p className="section-kicker">Illustrative before vs after</p><h2>Potential impact</h2></div><div className="impact-stat"><span>Average avoidable delay</span><div><strong>2.4h</strong><ArrowRight /><strong className="after">1.7h</strong></div><small>Illustrative 29% reduction</small></div><ul><li><CheckCircle2 /> Fewer avoidable discharge hours</li><li><CheckCircle2 /> Earlier bed availability</li><li><CheckCircle2 /> Improved family preparedness</li><li><CheckCircle2 /> Better visibility of bottlenecks</li></ul></article></section></div>;
}

function Pilot() {
  const measures = ["TTO request-to-ready time", "Telephone chases avoided", "Clarification response time", "Community handovers acknowledged", "Family readiness", "Discharge-ready to leaving time"];
  return <div className="screen-stack"><section className="pilot-intro"><div className="pilot-number">01</div><div><p className="section-kicker">A deliberately small first step</p><h2>One ward. Eight to twelve weeks. A clear learning question.</h2><p>Can a shared coordination and family-readiness view reduce avoidable discharge hours without duplicating the systems teams already use?</p></div></section><section className="pilot-grid"><article className="panel pilot-plan"><div className="panel-heading"><div><p className="section-kicker">Proposed pilot</p><h2>Build evidence before scale</h2></div><Play size={24} /></div><div className="pilot-steps">{[["01","1 ward","Start with one engaged clinical area and a defined cohort."],["02","8–12 weeks","Enough time to establish a baseline, test and learn."],["03","Existing technology","Use approved capability where possible; avoid unnecessary procurement."],["04","Listen and adapt","Gather staff, patient and family feedback throughout."],["05","Evaluate","Compare baseline with post-pilot performance."]].map((s) => <div key={s[0]}><span>{s[0]}</span><strong>{s[1]}</strong><p>{s[2]}</p></div>)}</div></article><article className="panel measures-panel"><div className="panel-heading"><div><p className="section-kicker">Measures that matter</p><h2>Balanced pilot evaluation</h2></div></div><div className="measure-list">{measures.map((m, i) => <div key={m}><span>{String(i + 1).padStart(2, "0")}</span><p>{m}</p><CheckCircle2 size={18} /></div>)}</div></article></section><section className="ask-card"><div className="ask-icon"><Sparkles /></div><div><p className="section-kicker">The ask</p><h2>Support to develop, integrate and evaluate a small HomeFlow pilot.</h2><p>Bring clinical, operational, digital, IG and improvement colleagues together to test feasibility safely.</p></div><div className="ask-outcomes"><span>Develop</span><ArrowRight /><span>Integrate</span><ArrowRight /><span>Evaluate</span></div></section></div>;
}

function WardDisplay({ patients, updatedAt, onExit }: { patients: Patient[]; updatedAt: number; onExit: () => void }) {
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const displayPatients = patients.map((patient, index) => ({
    ...patient,
    demoId: `DEMO-${String(index + 101)}`,
    safeBed: patient.bed.replace("Bed ", "Bed D-"),
  }));
  const expectedToday = displayPatients.filter((patient) => patient.expected.startsWith("Today")).length;
  const readyPatients = displayPatients.filter((patient) => patient.rag === "Green").length;
  const outstandingBarriers = displayPatients.filter((patient) => patient.rag !== "Green").length;
  const dischargeRisk = displayPatients.filter((patient) => patient.rag === "Red").length;

  useEffect(() => {
    const refresh = () => setRefreshedAt(new Date());
    const refreshTimer = window.setInterval(refresh, 5000);
    const fullscreenChanged = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fullscreenChanged);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("fullscreenchange", fullscreenChanged);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  return <main className="ward-display" aria-label="HomeFlow privacy-safe ward display">
    <header className="ward-display-header">
      <div className="ward-display-brand"><div className="ward-display-logo"><Home size={30} /></div><div><strong>HomeFlow</strong><span>Ward display · Northview demo ward</span></div></div>
      <div className="ward-display-privacy"><ShieldCheck size={22} /><div><strong>Privacy-safe demonstration</strong><span>Fictional labels, IDs and beds only · no full names</span></div></div>
      <div className="ward-display-controls"><div className="ward-display-sync"><i /><span>Live sync · refreshed {refreshedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></div><button onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}<span>{isFullscreen ? "Exit full screen" : "Full screen"}</span></button><button onClick={onExit}>Presenter view</button></div>
    </header>
    <section className="ward-display-summary" aria-label="Ward discharge summary">
      <article><span>Expected today</span><strong>{expectedToday}</strong><small>Fictional demo cohort</small></article>
      <article className="summary-green"><span>Ready patients</span><strong>{readyPatients}</strong><small>All actions complete</small></article>
      <article className="summary-amber"><span>Outstanding barriers</span><strong>{outstandingBarriers}</strong><small>Owner action required</small></article>
      <article className="summary-red"><span>Discharge risk</span><strong>{dischargeRisk}</strong><small>High-priority delay risk</small></article>
    </section>
    <section className="ward-display-board">
      <div className="ward-display-board-heading"><div><p>LIVE COORDINATION VIEW</p><h1>Today’s ward discharge position</h1></div><div className="ward-display-legend"><span><i className="green" />Ready</span><span><i className="amber" />Action due</span><span><i className="red" />At risk</span></div></div>
      <div className={`ward-display-table ${displayPatients.length > 7 ? "dense" : ""}`} role="table" aria-label="Privacy-safe discharge board">
        <div className="ward-display-row ward-display-columns" role="row"><span>Bed / demo ID</span><span>Expected</span><span>RAG</span><span>Barrier · owner</span><span>Target</span><span>Family readiness</span></div>
        {displayPatients.map((patient) => <div className={`ward-display-row rag-${patient.rag.toLowerCase()}`} role="row" key={patient.id}>
          <div><strong>{patient.safeBed}</strong><span>{patient.demoId} · fictional identifier</span></div>
          <div><strong>{patient.expected.split(" · ")[0]}</strong><span>{patient.expected.split(" · ")[1]}</span></div>
          <div><StatusPill status={patient.rag} /></div>
          <div><strong>{patient.barrier}</strong><span>{patient.owner}</span></div>
          <div><strong>{patient.deadline}</strong><span>{patient.rag === "Green" ? "Complete" : "Target time"}</span></div>
          <div><strong>{patient.family}</strong><span>{patient.family.includes("Support") ? "Needs attention" : patient.family.includes("confirmed") ? "Ready" : "Awaiting update"}</span></div>
        </div>)}
      </div>
    </section>
    <footer className="ward-display-footer"><span><RefreshCcw size={16} /> Demo state auto-refreshes every 5 seconds and updates immediately from presenter actions.</span><span>State updated {new Date(updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><strong>HomeFlow Prototype — Demonstration Data</strong></footer>
  </main>;
}

function defaultFamilyState(patient: Patient): FamilyState {
  const state = patient.family.toLowerCase();
  if (state.includes("confirmed")) return "confirmed";
  if (state.includes("support") || state.includes("not collecting")) return "support";
  if (state.includes("contact")) return "contact";
  return "awaiting";
}

function HomeFlowLogo() {
  return <div className="access-logo" aria-label="HomeFlow">
    <span className="access-logo-image" aria-hidden="true" style={{ backgroundImage: "url('./homeflow-logo.png')" }} />
  </div>;
}

function LoginScreen({ code, error, onCodeChange, onSubmit, onWatchVideo }: { code: string; error: string; onCodeChange: (code: string) => void; onSubmit: () => void; onWatchVideo: () => void }) {
  return <main className="access-shell login-screen">
    <div className="login-atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <div className="login-page-badge"><ShieldCheck size={15} /> Prototype / Demonstration Data Only</div>
    <section className="login-unified">
      <header className="login-unified-header">
        <HomeFlowLogo />
        <p className="access-kicker">CONNECTED DISCHARGE COORDINATION</p>
        <h1>Preparing every discharge, together.</h1>
        <p>A clear, shared view of readiness, barriers, ownership and family preparation.</p>
      </header>
      <form className="login-card" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <div className="login-card-heading"><div className="login-icon"><LockKeyhole size={21} /></div><div><p className="access-kicker">SECURE DEMO ACCESS</p><h2>Welcome back</h2></div></div>
        <p className="login-intro">Use the authorised demonstration account to enter HomeFlow.</p>
        <label className="access-field"><span>Official email</span><div><input type="email" value={OFFICIAL_EMAIL} readOnly autoComplete="off" /><UserRoundCheck size={17} /></div><small>This prototype accepts this account only.</small></label>
        <label className="access-field"><span>Password</span><div><input type="password" value={code} onChange={(event) => onCodeChange(event.target.value)} autoComplete="off" aria-describedby="demo-password-help" /><LockKeyhole size={17} /></div><small id="demo-password-help">Enter the password supplied by the HomeFlow owner.</small></label>
        {error && <p className="login-error" role="alert"><AlertTriangle size={16} /> {error}</p>}
        <button className="access-primary login-submit" type="submit"><LogIn size={19} /> Sign in to HomeFlow <ArrowRight size={18} /></button>
        <button className="login-video-button" type="button" onClick={onWatchVideo}><Play size={18} /><span><strong>Follow one HomeFlow patient journey</strong><small>A short guided walkthrough · Fictional demonstration patient</small></span><ChevronRight size={18} /></button>
        <div className="login-assurance"><ShieldCheck size={17} /><div><strong>Safe demonstration environment</strong><span>Fictional patients only · No live Trust connections</span></div></div>
      </form>
    </section>
    <footer className="login-footer"><span>Independent innovation concept · Not an official NHS product</span><span>Production use requires Trust-approved identity and access controls</span></footer>
  </main>;
}

function OverviewVideo({ onClose }: { onClose: () => void }) {
  return <div className="video-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="video-modal" role="dialog" aria-modal="true" aria-labelledby="homeflow-video-title" onClick={(event) => event.stopPropagation()}>
      <header>
        <div><p>FOLLOW ONE FICTIONAL PATIENT</p><h2 id="homeflow-video-title">How HomeFlow supports Margaret’s discharge journey</h2></div>
        <button onClick={onClose} aria-label="Close HomeFlow overview video"><X size={22} /></button>
      </header>
      <video controls autoPlay playsInline preload="metadata">
        <source src="./homeflow-focused-journey.mp4?v=home-door-20261013" type="video/mp4" />
        <track kind="captions" src="./homeflow-live-journey.vtt?v=live-story-20261013" srcLang="en" label="English" default />
        Your browser does not support embedded video.
      </video>
      <footer><ShieldCheck size={16} /><span>Prototype / Demonstration Data Only · All patients and identifiers shown are fictional.</span></footer>
    </section>
  </div>;
}

function WelcomeScreen() {
  return <main className="welcome-screen" aria-live="polite" aria-label="Welcome to HomeFlow">
    <div className="welcome-atmosphere" aria-hidden="true"><i /><i /><i /><i /></div>
    <svg className="welcome-network" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-40 420 C180 250 280 510 500 310 S820 120 1040 260" />
      <path d="M-40 190 C190 370 350 80 560 250 S810 510 1040 345" />
      <circle cx="174" cy="319" r="5" /><circle cx="383" cy="403" r="4" /><circle cx="618" cy="233" r="5" /><circle cx="836" cy="212" r="4" />
    </svg>
    <section className="welcome-content">
      <div className="welcome-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="welcome-logo"><span className="welcome-shine" aria-hidden="true" /><HomeFlowLogo /></div>
      <p><span>Welcome to</span><strong>HomeFlow</strong></p>
      <div className="welcome-progress" aria-hidden="true"><span /></div>
    </section>
  </main>;
}

async function playWelcomeSound() {
  try {
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    const master = audioContext.createGain();
    const warmth = audioContext.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.setValueAtTime(2800, audioContext.currentTime);
    master.gain.setValueAtTime(0.0001, audioContext.currentTime);
    master.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.1);
    master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 3.15);
    master.connect(warmth);
    warmth.connect(audioContext.destination);
    [
      { frequency: 261.63, start: 0, duration: 2.5, type: "sine" as OscillatorType, volume: 0.055 },
      { frequency: 523.25, start: 0.04, duration: 1.45, type: "sine" as OscillatorType, volume: 0.1 },
      { frequency: 659.25, start: 0.25, duration: 1.55, type: "sine" as OscillatorType, volume: 0.1 },
      { frequency: 783.99, start: 0.52, duration: 1.65, type: "triangle" as OscillatorType, volume: 0.065 },
      { frequency: 1046.5, start: 0.88, duration: 1.8, type: "sine" as OscillatorType, volume: 0.09 },
      { frequency: 1318.51, start: 1.22, duration: 1.55, type: "sine" as OscillatorType, volume: 0.04 },
    ].forEach(({ frequency, start, duration, type, volume }) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(audioContext.currentTime + start);
      oscillator.stop(audioContext.currentTime + start + duration + 0.05);
    });
    window.setTimeout(() => { void audioContext.close(); }, 3400);
  } catch {
    // Browsers may block audio despite a user-initiated sign-in; the visual welcome still continues.
  }
}

export default function HomeFlow() {
  const [accessView, setAccessView] = useState<AccessView>(() => typeof window !== "undefined" && window.localStorage.getItem(DEMO_SESSION_KEY) === "active" ? "app" : "login");
  const [showOverviewVideo, setShowOverviewVideo] = useState(false);
  const [demoAccessCode, setDemoAccessCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [ttoComplete, setTtoComplete] = useState(false);
  const [familyState, setFamilyState] = useState<FamilyState>("awaiting");
  const [familyAlerted, setFamilyAlerted] = useState(false);
  const [familyResponded, setFamilyResponded] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [patientUpdates, setPatientUpdates] = useState<Record<string, PatientUpdate>>({});
  const [ttoRecords, setTtoRecords] = useState<Record<string, TtoRecord>>(initialTtoRecords);
  const [handoverRecords, setHandoverRecords] = useState<Record<string, HandoverRecord>>(initialHandoverRecords);
  const [activityLog, setActivityLog] = useState<Record<string, ActivityEntry[]>>(initialActivityLog);
  const [selectedPatientId, setSelectedPatientId] = useState("margaret");
  const [toast, setToast] = useState<string | null>(null);
  const [wardDisplay, setWardDisplay] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const stateReadyRef = useRef(false);
  const skipFirstPublishRef = useRef(true);
  const latestUpdatedAtRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const ready = ttoComplete && familyState === "confirmed";
  const patients = useMemo(() => basePatients.filter((patient) => !patientUpdates[patient.id]?.leftWard).map((patient) => {
    const update = patient.id === "margaret" ? { barrierComplete: ttoComplete, familyState } : patientUpdates[patient.id];
    const tto = ttoRecords[patient.id];
    if (!update && !tto) return patient;
    const barrierComplete = Boolean(update?.barrierComplete) || patient.rag === "Green";
    const familyReady = update?.familyState === "confirmed" || defaultFamilyState(patient) === "confirmed";
    const patientReady = barrierComplete && familyReady;
    const coordinatedPatient = {
      ...patient,
      rag: patientReady ? "Green" as Rag : barrierComplete ? "Amber" as Rag : patient.rag,
      barrier: patientReady ? "None — ready to go" : barrierComplete ? "Family confirmation" : patient.barrier,
      owner: patientReady ? "Ward team" : barrierComplete ? "Ward coordinator" : patient.owner,
      deadline: patientReady ? "Complete" : barrierComplete ? "13:00" : patient.deadline,
      family: update?.familyState === "confirmed" ? "Collection confirmed" : update?.familyState === "support" ? "Support required" : update?.familyState === "contact" ? "Contact requested" : patient.family,
      update: patientReady ? "All actions complete · just now" : barrierComplete ? "Main barrier complete · just now" : patient.update,
    };
    if (tto?.stage === "clarification") return { ...coordinatedPatient, rag: "Red" as Rag, barrier: "TTO clarification", owner: "Ward team", deadline: tto.target, update: "Pharmacy query sent to ward · contact prescriber" };
    if (patient.id === "margaret" && tto && tto.stage !== "delivered") return { ...coordinatedPatient, rag: "Amber" as Rag, barrier: `TTO · ${ttoStageCopy[tto.stage].label}`, owner: ttoStageCopy[tto.stage].owner, deadline: tto.target, update: `${ttoStageCopy[tto.stage].label} · just now` };
    if (tto && tto.stage !== "delivered") return { ...coordinatedPatient, update: `TTO: ${ttoStageCopy[tto.stage].label} · just now` };
    return coordinatedPatient;
  }), [familyState, patientUpdates, ttoComplete, ttoRecords]);
  const riskPatients = useMemo(() => patients.filter((patient) => patient.rag === "Red" || (patient.id === "margaret" && patient.rag !== "Green")), [patients]);
  const selectedBasePatient = basePatients.find((patient) => patient.id === selectedPatientId) ?? basePatients[0];
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];
  const selectedUpdate = selectedPatientId === "margaret" ? { barrierComplete: ttoComplete, familyState, familyAlerted, familyResponded } : patientUpdates[selectedPatientId];
  const selectedBarrierComplete = selectedUpdate?.barrierComplete ?? selectedBasePatient.rag === "Green";
  const selectedFamilyState = selectedUpdate?.familyState ?? defaultFamilyState(selectedBasePatient);
  const selectedFamilyAlerted = selectedUpdate?.familyAlerted ?? false;
  const selectedFamilyResponded = selectedUpdate?.familyResponded ?? false;
  const selectedEscalated = selectedPatientId === "margaret" ? escalated : patientUpdates[selectedPatientId]?.escalated ?? false;
  const selectedEscalationAcknowledged = (activityLog[selectedPatientId] ?? []).some((entry) => entry.kind === "acknowledgement");
  const openTtoCount = Object.values(ttoRecords).filter((record) => record.stage !== "delivered").length;
  const pendingHandoverCount = Object.values(handoverRecords).filter((record) => record.status !== "accepted").length;
  const showToast = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(null), 3200); }, []);
  const markUpdated = useCallback(() => { const nextUpdatedAt = Date.now(); latestUpdatedAtRef.current = nextUpdatedAt; setUpdatedAt(nextUpdatedAt); }, []);
  const appendActivity = useCallback((patientId: string, entries: Omit<ActivityEntry, "id" | "time">[]) => {
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const created = entries.map((entry, index) => ({ ...entry, id: `${Date.now()}-${patientId}-${index}`, time }));
    setActivityLog((current) => ({ ...current, [patientId]: [...created.reverse(), ...(current[patientId] ?? [])].slice(0, 12) }));
  }, []);
  const completeTto = useCallback(() => {
    const previousStage = ttoStageCopy[ttoRecords.margaret?.stage ?? "submitted"].label;
    setTtoComplete(true);
    setTtoRecords((current) => ({
      ...current,
      margaret: {
        ...current.margaret,
        stage: "delivered",
        note: "Medicines delivered to the ward. Ready for discharge checks.",
      },
    }));
    appendActivity("margaret", [
      { kind: "pharmacy", action: "TTO delivered to ward", actor: "Pharmacy team", detail: "The fictional pharmacy milestone was completed.", previous: previousStage, current: "Delivered to ward" },
      { kind: "ward", action: "Ward display updated", actor: "HomeFlow demo", detail: "The discharge journey and ward views refreshed automatically.", previous: "TTO outstanding", current: "TTO complete" },
    ]);
    markUpdated();
    showToast("TTO delivered — Margaret’s pharmacy queue and journey have updated.");
  }, [appendActivity, markUpdated, showToast, ttoRecords]);
  const confirmFamily = useCallback((state: "confirmed" | "support" | "contact" = "confirmed") => {
    const labels: Record<FamilyState, string> = { awaiting: "Awaiting response", confirmed: "Collection confirmed", support: "Support required", contact: "Contact requested" };
    setFamilyAlerted(true); setFamilyResponded(true); setFamilyState(state);
    appendActivity("margaret", [{ kind: "family", action: "Family response recorded", actor: "Ward coordinator", detail: "A simulated reply from the nominated contact updated the shared ward view.", previous: labels[familyState], current: labels[state] }]);
    markUpdated();
    showToast(state === "confirmed" ? "Collection confirmed — family readiness has updated." : state === "support" ? "Support required — the ward view has updated." : "Contact request recorded in demo mode.");
  }, [appendActivity, familyState, markUpdated, showToast]);
  const completePatientBarrier = useCallback((patientId: string) => {
    if (patientId === "margaret") { completeTto(); return; }
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: true, familyState: current[patientId]?.familyState ?? defaultFamilyState(patient) } }));
    appendActivity(patientId, [
      { kind: "completion", action: "Review completed by Dr Demo", actor: patient.owner, detail: `${patient.barrier} was marked complete in the prototype.`, previous: "Outstanding", current: "Complete" },
      { kind: "ward", action: "Ward display updated", actor: "HomeFlow demo", detail: "The patient’s barrier and RAG position refreshed automatically.", previous: patient.rag, current: defaultFamilyState(patient) === "confirmed" ? "Green" : "Awaiting family readiness" },
    ]);
    markUpdated();
    showToast(`${patient.name}’s barrier is complete — all HomeFlow views have updated.`);
  }, [appendActivity, completeTto, markUpdated, showToast]);
  const updatePatientFamily = useCallback((patientId: string, state: "confirmed" | "support" | "contact") => {
    if (patientId === "margaret") { confirmFamily(state); return; }
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    const previousFamily = patientUpdates[patientId]?.familyState ?? defaultFamilyState(patient);
    const labels: Record<FamilyState, string> = { awaiting: "Awaiting response", confirmed: "Collection confirmed", support: "Support required", contact: "Contact requested" };
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: current[patientId]?.barrierComplete ?? patient.rag === "Green", familyState: state, familyAlerted: true, familyResponded: true } }));
    appendActivity(patientId, [{ kind: "family", action: "Family response recorded", actor: "Ward coordinator", detail: "The simulated family reply was shared with the ward view.", previous: labels[previousFamily], current: labels[state] }]);
    markUpdated();
    showToast(state === "confirmed"
      ? `${patient.name}’s collection is confirmed — the ward display has updated.`
      : state === "support"
        ? `${patient.name} requires collection support — the ward display has updated.`
        : `${patient.name} requested contact from the ward.`);
  }, [appendActivity, confirmFamily, markUpdated, patientUpdates, showToast]);
  const alertPatientFamily = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    if (patientId === "margaret") setFamilyAlerted(true);
    else setPatientUpdates((current) => ({ ...current, [patientId]: {
      ...current[patientId],
      barrierComplete: current[patientId]?.barrierComplete ?? patient.rag === "Green",
      familyState: current[patientId]?.familyState ?? defaultFamilyState(patient),
      familyAlerted: true,
    } }));
    appendActivity(patientId, [{ kind: "family", action: "Family alerted", actor: "Ward nurse · Demo", detail: "The one-off discharge-readiness message was marked as sent in demonstration mode.", previous: "Not alerted", current: "Alerted · awaiting response" }]);
    markUpdated();
    showToast(`${patient.name}’s nominated contact has been alerted in demo mode.`);
  }, [appendActivity, markUpdated, showToast]);
  const escalatePatient = useCallback((patientId: string) => {
    const patient = patients.find((item) => item.id === patientId) ?? basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    if (patientId === "margaret") setEscalated(true);
    else setPatientUpdates((current) => ({ ...current, [patientId]: {
      ...current[patientId],
      barrierComplete: current[patientId]?.barrierComplete ?? patient.rag === "Green",
      familyState: current[patientId]?.familyState ?? defaultFamilyState(patient),
      escalated: true,
    } }));
    appendActivity(patientId, [{ kind: "escalation", action: `Escalated to ${patient.owner}`, actor: "Ward coordinator · Demo", detail: `${patient.barrier} requires action by the responsible team. No real alert was sent.`, previous: "Not escalated", current: "Sent · awaiting acknowledgement" }]);
    markUpdated();
    showToast(`${patient.name}’s demo escalation to ${patient.owner} was logged — nobody was contacted.`);
  }, [appendActivity, markUpdated, patients, showToast]);
  const acknowledgeEscalation = useCallback((patientId: string) => {
    const patient = patients.find((item) => item.id === patientId) ?? basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    appendActivity(patientId, [{ kind: "acknowledgement", action: `${patient.owner} acknowledged`, actor: `${patient.owner} · Demo`, detail: "The responsible team confirmed receipt and accepted ownership of the next action.", previous: "Sent · awaiting acknowledgement", current: "Acknowledged · action in progress" }]);
    markUpdated();
    showToast(`${patient.name}: ${patient.owner} acknowledged the escalation in demonstration mode.`);
  }, [appendActivity, markUpdated, patients, showToast]);
  const advanceTto = useCallback((patientId: string) => {
    const record = ttoRecords[patientId];
    const patient = basePatients.find((item) => item.id === patientId);
    if (!record || !patient || record.stage === "delivered") return;
    const sequence: TtoStage[] = ["awaiting-prescription", "submitted", "received", "preparing", "ready", "delivered"];
    const nextStage = record.stage === "clarification" ? "received" : sequence[Math.min(sequence.indexOf(record.stage) + 1, sequence.length - 1)];
    setTtoRecords((current) => ({ ...current, [patientId]: { ...current[patientId], stage: nextStage, assignee: ttoStageCopy[nextStage].owner, note: nextStage === "clarification" ? current[patientId].note : `${ttoStageCopy[nextStage].label} · updated in demo mode.` } }));
    if (patientId === "margaret" && nextStage === "delivered") setTtoComplete(true);
    appendActivity(patientId, [
      { kind: "pharmacy", action: ttoStageCopy[nextStage].label, actor: ttoStageCopy[nextStage].owner, detail: "The fictional TTO workflow was updated in the pharmacy workspace.", previous: ttoStageCopy[record.stage].label, current: ttoStageCopy[nextStage].label },
      { kind: "ward", action: "Ward display updated", actor: "HomeFlow demo", detail: "The latest pharmacy stage became visible to ward staff.", previous: ttoStageCopy[record.stage].label, current: ttoStageCopy[nextStage].label },
    ]);
    markUpdated();
    showToast(`${patient.name}: ${ttoStageCopy[nextStage].label}. Ward and pharmacy views are synchronised.`);
  }, [appendActivity, markUpdated, showToast, ttoRecords]);
  const requestTtoClarification = useCallback((patientId: string, clarification: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    const query = clarification.trim();
    if (!patient || !query) return;
    const previousStage = ttoRecords[patientId]?.stage;
    setTtoRecords((current) => ({ ...current, [patientId]: { ...current[patientId], stage: "clarification", assignee: "Ward team", note: `Pharmacy query: ${query}` } }));
    appendActivity(patientId, [{ kind: "pharmacy", action: "Clarification sent to ward", actor: "Pharmacy team", detail: `${query} The ward should coordinate with the responsible prescriber; any prescription change remains in the approved prescribing system.`, previous: previousStage ? ttoStageCopy[previousStage].label : "TTO in progress", current: "Ward follow-up required" }]);
    markUpdated();
    showToast(`${patient.name}: clarification sent to the ward for prescriber follow-up.`);
  }, [appendActivity, markUpdated, showToast, ttoRecords]);
  const advanceHandover = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    const record = handoverRecords[patientId];
    if (!patient || !record || record.status === "accepted") return;
    const sequence: HandoverStatus[] = ["draft", "sent", "read", "acknowledged", "accepted"];
    const nextStatus = record.status === "clarification" ? "sent" : sequence[Math.min(sequence.indexOf(record.status) + 1, sequence.length - 1)];
    setHandoverRecords((current) => ({ ...current, [patientId]: { ...current[patientId], status: nextStatus, note: nextStatus === "sent" ? "Verified update sent in demonstration mode—no real service contacted." : `${handoverStatusCopy[nextStatus].label} · simulated at 11:35.` } }));
    appendActivity(patientId, [{ kind: "handover", action: `Community handover ${handoverStatusCopy[nextStatus].label.toLowerCase()}`, actor: nextStatus === "sent" ? "Ward coordinator · Demo" : record.team, detail: "The closed-loop handover milestone was simulated; no real service was contacted.", previous: handoverStatusCopy[record.status].label, current: handoverStatusCopy[nextStatus].label }]);
    markUpdated();
    showToast(`${patient.name}: community handover ${handoverStatusCopy[nextStatus].label.toLowerCase()}.`);
  }, [appendActivity, handoverRecords, markUpdated, showToast]);
  const requestHandoverClarification = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    const previousStatus = handoverRecords[patientId]?.status;
    setHandoverRecords((current) => ({ ...current, [patientId]: { ...current[patientId], status: "clarification", note: "Receiving team requested clarification from the ward. No clinical instruction has been changed." } }));
    appendActivity(patientId, [{ kind: "handover", action: "Community clarification requested", actor: handoverRecords[patientId]?.team ?? "Receiving team", detail: "The ward must review the verified update before resending it.", previous: previousStatus ? handoverStatusCopy[previousStatus].label : "Handover in progress", current: "Clarification requested" }]);
    markUpdated();
    showToast(`${patient.name}: community team clarification request recorded.`);
  }, [appendActivity, handoverRecords, markUpdated, showToast]);
  const updateHandoverTeam = useCallback((patientId: string, team: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient || !receivingTeams.includes(team)) return;
    setHandoverRecords((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        team,
        status: "draft",
        note: "Receiving team changed in demonstration mode. Review the verified update before sending.",
      },
    }));
    markUpdated();
    showToast(`${patient.name}: receiving team changed to ${team}. Handover returned to Draft.`);
  }, [markUpdated, showToast]);
  const updateHandoverChangesChoice = useCallback((patientId: string, hasChanges: boolean) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    setHandoverRecords((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        hasChanges,
        status: "draft",
        note: hasChanges
          ? "Changes selected. Review the statement before sending."
          : "No changes selected in demonstration mode.",
      },
    }));
    markUpdated();
    showToast(`${patient.name}: ${hasChanges ? "change details opened" : "no changes selected"}. Handover returned to Draft.`);
  }, [markUpdated, showToast]);
  const updateHandoverChangeText = useCallback((patientId: string, change: string) => {
    if (!basePatients.some((item) => item.id === patientId)) return;
    setHandoverRecords((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        hasChanges: true,
        change,
        status: "draft",
        note: "Change statement edited in demonstration mode. Review before sending.",
      },
    }));
    markUpdated();
  }, [markUpdated]);
  const navigate = useCallback((next: View) => { setView(next); setMobileMenuOpen(false); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const enterDemo = useCallback(async () => {
    const passwordBytes = new TextEncoder().encode(demoAccessCode);
    const passwordDigest = await window.crypto.subtle.digest("SHA-256", passwordBytes);
    const passwordHash = Array.from(new Uint8Array(passwordDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (passwordHash !== DEMO_PASSWORD_SHA256) {
      setLoginError("The email or password is incorrect.");
      return;
    }
    window.localStorage.setItem(DEMO_SESSION_KEY, "active");
    setLoginError("");
    setAccessView("welcome");
    void playWelcomeSound();
    navigate("dashboard");
  }, [demoAccessCode, navigate]);
  const signOutDemo = useCallback(() => {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    setDemoAccessCode("");
    setLoginError("");
    setAccessView("login");
    setView("dashboard");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0 });
  }, []);
  const recordPatientLeft = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    const currentBarrierComplete = patientId === "margaret" ? ttoComplete : patientUpdates[patientId]?.barrierComplete ?? patient.rag === "Green";
    const currentFamilyState = patientId === "margaret" ? familyState : patientUpdates[patientId]?.familyState ?? defaultFamilyState(patient);
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: currentBarrierComplete, familyState: currentFamilyState, leftWard: true } }));
    appendActivity(patientId, [{ kind: "departure", action: "Patient departure recorded", actor: "Ward nurse · Demo", detail: "The fictional patient was removed from current ward views.", previous: "Ready to leave", current: "Left ward" }]);
    const nextPatient = basePatients.find((item) => item.id !== patientId && !patientUpdates[item.id]?.leftWard);
    setSelectedPatientId(nextPatient?.id ?? "margaret");
    markUpdated();
    navigate("board");
    showToast(`${patient.name} has left the ward and was removed from live ward views.`);
  }, [appendActivity, familyState, markUpdated, navigate, patientUpdates, showToast, ttoComplete]);
  const resetDemo = useCallback(() => { setTtoComplete(false); setFamilyState("awaiting"); setFamilyAlerted(false); setFamilyResponded(false); setEscalated(false); setPatientUpdates({}); setTtoRecords(initialTtoRecords); setHandoverRecords(initialHandoverRecords); setActivityLog(initialActivityLog); setSelectedPatientId("margaret"); markUpdated(); setView("dashboard"); setWardDisplay(false); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`); showToast("Demo reset to the starting position."); }, [markUpdated, showToast]);
  const openWardDisplay = useCallback(() => { window.open(`${window.location.pathname}${window.location.search}#ward-display`, "homeflow-ward-display", "noopener,noreferrer"); }, []);
  const exitWardDisplay = useCallback(() => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`); setView("dashboard"); setWardDisplay(false); }, []);
  useEffect(() => {
    if (accessView !== "welcome") return;
    const welcomeTimer = window.setTimeout(() => setAccessView("app"), 5000);
    return () => window.clearTimeout(welcomeTimer);
  }, [accessView]);
  useEffect(() => {
    const updateDisplayMode = () => {
      const hash = window.location.hash.slice(1);
      setWardDisplay(hash === "ward-display");
      if (hash in screenCopy) setView(hash as View);
    };
    updateDisplayMode();
    window.addEventListener("hashchange", updateDisplayMode);
    return () => window.removeEventListener("hashchange", updateDisplayMode);
  }, []);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);
  useEffect(() => {
    const applyState = (next: DemoState) => {
      if (typeof next?.ttoComplete !== "boolean" || typeof next?.escalated !== "boolean" || !["awaiting", "confirmed", "support", "contact"].includes(next.familyState)) return;
      const incomingUpdatedAt = Number(next.updatedAt) || Date.now();
      if (incomingUpdatedAt < latestUpdatedAtRef.current) return;
      latestUpdatedAtRef.current = incomingUpdatedAt;
      setTtoComplete(next.ttoComplete);
      setFamilyState(next.familyState);
      setFamilyAlerted(Boolean(next.familyAlerted));
      setFamilyResponded(Boolean(next.familyResponded));
      setEscalated(next.escalated);
      setPatientUpdates(next.patientUpdates && typeof next.patientUpdates === "object" ? next.patientUpdates : {});
      setTtoRecords(next.ttoRecords && typeof next.ttoRecords === "object" ? next.ttoRecords : initialTtoRecords);
      setHandoverRecords(next.handoverRecords && typeof next.handoverRecords === "object" ? next.handoverRecords : initialHandoverRecords);
      setActivityLog(next.activityLog && typeof next.activityLog === "object" ? next.activityLog : initialActivityLog);
      setUpdatedAt(incomingUpdatedAt);
    };
    const readStoredState = () => {
      const stored = window.localStorage.getItem(DEMO_STATE_KEY);
      if (!stored) return;
      try { applyState(JSON.parse(stored) as DemoState); } catch { /* Ignore malformed local demo state. */ }
    };
    readStoredState();
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(DEMO_CHANNEL);
    if (channel) channel.onmessage = (event: MessageEvent<DemoState>) => applyState(event.data);
    channelRef.current = channel;
    const onStorage = (event: StorageEvent) => { if (event.key === DEMO_STATE_KEY && event.newValue) { try { applyState(JSON.parse(event.newValue) as DemoState); } catch { /* Ignore malformed local demo state. */ } } };
    window.addEventListener("storage", onStorage);
    const fallbackRefresh = window.setInterval(readStoredState, 5000);
    stateReadyRef.current = true;
    return () => {
      window.clearInterval(fallbackRefresh);
      window.removeEventListener("storage", onStorage);
      channel?.close();
      channelRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!stateReadyRef.current) return;
    if (skipFirstPublishRef.current) {
      skipFirstPublishRef.current = false;
      return;
    }
    const nextState: DemoState = { ttoComplete, familyState, familyAlerted, familyResponded, escalated, patientUpdates, ttoRecords, handoverRecords, activityLog, updatedAt };
    window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(nextState));
    channelRef.current?.postMessage(nextState);
  }, [activityLog, escalated, familyAlerted, familyResponded, familyState, handoverRecords, patientUpdates, ttoComplete, ttoRecords, updatedAt]);
  useEffect(() => {
    const mc = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!mc?.registerTool) return;
    const controller = new AbortController();
    const add = (tool: unknown) => Promise.resolve(mc.registerTool(tool, { signal: controller.signal })).catch(() => undefined);
    void add({ name: "navigate_homeflow_demo", title: "Navigate HomeFlow", description: "Open a HomeFlow prototype screen.", inputSchema: { type: "object", properties: { screen: { type: "string", enum: navItems.map((i) => i.id) } }, required: ["screen"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: (input: { screen: string }) => { if (!navItems.some((item) => item.id === input.screen)) throw new Error("Unknown HomeFlow screen"); navigate(input.screen as View); return { screen: input.screen }; } });
    void add({ name: "complete_demo_tto", title: "Complete demo TTO", description: "Mark Margaret T.’s fictional TTO barrier complete.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { completeTto(); return { ttoComplete: true }; } });
    void add({ name: "confirm_demo_collection", title: "Confirm demo collection", description: "Record fictional family collection confirmation.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { confirmFamily("confirmed"); return { familyReadiness: "confirmed" }; } });
    void add({ name: "reset_homeflow_demo", title: "Reset HomeFlow demo", description: "Reset all prototype interactions.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { resetDemo(); return { reset: true }; } });
    return () => controller.abort();
  }, [completeTto, confirmFamily, navigate, resetDemo]);
  const content: Record<View, React.ReactNode> = {
    dashboard: <Dashboard ready={ready} atRiskCount={riskPatients.length} openTtos={openTtoCount} pendingHandovers={pendingHandoverCount} patients={patients} onNavigate={navigate} onOpenPatient={(patientId) => { setSelectedPatientId(patientId); navigate("journey"); }} />, board: <WardBoard patients={patients} ttoRecords={ttoRecords} onOpen={(patientId) => { setSelectedPatientId(patientId); navigate("journey"); }} />,
    risk: <RiskPatients patients={riskPatients} onOverview={() => navigate("dashboard")} onJourney={(patientId) => { setSelectedPatientId(patientId); navigate("journey"); }} onEscalation={(patientId) => { setSelectedPatientId(patientId); navigate("escalation"); }} />,
    journey: selectedPatient ? <Journey patient={selectedPatient} barrierComplete={selectedBarrierComplete} familyState={selectedFamilyState} tto={ttoRecords[selectedPatient.id]} handover={handoverRecords[selectedPatient.id]} activity={activityLog[selectedPatient.id] ?? []} onBarrier={() => completePatientBarrier(selectedPatient.id)} onFamily={() => updatePatientFamily(selectedPatient.id, "confirmed")} onPatientLeft={() => recordPatientLeft(selectedPatient.id)} onCommunity={() => navigate("community")} onPharmacy={() => navigate("pharmacy")} onEscalation={() => navigate("escalation")} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    pharmacy: <PharmacyQueue patients={patients} records={ttoRecords} activity={activityLog} onAdvance={advanceTto} onClarification={requestTtoClarification} onAcknowledge={acknowledgeEscalation} />,
    community: <CommunityHandover patients={patients} records={handoverRecords} onAdvance={advanceHandover} onClarification={requestHandoverClarification} onJourney={(patientId) => { setSelectedPatientId(patientId); navigate("journey"); }} onTeamChange={updateHandoverTeam} onChangesChoice={updateHandoverChangesChoice} onChangeText={updateHandoverChangeText} />,
    family: selectedPatient ? <FamilyScreen patient={selectedPatient} familyState={selectedFamilyState} alertSent={selectedFamilyAlerted} responded={selectedFamilyResponded} onAlert={() => alertPatientFamily(selectedPatient.id)} onFamily={(state) => updatePatientFamily(selectedPatient.id, state)} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    escalation: selectedPatient ? <Escalation patient={selectedPatient} escalated={selectedEscalated} acknowledged={selectedEscalationAcknowledged} barrierComplete={selectedBarrierComplete} onEscalate={() => escalatePatient(selectedPatient.id)} onAcknowledge={() => acknowledgeEscalation(selectedPatient.id)} onBarrier={() => completePatientBarrier(selectedPatient.id)} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    integration: <Integration />,
    analytics: <Analytics />,
    pilot: <Pilot />,
  };
  const overviewVideo = showOverviewVideo ? <OverviewVideo onClose={() => setShowOverviewVideo(false)} /> : null;
  if (accessView === "login") return <><LoginScreen code={demoAccessCode} error={loginError} onCodeChange={(code) => { setDemoAccessCode(code); setLoginError(""); }} onSubmit={() => { void enterDemo(); }} onWatchVideo={() => setShowOverviewVideo(true)} />{overviewVideo}</>;
  if (accessView === "welcome") return <WelcomeScreen />;
  if (wardDisplay) return <WardDisplay patients={patients} updatedAt={updatedAt} onExit={exitWardDisplay} />;
  const pharmacyWorkspace = view === "pharmacy";
  return <div className={`app-shell ${pharmacyWorkspace ? "pharmacy-mode" : "ward-mode"}`}><div className="prototype-banner"><AlertTriangle size={15} /><strong>HomeFlow Prototype — Demonstration Data</strong><span>No real patient data, messaging or live system integration</span></div>
    {!pharmacyWorkspace && <aside className="sidebar"><div className="brand"><img className="brand-logo" src="./homeflow-logo.png" alt="HomeFlow" /></div><nav aria-label="Ward workspace navigation">{wardNavItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} title={item.label}><Icon size={19} /><span>{item.short}</span></button>; })}</nav><div className="sidebar-bottom"><button className="demo-reset" onClick={resetDemo}><RefreshCcw size={18} /><span>Reset demo</span></button><div className="not-nhs"><ShieldCheck size={17} /><span>Independent innovation concept<br />Not an official NHS product</span></div></div></aside>}
    <header className="topbar"><div className="topbar-logo"><img src="./homeflow-logo.png" alt="HomeFlow" /></div><div className="topbar-context"><strong>Northview NHS Trust</strong><span>{pharmacyWorkspace ? "Pharmacy operational workspace" : "Fictional demonstration environment"}</span></div><div className="workspace-switcher"><div className="workspace-copy"><small>Switch workspace</small><div className="workspace-select-wrap">{pharmacyWorkspace ? <Pill size={15} /> : <ListChecks size={15} />}<select aria-label="Choose HomeFlow workspace" value={pharmacyWorkspace ? "pharmacy" : "ward"} onChange={(event) => navigate(event.target.value === "pharmacy" ? "pharmacy" : "board")}><option value="ward">Ward coordination</option><option value="pharmacy">Pharmacy operations</option></select><ChevronDown size={15} /></div></div></div><div className="topbar-actions">{!pharmacyWorkspace && <button className="ward-display-launch" onClick={openWardDisplay} aria-label="Open privacy-safe ward display"><MonitorUp size={17} /><span>Ward display</span></button>}<div className="demo-switch"><span>Demo Mode</span><button role="switch" aria-checked={demoMode} className={demoMode ? "on" : ""} onClick={() => setDemoMode((m) => !m)}><i /></button></div><div className="updated"><Clock3 size={16} /><span>Updated {new Date(updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></div><div className="demo-account"><UserRoundCheck size={17} /><span><small>Official account</small><strong>{OFFICIAL_EMAIL}</strong></span><button onClick={signOutDemo} aria-label="Sign out of the HomeFlow demo" title="Sign out"><LogOut size={17} /></button></div></div></header>
    <main className={`main-content view-${view}`}><section className="page-header"><div><p>{screenCopy[view].eyebrow}</p><h1>{screenCopy[view].title}</h1><span>{screenCopy[view].subtitle}</span></div>{view === "dashboard" && <div className="dashboard-hero-actions"><span className="dashboard-live"><i /> Live demo position</span><div className="dashboard-hero-buttons"><button className="dashboard-video-launch" onClick={() => setShowOverviewVideo(true)}><Play size={16} /> Watch Margaret’s journey</button><Button variant="secondary" onClick={() => navigate("board")}>Open ward board <ArrowRight size={17} /></Button></div></div>}</section>{content[view]}<footer><div className="footer-mark"><Home size={16} /> HomeFlow</div><p>Concept prototype · Fictional data only · Proposed connections require formal approval</p><span>Dragons’ Den 2026</span></footer></main>
    {!pharmacyWorkspace && <div className="mobile-nav">{wardNavItems.filter((item) => ["dashboard", "board", "community", "family"].includes(item.id)).map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={18} /><span>{item.short}</span></button>; })}<button className={mobileMenuOpen || !["dashboard", "board", "community", "family"].includes(view) ? "active" : ""} onClick={() => setMobileMenuOpen(true)} aria-haspopup="dialog" aria-expanded={mobileMenuOpen}><Menu size={18} /><span>More</span></button></div>}
    {mobileMenuOpen && !pharmacyWorkspace ? <div className="mobile-menu-backdrop" role="presentation" onClick={() => setMobileMenuOpen(false)}><section className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" onClick={(event) => event.stopPropagation()}><header><div><span>HomeFlow</span><h2 id="mobile-menu-title">All ward tools</h2></div><button onClick={() => setMobileMenuOpen(false)} aria-label="Close all ward tools"><X size={21} /></button></header><nav aria-label="All mobile ward tools">{wardNavItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><span className="mobile-menu-icon"><Icon size={20} /></span><span><strong>{item.short}</strong><small>{item.label}</small></span>{view === item.id ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}</button>; })}</nav><p><ShieldCheck size={15} /> Ward tools only · demonstration data</p></section></div> : null}
    {overviewVideo}
    {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss"><X size={16} /></button></div>}
  </div>;
}

"use client";

import {
  Activity, AlertTriangle, ArrowRight, BarChart3, BedDouble, BellRing, Check,
  CheckCircle2, ChevronRight, CircleGauge, Clock3,
  DoorOpen, FileCheck2, HeartHandshake, Home, Info, LayoutDashboard, Link2, ListChecks,
  Maximize2, MessageSquareText, Minimize2, MonitorUp, PanelLeftClose, PanelLeftOpen, Pill, Play, Presentation,
  RefreshCcw, Route, ShieldCheck, Sparkles, Stethoscope, Target, TrendingDown,
  UserRoundCheck, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "dashboard" | "board" | "journey" | "family" | "escalation" | "integration" | "analytics" | "pilot";
type Rag = "Green" | "Amber" | "Red";
type FamilyState = "awaiting" | "confirmed" | "support" | "contact";
type Patient = { id: string; name: string; ward: string; bed: string; expected: string; rag: Rag; barrier: string; owner: string; deadline: string; family: string; update: string };
type PatientUpdate = { barrierComplete: boolean; familyState: FamilyState; familyAlerted?: boolean; familyResponded?: boolean; escalated?: boolean; leftWard?: boolean };
type DemoState = { ttoComplete: boolean; familyState: FamilyState; familyAlerted?: boolean; familyResponded?: boolean; escalated: boolean; patientUpdates?: Record<string, PatientUpdate>; updatedAt: number };

const DEMO_STATE_KEY = "homeflow-demo-state-v2";
const DEMO_CHANNEL = "homeflow-demo-sync-v2";

const navItems: { id: View; label: string; short: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Executive overview", short: "Overview", icon: LayoutDashboard },
  { id: "board", label: "Ward discharge board", short: "Ward board", icon: ListChecks },
  { id: "journey", label: "Patient journey", short: "Journey", icon: Route },
  { id: "family", label: "Family communication", short: "Family", icon: MessageSquareText },
  { id: "escalation", label: "Barrier escalation", short: "Escalation", icon: BellRing },
  { id: "integration", label: "Existing systems", short: "Integration", icon: Link2 },
  { id: "analytics", label: "Analytics & QI", short: "Analytics", icon: BarChart3 },
  { id: "pilot", label: "The pilot ask", short: "Pilot", icon: Presentation },
];

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
  journey: { eyebrow: "Patient journey · fictional demo patient", title: "From discharge expected to ready to leave", subtitle: "Every step, owner and deadline in one shared, easy-to-read timeline." },
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
function KpiCard({ label, value, note, icon: Icon, tone = "blue", onOpen, destination }: { label: string; value: string | number; note: string; icon: typeof Home; tone?: "blue" | "green" | "amber" | "red" | "purple"; onOpen?: () => void; destination?: string }) {
  const content = <><div className={`kpi-icon tone-${tone}`}><Icon size={19} /></div><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div><div className="kpi-note">{note}</div>{onOpen && <div className="kpi-open">Open {destination}<ArrowRight size={14} /></div>}</>;
  if (onOpen) return <button type="button" className="kpi-card kpi-card-openable" onClick={onOpen} aria-label={`Open ${destination} for ${label}`}>{content}</button>;
  return <article className="kpi-card">{content}</article>;
}

function Dashboard({ ready, onNavigate }: { ready: boolean; onNavigate: (view: View) => void }) {
  return <div className="screen-stack">
    <section className="kpi-grid" aria-label="Discharge metrics">
      <KpiCard label="Expected today" value={18} note="Across 3 demo wards" icon={Users} destination="ward board" onOpen={() => onNavigate("board")} />
      <KpiCard label="Ready for discharge" value={ready ? 7 : 6} note={ready ? "Margaret is now ready" : "2 awaiting collection"} icon={CheckCircle2} tone="green" destination="ward board" onOpen={() => onNavigate("board")} />
      <KpiCard label="Outstanding barriers" value={ready ? 4 : 5} note={ready ? "1 resolved in demo" : "3 actions due by noon"} icon={AlertTriangle} tone="amber" destination="barrier escalation" onOpen={() => onNavigate("escalation")} />
      <KpiCard label="At risk of delay" value={3} note="1 high-priority patient" icon={Activity} tone="red" destination="barrier escalation" onOpen={() => onNavigate("escalation")} />
      <KpiCard label="Average delay" value="2.4h" note="Demo 7-day average" icon={Clock3} tone="purple" destination="analytics" onOpen={() => onNavigate("analytics")} />
      <KpiCard label="Beds potentially released" value={ready ? 13 : 12} note="By 16:00 today" icon={BedDouble} tone="green" destination="ward board" onOpen={() => onNavigate("board")} />
    </section>
    <section className="content-grid">
      <article className="panel bottleneck-panel"><div className="panel-heading"><div><p className="section-kicker">Operational view</p><h2>Today’s discharge bottlenecks</h2></div><span className="mini-badge">23 open actions</span></div><div className="bottleneck-list">{bottlenecks.map((item) => <div className="bar-row" key={item.label}><div className="bar-meta"><span>{item.label}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(item.share * 2.55, 10)}%`, background: item.color }} /></div></div>)}</div></article>
      <div className="side-stack"><article className="panel readiness-panel"><div className="panel-heading compact"><div><p className="section-kicker">Family readiness</p><h2>{ready ? 79 : 71}% confirmed</h2></div><div className="readiness-ring" style={{ "--progress": `${ready ? 79 : 71}%` } as React.CSSProperties}><Users size={22} /></div></div><div className="readiness-bars"><span style={{ width: `${ready ? 79 : 71}%` }} /></div><div className="legend-row"><span><i className="dot dot-green" /> Confirmed {ready ? 11 : 10}</span><span><i className="dot dot-amber" /> Waiting 3</span><span><i className="dot dot-red" /> Support 1</span></div></article><article className="insight-card"><div className="insight-icon"><Sparkles size={20} /></div><div><p className="section-kicker">Flow insight</p><h3>Medication is today’s biggest opportunity</h3><p>Seven patients are waiting on TTO-related steps. Earlier visibility could protect up to 8.5 discharge hours.</p></div></article></div>
    </section>
  </div>;
}

function WardBoard({ patients, onOpen }: { patients: Patient[]; onOpen: (patientId: string) => void }) {
  const todayCount = patients.filter((patient) => patient.expected.startsWith("Today")).length;
  const greenCount = patients.filter((patient) => patient.rag === "Green").length;
  const amberCount = patients.filter((patient) => patient.rag === "Amber").length;
  const redCount = patients.filter((patient) => patient.rag === "Red").length;
  return <div className="screen-stack"><div className="board-toolbar"><div className="filter-group"><button className="filter active">All patients <span>{patients.length}</span></button><button className="filter">Today <span>{todayCount}</span></button><button className="filter">At risk <span>{redCount}</span></button></div><div className="board-summary"><span><i className="dot dot-green" /> {greenCount} Green</span><span><i className="dot dot-amber" /> {amberCount} Amber</span><span><i className="dot dot-red" /> {redCount} Red</span></div></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Patient / location</th><th>Expected discharge</th><th>Status</th><th>Main barrier</th><th>Owner / target</th><th>Family readiness</th><th>Latest update</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{patients.map((p) => <tr key={p.id} className={p.id === "margaret" ? "focus-row" : ""}><td><div className="patient-name">{p.name}</div><div className="muted">{p.ward} / {p.bed}</div></td><td><strong>{p.expected.split(" · ")[0]}</strong><div className="muted">{p.expected.split(" · ")[1]}</div></td><td><StatusPill status={p.rag} /></td><td><strong>{p.barrier}</strong></td><td><strong>{p.owner}</strong><div className="muted">Target {p.deadline}</div></td><td><div className="family-state"><UserRoundCheck size={16} /> {p.family}</div></td><td><span className="muted">{p.update}</span></td><td><button className="icon-button" aria-label={`Open ${p.name}`} onClick={() => onOpen(p.id)}><ChevronRight size={18} /></button></td></tr>)}</tbody></table></div><div className="table-foot"><Info size={16} /> Select any fictional patient to view and update their discharge journey. Changes sync to the ward display.</div></section>
    <section className="mobile-patient-list" aria-label="Phone-friendly ward discharge board">{patients.map((patient, index) => <article className={`mobile-patient-card rag-${patient.rag.toLowerCase()}`} key={patient.id}>
      <header><div><span className="mobile-demo-id">DEMO-{String(index + 101)}</span><h2>{patient.name}</h2><p>{patient.ward} · {patient.bed.replace("Bed ", "Bed D-")}</p></div><StatusPill status={patient.rag} /></header>
      <div className="mobile-patient-grid"><div><span>Expected discharge</span><strong>{patient.expected}</strong></div><div><span>Main barrier</span><strong>{patient.barrier}</strong></div><div><span>Owner / target</span><strong>{patient.owner} · {patient.deadline}</strong></div><div><span>Family readiness</span><strong>{patient.family}</strong></div></div>
      <div className="mobile-patient-footer"><span>{patient.update}</span><button onClick={() => onOpen(patient.id)} aria-label={`Open fictional patient ${patient.name}`}>View journey <ChevronRight size={18} /></button></div>
    </article>)}<div className="mobile-privacy-note"><Info size={16} /> Fictional names, demo IDs and bed numbers only.</div></section>
  </div>;
}

function Journey({ patient, barrierComplete, familyState, onBarrier, onFamily, onPatientLeft }: { patient: Patient; barrierComplete: boolean; familyState: FamilyState; onBarrier: () => void; onFamily: () => void; onPatientLeft: () => void }) {
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
  return <div className="screen-stack"><section className={`barrier-hero ${ready ? "resolved" : ""}`}><div className="barrier-symbol">{ready ? <CheckCircle2 /> : <Pill />}</div><div className="barrier-copy"><p className="section-kicker">{ready ? "Ready to go" : "Main barrier right now"}</p><h2>{ready ? "All discharge actions complete" : barrierComplete ? "Family collection confirmation" : patient.barrier}</h2><p>{ready ? `${patient.name} is now Green. The ward board and ward display have updated.` : barrierComplete ? "The main barrier is complete. The ward is waiting for family or transport confirmation." : `Action is owned by ${patient.owner} with a target of ${patient.deadline}. Completing it updates every HomeFlow view.`}</p></div><StatusPill status={ready ? "Green" : patient.rag} /></section>
    <section className="journey-layout"><article className="panel journey-panel"><div className="panel-heading"><div><p className="section-kicker">Discharge timeline</p><h2>{steps.length} coordinated steps</h2></div><span className="mini-badge">{steps.filter((s) => s.done).length} of {steps.length} complete</span></div><div className="timeline">{steps.map((step, index) => <div className={`timeline-step ${step.done ? "done" : "pending"}`} key={step.label}><div className="timeline-marker">{step.done ? <Check size={16} /> : index + 1}</div><div className="timeline-content"><h3>{step.label}</h3><p>{step.owner}</p></div><div className="timeline-meta"><span>{step.meta}</span>{step.action && <Button onClick={onBarrier}>Mark barrier complete</Button>}{step.familyAction && <Button variant="secondary" onClick={onFamily}>Confirm collection</Button>}</div></div>)}</div></article>
      <aside className="patient-card panel"><div className="avatar">{initials}</div><h2>{patient.name}</h2><p className="muted">Fictional demo patient</p><dl><div><dt>Location</dt><dd>{patient.ward} · {patient.bed}</dd></div><div><dt>Expected discharge</dt><dd>{patient.expected}</dd></div><div><dt>Pathway</dt><dd>Pathway 0 · Home</dd></div><div><dt>Family readiness</dt><dd>{patient.family}</dd></div></dl><div className="completion"><div><span>Journey completion</span><strong>{Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%</strong></div><div className="progress"><span style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }} /></div></div><div className="departure-action"><DoorOpen size={20} /><div><strong>Patient departure</strong><span>{ready ? "Remove this patient from live ward views." : "Complete the journey before recording departure."}</span></div><Button variant="secondary" onClick={onPatientLeft} disabled={!ready}>Patient has left ward</Button></div></aside>
    </section></div>;
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
      <article className="privacy-note"><ShieldCheck size={22} /><div><strong>Designed around approved communication routes</strong><p>Any real messaging would use an approved platform, consent model, nominated contact record and Information Governance review.</p></div></article>
    </section></div>;
}

function Escalation({ patient, escalated, barrierComplete, onEscalate, onBarrier }: { patient: Patient; escalated: boolean; barrierComplete: boolean; onEscalate: () => void; onBarrier: () => void }) {
  const deadlineParts = patient.deadline.match(/^(\d{2}):(\d{2})$/);
  const deadlineMinutes = deadlineParts ? Number(deadlineParts[1]) * 60 + Number(deadlineParts[2]) : 0;
  const overdueMinutes = deadlineMinutes ? Math.max(0, 11 * 60 + 35 - deadlineMinutes) : 0;
  const isOverdue = !barrierComplete && overdueMinutes > 0;
  const timingLabel = isOverdue ? `Overdue by ${overdueMinutes} minutes` : barrierComplete ? "Barrier complete" : `Action due by ${patient.deadline}`;
  const timingValue = isOverdue ? `+${String(Math.floor(overdueMinutes / 60)).padStart(2, "0")}:${String(overdueMinutes % 60).padStart(2, "0")}` : barrierComplete ? "Done" : patient.deadline;
  return <div className="screen-stack"><section className={`overdue-card ${barrierComplete ? "resolved" : ""}`}><div className="overdue-clock">{barrierComplete ? <CheckCircle2 /> : <Clock3 />}</div><div><p className="section-kicker">{barrierComplete ? "Barrier resolved" : "Deadline monitor · " + patient.name}</p><h2>{timingLabel}</h2><p>{barrierComplete ? "The patient journey and ward board now reflect completion." : `${patient.barrier} · escalation recipient: ${patient.owner} · demo current time 11:35`}</p></div><div className="overdue-number">{timingValue}</div></section>
    <section className="content-grid escalation-grid"><article className="panel escalation-detail"><div className="panel-heading"><div><p className="section-kicker">Barrier detail</p><h2>{patient.barrier} · {patient.name}</h2></div><StatusPill status={barrierComplete ? "Green" : patient.rag} /></div><dl className="detail-grid"><div><dt>Escalation recipient</dt><dd><Stethoscope size={18} /> {patient.owner}</dd></div><div><dt>Target completion</dt><dd><Clock3 size={18} /> {patient.expected.split(" · ")[0]} · {patient.deadline}</dd></div><div><dt>Escalation status</dt><dd><BellRing size={18} /> {barrierComplete ? "Closed" : escalated ? `Sent to ${patient.owner} · demo` : `Not sent · will go to ${patient.owner}`}</dd></div><div><dt>Patient impact</dt><dd><BedDouble size={18} /> {barrierComplete ? "Barrier no longer delaying discharge" : "Discharge cannot complete"}</dd></div></dl><div className="suggested-action"><div className="suggested-icon"><Target size={20} /></div><div><span>Who will receive this escalation?</span><strong>{barrierComplete ? "No escalation required" : `${patient.owner} — the team responsible for ${patient.barrier.toLowerCase()}.`}</strong></div></div><div className="action-row"><Button variant={escalated ? "success" : "primary"} onClick={onEscalate} disabled={escalated || barrierComplete} activateOnPointerUp>{escalated ? <CheckCircle2 size={17} /> : <BellRing size={17} />} {escalated ? `Escalated to ${patient.owner}` : `Escalate to ${patient.owner}`}</Button><Button variant="secondary" onClick={onBarrier} disabled={barrierComplete}><Check size={17} /> {barrierComplete ? "Barrier complete" : "Mark barrier complete"}</Button></div><div className={`escalation-check ${escalated ? "complete" : "pending"}`}>{escalated ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}<div><strong>{escalated ? "Escalation sent" : "Escalation not yet sent"}</strong><span>{escalated ? `Recorded as escalated to ${patient.owner} at 11:35.` : `Will be directed to ${patient.owner}.`}</span></div></div></article>
      <aside className="panel escalation-log"><div className="panel-heading"><div><p className="section-kicker">Activity</p><h2>{patient.name} · escalation trail</h2></div></div><div className="log-list"><div><span>{patient.update.match(/\d{2}:\d{2}/)?.[0] ?? "10:18"}</span><p><strong>Latest ward update</strong>{patient.update.split(" · ")[0]}.</p></div><div><span>{patient.deadline === "Complete" ? "Done" : patient.deadline}</span><p><strong>Target review</strong>{barrierComplete ? "Action completed." : isOverdue ? "Target passed without completion." : "Completion target remains active."}</p></div><div><span>11:35</span><p><strong>HomeFlow check</strong>{barrierComplete ? "No reminder required." : `If escalated, the alert will be directed to ${patient.owner}.`}</p></div>{escalated && <div className="latest"><span>11:35</span><p><strong>Escalation to {patient.owner} logged</strong>Demonstration only — no person or system was contacted.</p></div>}</div></aside>
    </section></div>;
}

const systems = [
  { name: "EPR / PAS", icon: FileCheck2, tag: "Existing capability", copy: "Patient demographics, ward, bed and expected discharge", side: "left" },
  { name: "OPTICA", icon: ListChecks, tag: "Existing capability", copy: "Discharge pathway, barriers, tasks and ownership", side: "left" },
  { name: "Home Safe / Care Point", icon: HeartHandshake, tag: "Requires confirmation", copy: "Community pathway status and handover milestones", side: "left" },
  { name: "DrDoctor / approved messaging", icon: MessageSquareText, tag: "Proposed connection", copy: "Patient and nominated family communications", side: "right" },
  { name: "Power BI / Analytics", icon: BarChart3, tag: "Proposed connection", copy: "Trends, delays, bottlenecks and evaluation", side: "right" },
  { name: "Hospital at Home", icon: Home, tag: "Requires confirmation", copy: "Existing pathway referral and acceptance status", side: "right" },
];
function SystemCard({ name, icon: Icon, tag, copy }: { name: string; icon: typeof Home; tag: string; copy: string }) {
  const tone = tag === "Existing capability" ? "existing" : tag === "Proposed connection" ? "proposed" : "confirm";
  return <article className="system-card"><div className="system-icon"><Icon size={20} /></div><div><span className={`system-tag ${tone}`}>{tag}</span><h3>{name}</h3><p>{copy}</p></div></article>;
}
function Integration() {
  return <div className="screen-stack"><section className="integration-statement"><Link2 size={24} /><div><strong>HomeFlow is designed to connect and enhance existing capability, not replace existing systems.</strong><p>This diagram shows a proposed future state. No technical integration is claimed or included in this prototype.</p></div></section><section className="integration-canvas panel"><div className="system-column">{systems.filter((s) => s.side === "left").map((s) => <SystemCard key={s.name} {...s} />)}</div><div className="flow-lines left-lines"><span /><span /><span /></div><article className="homeflow-hub"><div className="hub-mark"><Home size={27} /><span><i /><i /><i /></span></div><p>PROPOSED COORDINATION LAYER</p><h2>HomeFlow</h2><ul><li><Check size={15} /> Simplified ward view</li><li><Check size={15} /> Barrier coordination</li><li><Check size={15} /> Family readiness</li><li><Check size={15} /> Timely prompts</li></ul><small>Prototype only</small></article><div className="flow-lines right-lines"><span /><span /><span /></div><div className="system-column">{systems.filter((s) => s.side === "right").map((s) => <SystemCard key={s.name} {...s} />)}</div></section><section className="approval-banner"><ShieldCheck size={22} /><div><strong>Integration subject to Digital, Information Governance and supplier approval.</strong><p>Data flows, interoperability standards, lawful basis, DPIA, clinical safety, access controls and supplier feasibility would all require formal confirmation.</p></div></section><div className="integration-legend"><span><i className="legend-existing" /> Existing capability</span><span><i className="legend-proposed" /> Proposed connection</span><span><i className="legend-confirm" /> Requires confirmation</span></div></div>;
}

function Analytics() {
  const lostHours = [{ name: "TTO", value: 2.8 }, { name: "Transport", value: 2.2 }, { name: "Family", value: 1.7 }, { name: "Therapy", value: 1.4 }, { name: "Equipment", value: 1.2 }];
  const times = [{ time: "08–10", value: 8 }, { time: "10–12", value: 19 }, { time: "12–14", value: 28 }, { time: "14–16", value: 32 }, { time: "16–18", value: 13 }];
  return <div className="screen-stack"><section className="analytics-kpis"><KpiCard label="Before midday" value="27%" note="Target: 35%" icon={CircleGauge} /><KpiCard label="Family collection delay" value="46m" note="Illustrative average" icon={Users} tone="purple" /><KpiCard label="Lost discharge hours" value="38h" note="This demo week" icon={TrendingDown} tone="red" /><KpiCard label="Ready-to-leave time" value="2.4h" note="Baseline average" icon={Clock3} tone="amber" /></section><section className="analytics-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="section-kicker">Top causes of delay</p><h2>Share of recorded barriers</h2></div><span className="mini-badge">n = 86</span></div><div className="donut-layout"><div className="donut-chart"><div><strong>31%</strong><span>TTO</span></div></div><div className="donut-legend">{bottlenecks.slice(0, 6).map((b) => <div key={b.label}><i style={{ background: b.color }} /><span>{b.label}</span><strong>{b.share}%</strong></div>)}</div></div></article><article className="panel chart-panel"><div className="panel-heading"><div><p className="section-kicker">Average lost hours</p><h2>Time impact by barrier</h2></div></div><div className="horizontal-chart">{lostHours.map((item) => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.value / 3 * 100}%` }} /></div><strong>{item.value}h</strong></div>)}</div></article><article className="panel chart-panel wide"><div className="panel-heading"><div><p className="section-kicker">Discharges by time of day</p><h2>Too many patients leave after 14:00</h2></div><span className="mini-badge">Demo baseline</span></div><div className="column-chart">{times.map((item) => <div key={item.time}><span className="column-value">{item.value}%</span><i style={{ height: `${item.value * 3.2}px` }} /><span>{item.time}</span></div>)}</div></article><article className="impact-card"><div><p className="section-kicker">Illustrative before vs after</p><h2>Potential impact</h2></div><div className="impact-stat"><span>Average avoidable delay</span><div><strong>2.4h</strong><ArrowRight /><strong className="after">1.7h</strong></div><small>Illustrative 29% reduction</small></div><ul><li><CheckCircle2 /> Fewer avoidable discharge hours</li><li><CheckCircle2 /> Earlier bed availability</li><li><CheckCircle2 /> Improved family preparedness</li><li><CheckCircle2 /> Better visibility of bottlenecks</li></ul></article></section></div>;
}

function Pilot() {
  const measures = ["Time from discharge-ready to leaving ward", "Percentage discharged earlier in the day", "Number of delayed discharges", "Recorded reason for delay", "Family readiness", "Staff experience"];
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

export default function HomeFlow() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  const [ttoComplete, setTtoComplete] = useState(false);
  const [familyState, setFamilyState] = useState<FamilyState>("awaiting");
  const [familyAlerted, setFamilyAlerted] = useState(false);
  const [familyResponded, setFamilyResponded] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [patientUpdates, setPatientUpdates] = useState<Record<string, PatientUpdate>>({});
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
    if (!update) return patient;
    const barrierComplete = update.barrierComplete || patient.rag === "Green";
    const familyReady = update.familyState === "confirmed" || defaultFamilyState(patient) === "confirmed";
    const patientReady = barrierComplete && familyReady;
    return {
      ...patient,
      rag: patientReady ? "Green" as Rag : barrierComplete ? "Amber" as Rag : patient.rag,
      barrier: patientReady ? "None — ready to go" : barrierComplete ? "Family confirmation" : patient.barrier,
      owner: patientReady ? "Ward team" : barrierComplete ? "Ward coordinator" : patient.owner,
      deadline: patientReady ? "Complete" : barrierComplete ? "13:00" : patient.deadline,
      family: update.familyState === "confirmed" ? "Collection confirmed" : update.familyState === "support" ? "Support required" : update.familyState === "contact" ? "Contact requested" : patient.family,
      update: patientReady ? "All actions complete · just now" : barrierComplete ? "Main barrier complete · just now" : patient.update,
    };
  }), [familyState, patientUpdates, ttoComplete]);
  const selectedBasePatient = basePatients.find((patient) => patient.id === selectedPatientId) ?? basePatients[0];
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];
  const selectedUpdate = selectedPatientId === "margaret" ? { barrierComplete: ttoComplete, familyState, familyAlerted, familyResponded } : patientUpdates[selectedPatientId];
  const selectedBarrierComplete = selectedUpdate?.barrierComplete ?? selectedBasePatient.rag === "Green";
  const selectedFamilyState = selectedUpdate?.familyState ?? defaultFamilyState(selectedBasePatient);
  const selectedFamilyAlerted = selectedUpdate?.familyAlerted ?? false;
  const selectedFamilyResponded = selectedUpdate?.familyResponded ?? false;
  const selectedEscalated = selectedPatientId === "margaret" ? escalated : patientUpdates[selectedPatientId]?.escalated ?? false;
  const showToast = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(null), 3200); }, []);
  const markUpdated = useCallback(() => { const nextUpdatedAt = Date.now(); latestUpdatedAtRef.current = nextUpdatedAt; setUpdatedAt(nextUpdatedAt); }, []);
  const completeTto = useCallback(() => { setTtoComplete(true); markUpdated(); showToast("TTO marked complete — Margaret’s journey has updated."); }, [markUpdated, showToast]);
  const confirmFamily = useCallback((state: "confirmed" | "support" | "contact" = "confirmed") => { setFamilyAlerted(true); setFamilyResponded(true); setFamilyState(state); markUpdated(); showToast(state === "confirmed" ? "Collection confirmed — family readiness has updated." : state === "support" ? "Support required — the ward view has updated." : "Contact request recorded in demo mode."); }, [markUpdated, showToast]);
  const completePatientBarrier = useCallback((patientId: string) => {
    if (patientId === "margaret") { completeTto(); return; }
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: true, familyState: current[patientId]?.familyState ?? defaultFamilyState(patient) } }));
    markUpdated();
    showToast(`${patient.name}’s barrier is complete — all HomeFlow views have updated.`);
  }, [completeTto, markUpdated, showToast]);
  const updatePatientFamily = useCallback((patientId: string, state: "confirmed" | "support" | "contact") => {
    if (patientId === "margaret") { confirmFamily(state); return; }
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: current[patientId]?.barrierComplete ?? patient.rag === "Green", familyState: state, familyAlerted: true, familyResponded: true } }));
    markUpdated();
    showToast(state === "confirmed"
      ? `${patient.name}’s collection is confirmed — the ward display has updated.`
      : state === "support"
        ? `${patient.name} requires collection support — the ward display has updated.`
        : `${patient.name} requested contact from the ward.`);
  }, [confirmFamily, markUpdated, showToast]);
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
    markUpdated();
    showToast(`${patient.name}’s nominated contact has been alerted in demo mode.`);
  }, [markUpdated, showToast]);
  const escalatePatient = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    if (patientId === "margaret") setEscalated(true);
    else setPatientUpdates((current) => ({ ...current, [patientId]: {
      ...current[patientId],
      barrierComplete: current[patientId]?.barrierComplete ?? patient.rag === "Green",
      familyState: current[patientId]?.familyState ?? defaultFamilyState(patient),
      escalated: true,
    } }));
    markUpdated();
    showToast(`${patient.name}’s demo escalation to ${patient.owner} was logged — nobody was contacted.`);
  }, [markUpdated, showToast]);
  const navigate = useCallback((next: View) => { setView(next); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const recordPatientLeft = useCallback((patientId: string) => {
    const patient = basePatients.find((item) => item.id === patientId);
    if (!patient) return;
    const currentBarrierComplete = patientId === "margaret" ? ttoComplete : patientUpdates[patientId]?.barrierComplete ?? patient.rag === "Green";
    const currentFamilyState = patientId === "margaret" ? familyState : patientUpdates[patientId]?.familyState ?? defaultFamilyState(patient);
    setPatientUpdates((current) => ({ ...current, [patientId]: { ...current[patientId], barrierComplete: currentBarrierComplete, familyState: currentFamilyState, leftWard: true } }));
    const nextPatient = basePatients.find((item) => item.id !== patientId && !patientUpdates[item.id]?.leftWard);
    setSelectedPatientId(nextPatient?.id ?? "margaret");
    markUpdated();
    navigate("board");
    showToast(`${patient.name} has left the ward and was removed from live ward views.`);
  }, [familyState, markUpdated, navigate, patientUpdates, showToast, ttoComplete]);
  const resetDemo = useCallback(() => { setTtoComplete(false); setFamilyState("awaiting"); setFamilyAlerted(false); setFamilyResponded(false); setEscalated(false); setPatientUpdates({}); setSelectedPatientId("margaret"); markUpdated(); setView("dashboard"); setWardDisplay(false); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`); showToast("Demo reset to the starting position."); }, [markUpdated, showToast]);
  const openWardDisplay = useCallback(() => { window.open(`${window.location.pathname}${window.location.search}#ward-display`, "homeflow-ward-display", "noopener,noreferrer"); }, []);
  const exitWardDisplay = useCallback(() => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`); setView("dashboard"); setWardDisplay(false); }, []);
  useEffect(() => {
    const updateDisplayMode = () => {
      const hash = window.location.hash.slice(1);
      setWardDisplay(hash === "ward-display");
      if (navItems.some((item) => item.id === hash)) setView(hash as View);
    };
    updateDisplayMode();
    window.addEventListener("hashchange", updateDisplayMode);
    return () => window.removeEventListener("hashchange", updateDisplayMode);
  }, []);
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
    const nextState: DemoState = { ttoComplete, familyState, familyAlerted, familyResponded, escalated, patientUpdates, updatedAt };
    window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(nextState));
    channelRef.current?.postMessage(nextState);
  }, [escalated, familyAlerted, familyResponded, familyState, patientUpdates, ttoComplete, updatedAt]);
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
    dashboard: <Dashboard ready={ready} onNavigate={navigate} />, board: <WardBoard patients={patients} onOpen={(patientId) => { setSelectedPatientId(patientId); navigate("journey"); }} />,
    journey: selectedPatient ? <Journey patient={selectedPatient} barrierComplete={selectedBarrierComplete} familyState={selectedFamilyState} onBarrier={() => completePatientBarrier(selectedPatient.id)} onFamily={() => updatePatientFamily(selectedPatient.id, "confirmed")} onPatientLeft={() => recordPatientLeft(selectedPatient.id)} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    family: selectedPatient ? <FamilyScreen patient={selectedPatient} familyState={selectedFamilyState} alertSent={selectedFamilyAlerted} responded={selectedFamilyResponded} onAlert={() => alertPatientFamily(selectedPatient.id)} onFamily={(state) => updatePatientFamily(selectedPatient.id, state)} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    escalation: selectedPatient ? <Escalation patient={selectedPatient} escalated={selectedEscalated} barrierComplete={selectedBarrierComplete} onEscalate={() => escalatePatient(selectedPatient.id)} onBarrier={() => completePatientBarrier(selectedPatient.id)} /> : <EmptyJourney onBoard={() => navigate("board")} />,
    integration: <Integration />,
    analytics: <Analytics />,
    pilot: <Pilot />,
  };
  if (wardDisplay) return <WardDisplay patients={patients} updatedAt={updatedAt} onExit={exitWardDisplay} />;
  return <div className={`app-shell ${sidebarOpen ? "sidebar-visible" : "sidebar-collapsed"}`}><div className="prototype-banner"><AlertTriangle size={15} /><strong>HomeFlow Prototype — Demonstration Data</strong><span>No real patient data, messaging or live system integration</span></div>
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Home size={22} /><span><i /><i /><i /></span></div>{sidebarOpen && <div><strong>HomeFlow</strong><span>Discharge coordination</span></div>}</div><nav aria-label="Main navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} title={item.label}><Icon size={19} />{sidebarOpen && <span>{item.short}</span>}</button>; })}</nav><div className="sidebar-bottom"><button className="demo-reset" onClick={resetDemo}><RefreshCcw size={18} />{sidebarOpen && <span>Reset demo</span>}</button><div className="not-nhs"><ShieldCheck size={17} />{sidebarOpen && <span>Independent innovation concept<br />Not an official NHS product</span>}</div></div></aside>
    <header className="topbar"><button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label={sidebarOpen ? "Collapse navigation" : "Open navigation"}>{sidebarOpen ? <PanelLeftClose size={21} /> : <PanelLeftOpen size={21} />}</button><div className="topbar-context"><strong>Northview NHS Trust</strong><span>Fictional demonstration environment</span></div><div className="topbar-actions"><button className="ward-display-launch" onClick={openWardDisplay} aria-label="Open privacy-safe ward display"><MonitorUp size={17} /><span>Ward display</span></button><div className="demo-switch"><span>Demo Mode</span><button role="switch" aria-checked={demoMode} className={demoMode ? "on" : ""} onClick={() => setDemoMode((m) => !m)}><i /></button></div><div className="updated"><Clock3 size={16} /><span>Updated 11:35</span></div></div></header>
    <main className="main-content"><section className="page-header"><div><p>{screenCopy[view].eyebrow}</p><h1>{screenCopy[view].title}</h1><span>{screenCopy[view].subtitle}</span></div>{view === "dashboard" && <Button variant="secondary" onClick={() => navigate("board")}>Open ward board <ArrowRight size={17} /></Button>}</section>{content[view]}<footer><div className="footer-mark"><Home size={16} /> HomeFlow</div><p>Concept prototype · Fictional data only · Proposed connections require formal approval</p><span>Dragons’ Den 2026</span></footer></main>
    <div className="mobile-nav">{navItems.slice(0, 5).map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={18} /><span>{item.short}</span></button>; })}</div>
    {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss"><X size={16} /></button></div>}
  </div>;
}

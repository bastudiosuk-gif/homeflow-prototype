# HomeFlow prototype

HomeFlow is a polished, clickable discharge coordination, pharmacy visibility and family communication concept for an NHS Dragons’ Den innovation pitch. It shows how existing Trust capabilities could feed a simpler shared view. It does **not** replace Nervecentre, EPR/PAS, pharmacy systems, approved communication platforms or established discharge and community pathways.

## What is simulated

The prototype includes an executive dashboard, ward board, patient journey, staged family messages, overdue barrier escalation, a role-specific pharmacy TTO queue, a structured community handover view, a proposed integration map, QI analytics and the pilot ask. Changes are synchronised between these views in the browser for demonstration. All names, activity, metrics and messages are fictional. There is no backend, authentication, live messaging, API access or real patient data.

## What would require formal approval

Any real implementation would require confirmation and approval from clinical, operational, Digital, Information Governance, Data Protection, Clinical Safety, cyber security, accessibility, procurement and supplier teams. This includes data-flow mapping, lawful basis, DPIA, consent and nominated-contact processes, role-based access, interoperability standards, integration feasibility, clinical safety documentation and approved message delivery routes.

The integration view distinguishes existing capability, proposed connections and areas requiring confirmation. Nothing in the prototype claims a live integration.

## Run locally

```powershell
npm install
npm run dev
```

For a production build, run `npm run build`.

## Suggested 3-minute Dragons’ Den demo

1. Start on **Executive overview**.
2. Open the **Ward board** and select Amber patient **Margaret T.**
3. Show the outstanding TTO barrier on **Patient journey**.
4. Open **Pharmacy TTO queue**, advance the order and show how a clarification returns to the prescriber.
5. Open **Community handover** and show the closed-loop acknowledgement workflow.
6. Show the staged alert on **Family communication**.
7. Deliver Margaret’s TTO and confirm family collection.
8. Show Margaret turn Green / Ready to Go and the updated dashboard.
9. Show **Analytics & QI**.
10. Finish on **Existing systems**, stressing that every connection is proposed or requires local confirmation.

Use **Reset demo** at any time to restore the starting state.

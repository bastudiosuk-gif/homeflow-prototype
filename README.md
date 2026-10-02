# HomeFlow prototype

HomeFlow is a polished, clickable discharge coordination and family communication concept for an NHS Dragons’ Den innovation pitch. It shows how existing capabilities could be brought together into a simpler shared view. It does **not** replace OPTICA, EPR/PAS, DrDoctor, Power BI or established discharge and community pathways.

## What is simulated

The eight-screen prototype includes an executive dashboard, ward board, patient journey, staged family messages, overdue barrier escalation, a proposed integration map, QI analytics and the pilot ask. All names, activity, metrics and messages are fictional. There is no backend, authentication, live messaging, API access or real patient data.

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
4. Show the staged alert on **Family communication**.
5. Mark TTO complete.
6. Confirm family collection.
7. Show Margaret turn Green / Ready to Go and the updated dashboard.
8. Show **Analytics & QI**.
9. Finish on **Existing systems**, stressing that HomeFlow connects and enhances existing capability rather than replacing it.

Use **Reset demo** at any time to restore the starting state.

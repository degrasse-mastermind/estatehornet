# EstateHornet

EstateHornet is a Connecticut estate administration workflow prototype for tracking matters, deadlines, tasks, assets, interested parties, document checklists, and risk flags.

**Tagline:** A Connecticut estate administration command center for deadlines, documents, clients, and matter control.

## Current Phase

Phase 3A local prototype using React, Vite, TypeScript, localStorage, `pdf-lib`, and obviously fake seed data. There is no backend, authentication, client portal, document upload, secure file storage, or production data security layer yet.

## Phase 1 Features

- Mobile-friendly dashboard with open matters, deadline, waiting, overdue, and attorney review counts.
- Searchable and filterable matter list.
- Multi-step new matter intake workflow.
- Connecticut estate administration deadline engine with configurable rule offsets.
- Automatic task generation for opening review, CT estate tax review, inventory, PC-251 real estate review, creditor period, PC-237, and one-year status review.
- Matter detail tabs for overview, people, assets, deadlines/tasks, documents, and notes.
- Add, edit, and delete interested parties, assets, and tasks.
- Add, edit, and delete internal notes.
- Update document checklist statuses.
- Automatic risk flags for review-sensitive matter conditions.
- localStorage persistence after refresh.
- Fake seed matters for testing.

## Phase 2 Document Generation Foundation

Phase 2 adds a local-only document drafting foundation:

- Reusable starter templates stored in localStorage.
- Merge fields such as `{{decedent.fullName}}`, `{{fiduciary.name}}`, `{{probateCourt}}`, `{{assets.summary}}`, and `{{tasks.nextDeadline}}`.
- Matter-level generated document records.
- Draft preview and editing before save.
- Attorney/paralegal review status workflow.
- Checklist item linking and optional checklist status updates.
- Copy-to-clipboard, print, `.txt` download, and `.html` download.
- Templates page for viewing, duplicating, editing, and resetting starter templates.
- Merge Fields reference page with example output from fake matter data.
- Court form helper templates that are drafting aids only, not official forms.

### How Templates Work

Templates are TypeScript starter records loaded into browser localStorage. Template edits are local to your browser and can be reset from the Templates page. This structure is intentionally simple so templates can later move to DOCX templates, PDF mappings, SharePoint, Supabase/Postgres, or another approved database.

### How Merge Fields Work

Templates use double curly braces:

```text
Dear {{fiduciary.name}},

We are beginning estate administration workflow for {{decedent.fullName}}.
```

Known fields are replaced with matter data. Missing values render as clear placeholders such as `[Missing fiduciary email]` so drafts do not silently fail.

### Generate a Draft Document

1. Open a matter.
2. Go to the Documents tab.
3. Select a template.
4. Optionally link a document checklist item.
5. Click Generate Draft.
6. Review/edit the preview.
7. Save the generated draft.
8. Copy, print, or download the draft as needed.

## Phase 3A: PC-200 PDF Form Engine

Phase 3A adds a proof-of-concept PDF form engine for the Connecticut Probate Court PC-200, Petition/Administration or Probate of Will. It prepares draft PDFs only. Every generated PC-200 must be treated as `Draft - attorney/paralegal review required`.

### Purpose

- Inspect an official fillable PC-200 PDF supplied locally by the firm.
- Display detected AcroForm field names and field types.
- Map EstateHornet matter data to PC-200 fields through `src/services/pc200Mapping.ts`.
- Generate a draft completed PC-200 PDF when enabled mappings match the official PDF field names.
- Save generated PDF metadata to the matter without storing PDF bytes in localStorage.
- Offer checklist integration by updating the PC-200 checklist item to `attorney review`.

### Dependency

Phase 3A uses [`pdf-lib`](https://pdf-lib.js.org/) for client-side PDF loading, AcroForm inspection, field filling, checkbox handling where mappings exist, and draft PDF saving.

### Install the Official PC-200 PDF

Do not use random third-party form sources. Download the current official PC-200 PDF from the Connecticut Probate Courts website and place it here:

```text
public/forms/probate/PC-200.pdf
```

If the file is missing, the app will show:

```text
PC-200.pdf is not installed. Place the official Connecticut Probate Court PC-200 PDF at public/forms/probate/PC-200.pdf to enable this feature.
```

### Inspect and Map Fields

1. Install dependencies:

   ```bash
   pnpm install
   ```

   If your environment uses npm instead:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   pnpm dev
   ```

3. Open EstateHornet.
4. Go to `PDF Forms`.
5. Open `PC-200 Inspector`.
6. Inspect the detected field names.
7. Update `src/services/pc200Mapping.ts` by replacing `UPDATE_AFTER_INSPECTION_*` placeholder field names with the exact PDF field names and setting those mappings to `enabled: true`.
8. Open a fake matter.
9. Go to `Documents`.
10. Click `Prepare PC-200 Draft PDF`.
11. Review missing fields and warnings.
12. Generate and download the draft PDF.
13. Save the generated PDF metadata record to the matter if appropriate.

### Known Limitations

- PC-200 only.
- Requires fillable AcroForm fields.
- Coordinate overlay is not implemented yet.
- Generated PDFs are draft only.
- PDF files are not securely stored yet.
- localStorage is not production-safe.
- Human review is required before filing.
- Official form versions may change, requiring field-name reinspections and mapping updates.

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

If `pnpm` is not installed globally, use the package manager approved for your environment.

## Important Confidentiality Warning

Do not enter real client data, death certificates, SSNs, account numbers, court filings, tax documents, or confidential estate information into this prototype unless and until proper security controls are implemented and approved.

EstateHornet is an internal workflow and matter management prototype. It does not provide legal advice. All deadlines, filings, tax issues, distributions, communications, and documents require attorney/paralegal review.

Generated documents are drafts only. Attorney/paralegal review is required before using generated content. Official court forms must be reviewed against current Connecticut Probate Court requirements before filing. Court form helpers are drafting aids only and are not completed official court forms.

Browser localStorage is not secure for confidential production data.

## Current Limitations

- Uses browser localStorage only.
- No authentication or role-based permissions.
- No audit log.
- No encrypted file storage.
- No real probate court database.
- No production-grade document automation or secure official form filing.
- PC-200 PDF filling is a draft-only proof of concept.
- No DOCX generation package yet.
- No email, Microsoft 365, SharePoint, or database integration.
- No legal advice or automated legal conclusions.

## Public GitHub Repo Guidance

This repository may be public. Keep it safe to share by committing only prototype code, fake seed data, and non-confidential documentation.

Never commit:

- `.env`, `.env.local`, or production environment files
- API keys or secrets
- Client files or database exports
- Court filings, tax documents, death certificates, SSNs, account numbers, or confidential estate information

Future secrets should live in `.env.local` during local development and in an approved secret manager or deployment platform for production.

## Future Roadmap

### Phase 3

- Secure database
- Authentication
- Role-based permissions
- Audit logs
- SharePoint/OneDrive integration
- Outlook email draft integration
- Real template governance

### Phase 4

- Official PDF form filling, if approved
- Client portal
- Secure uploads
- E-signature workflow
- Attorney approval queues
- Production deployment
- AI-assisted draft emails and summaries after security and approval workflows exist

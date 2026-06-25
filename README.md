# EstateHornet

EstateHornet is a Connecticut estate administration workflow prototype for tracking matters, deadlines, tasks, assets, interested parties, document checklists, and risk flags.

**Tagline:** A Connecticut estate administration command center for deadlines, documents, clients, and matter control.

## Current Phase

Phase 2 local prototype using React, Vite, TypeScript, localStorage, and obviously fake seed data. There is no backend, authentication, client portal, document upload, or production data security layer yet.

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
- No production-grade document automation or official form filling.
- No official court-form PDF filling.
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

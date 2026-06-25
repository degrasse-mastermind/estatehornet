# EstateHornet

EstateHornet is a Connecticut estate administration workflow prototype for tracking matters, deadlines, tasks, assets, interested parties, document checklists, and risk flags.

**Tagline:** A Connecticut estate administration command center for deadlines, documents, clients, and matter control.

## Current Phase

Phase 1 local prototype using React, Vite, TypeScript, localStorage, and obviously fake seed data. There is no backend, authentication, client portal, document upload, or production data security layer yet.

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

## Current Limitations

- Uses browser localStorage only.
- No authentication or role-based permissions.
- No audit log.
- No encrypted file storage.
- No real probate court database.
- No document generation or form filling.
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

- Document generation engine
- PDF form filling
- DOCX template generation
- Client portal
- Secure client document uploads
- Email automation
- Outlook/Microsoft 365 integration
- SharePoint/OneDrive integration
- Supabase/Postgres database adapter
- Secure file storage
- Audit log
- Role-based permissions
- Attorney approval workflow
- AI-assisted draft emails and summaries

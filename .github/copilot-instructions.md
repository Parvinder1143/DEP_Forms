- [x] Verify that the copilot-instructions.md file in the .github directory is created.
  Summary: Created and maintained in `.github/copilot-instructions.md`.

- [x] Clarify Project Requirements
  Summary: Confirmed Next.js + Prisma + Supabase Postgres environment setup.

- [x] Scaffold the Project
  Summary: Bootstrapped Next.js (TypeScript, App Router, Tailwind, ESLint) in the current root.

- [x] Customize the Project
  Summary: Added Prisma scripts, schema, env template, Prisma client singleton, and setup-focused homepage.

- [x] Install Required Extensions
  Summary: No extensions required by setup info.

- [x] Compile the Project
  Summary: Installed dependencies, ran lint, generated Prisma client, and built successfully.

- [x] Create and Run Task
  Summary: Skipped; existing npm scripts (`dev`, `build`, `start`) are sufficient.

- [x] Launch the Project
  Summary: Skipped launch/debug prompt in automation; project is ready to run via `npm run dev`.

- [x] Ensure Documentation is Complete
  Summary: Updated README and cleaned this file by removing HTML comments.

## Stakeholder Dashboard and Form Standards (Must Follow for Future Work)

Use these standards for every new form workflow and every stakeholder dashboard added in this project:

1. Abstraction first for list UIs
- Reuse a shared table component pattern (Excel-like grid) instead of duplicating table markup per stakeholder.
- Keep stakeholder pages thin: data mapping + role/stage wiring only.

2. Excel-like stakeholder queue format
- Show two tabs/sections: Pending and Completed.
- Display only 2-3 key fields per request in queue rows.
- Always include a View Full Form action.

3. Bulk processing controls
- Provide Select per row and Select All (for pending rows).
- Require Approver Name and a common Bulk Remark.
- Provide both bulk actions: Approve All Selected and Reject All Selected.
- Bulk actions must be stage-safe and role-checked on the server.

4. Role and stage correctness
- Stakeholders only process requests of their configured stage.
- Completed/rejected/approved requests must never appear actionable.
- Keep all authorization checks server-side in actions.

5. Data and status consistency
- Maintain explicit status helpers for text and badge color.
- Add rejected-state handling where workflow supports rejection.
- Revalidate affected stakeholder and applicant pages after every action.

6. Performance and maintainability
- Fetch only required columns for queue display.
- Keep detail pages for full data; queue pages should stay lightweight.
- Avoid introducing per-page one-off components when a shared abstraction can be reused.

7. UX baseline
- Queue pages should support fast review operations from one screen.
- Bulk operation errors should be clear and actionable.
- Completed tab should be read-only (no selection-based actions).

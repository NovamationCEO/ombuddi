# `docs/` — Working context for the Ombuddi project

Files here are the assistant's working notes. They're meant to survive between sessions so we don't relearn the same ground each time.

- **`CONTEXT.md`** — what Ombuddi is, current state of the app, security model, file map, open product questions. Read this first.
- **`DATA_MODEL.md`** — tables, columns, relationships, multi-tenancy gaps. Reverse-engineered from `service/src/*_views.py`; no DDL file exists yet.
- **`LESSONS.md`** — patterns, gotchas, known bugs, dev workflow notes. Append as we learn.
- **`ROADMAP.md`** — phased plan from current state to an IOA-submittable v1.

Keep these short and editable. When something stops being true, fix it in place rather than appending a contradiction.

# Seed data

Reference drug catalogue for the `drugs` table — 147 rows, split across three
files purely because the whole dump is ~220KB and too large to paste into the
Supabase SQL editor in one go.

Apply in order:

```
seed_001.sql
seed_002.sql
seed_003.sql
```

Every statement uses `ON CONFLICT (id) DO UPDATE`, so re-running them is safe
and will refresh existing rows rather than duplicate them.

A single-file copy of exactly the same rows used to sit at
`supabase/seed_from_current_project.sql`. It was removed: two copies of the
same seed data can only drift apart. If you regenerate the dump, re-split it
here rather than keeping a second version alongside.

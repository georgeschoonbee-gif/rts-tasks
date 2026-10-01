# RTS Tasks

RTS Tasks is a mobile-first company task-management app for workers and management.

## MVP workflow

- Workers log in on their phones.
- Workers see only tasks assigned to them plus tasks they assigned.
- A task moves through `Assigned -> In Progress -> Awaiting Approval -> Closed`.
- The assigner can return a completed task for more work.
- Managers and admins have an All Tasks dashboard for their company.
- Supabase RLS enforces visibility at database level.
- In-app notifications are generated for new assignments, completion, returns and closure.

## Stack

- Next.js 15 / React 19
- Supabase Auth + PostgreSQL + RLS
- Vercel deployment
- Mobile-first PWA shell

## Setup

1. Create a new Supabase project.
2. Run `supabase/migrations/001_initial.sql` in the SQL editor or through your migration workflow.
3. Create a company row:

```sql
insert into public.companies(name) values ('ABA Boerdery') returning id;
```

4. Create users in Supabase Auth. For each Auth user, add a profile using the company ID:

```sql
insert into public.profiles(id, company_id, full_name, role)
values ('AUTH-USER-UUID', 'COMPANY-UUID', 'Worker Name', 'worker');
```

Use `manager` or `admin` for management users.

5. Add departments as needed:

```sql
insert into public.departments(company_id, name)
values
('COMPANY-UUID', 'Feedlot'),
('COMPANY-UUID', 'Feedmill'),
('COMPANY-UUID', 'Workshop');
```

6. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key.
7. Run:

```bash
npm install
npm run build
npm run dev
```

## Security notes

- Do not put a Supabase secret/service-role key in `NEXT_PUBLIC_*` variables.
- Task updates are performed through validated RPC functions. Direct task UPDATE is not granted to ordinary authenticated clients.
- RLS limits task reads to the assignee, assigner, or company management.
- New Supabase projects require explicit Data API grants; these are included in the migration.

## Next build pass

- Management user creation/invitations
- Editable departments
- Task comments and task history UI
- Photo/attachment upload via Supabase Storage
- Browser push notifications / installed-PWA notifications
- Recurring tasks
- Reports and worker/task filters

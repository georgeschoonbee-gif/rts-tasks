-- RTS Tasks initial schema
-- Designed for Supabase Auth + Data API with explicit grants and RLS.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.user_role as enum ('worker', 'manager', 'admin');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('assigned', 'in_progress', 'awaiting_approval', 'returned', 'closed');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'worker',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_company_idx on public.profiles(company_id);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, name)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text,
  assigned_to uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  department_id uuid references public.departments(id) on delete set null,
  location text,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'assigned',
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  completion_note text,
  return_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_company_idx on public.tasks(company_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to, status);
create index tasks_assigned_by_idx on public.tasks(assigned_by, status);
create index tasks_due_at_idx on public.tasks(due_at) where status <> 'closed';

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create index task_history_task_idx on public.task_history(task_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- Current-user helpers. Kept in a non-exposed schema, auth.uid() is always used internally.
create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id from public.profiles p where p.id = (select auth.uid()) and p.active = true
$$;

create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.active = true
$$;

revoke all on function private.current_company_id() from public, anon;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_role() to authenticated;

-- Automatically derive company_id from the authenticated assigner.
create or replace function private.prepare_task_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.company_id := private.current_company_id();
  new.assigned_by := auth.uid();
  new.status := 'assigned';
  return new;
end;
$$;

create trigger tasks_prepare_insert
before insert on public.tasks
for each row execute function private.prepare_task_insert();

-- Audit important lifecycle changes.
create or replace function private.audit_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.task_history(task_id, actor_id, action)
    values (new.id, actor, 'created');
  elsif new.status is distinct from old.status then
    insert into public.task_history(task_id, actor_id, action, note)
    values (
      new.id,
      actor,
      new.status::text,
      case when new.status = 'returned' then new.return_note
           when new.status = 'awaiting_approval' then new.completion_note
           else null end
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_task_change() from public, anon, authenticated;

create trigger tasks_audit
  after insert or update on public.tasks
  for each row execute function private.audit_task_change();

-- In-app notifications.
create or replace function private.notify_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, task_id, title, message)
    values (new.assigned_to, new.id, 'New task assigned', new.title);
  elsif new.status is distinct from old.status then
    select p.full_name into worker_name from public.profiles p where p.id = new.assigned_to;
    if new.status = 'awaiting_approval' then
      insert into public.notifications(user_id, task_id, title, message)
      values (new.assigned_by, new.id, 'Task completed', coalesce(worker_name, 'Worker') || ' completed: ' || new.title);
    elsif new.status = 'returned' then
      insert into public.notifications(user_id, task_id, title, message)
      values (new.assigned_to, new.id, 'Task returned', new.title || coalesce(' — ' || nullif(new.return_note,''), ''));
    elsif new.status = 'closed' then
      insert into public.notifications(user_id, task_id, title, message)
      values (new.assigned_to, new.id, 'Task closed', new.title);
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.notify_task_change() from public, anon, authenticated;

create trigger tasks_notify
  after insert or update on public.tasks
  for each row execute function private.notify_task_change();

-- RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_history enable row level security;
alter table public.notifications enable row level security;

create policy companies_read_own on public.companies
for select to authenticated
using (id = private.current_company_id());

create policy profiles_read_company on public.profiles
for select to authenticated
using (company_id = private.current_company_id());

create policy departments_read_company on public.departments
for select to authenticated
using (company_id = private.current_company_id());

create policy tasks_read_allowed on public.tasks
for select to authenticated
using (
  company_id = private.current_company_id()
  and (
    assigned_to = (select auth.uid())
    or assigned_by = (select auth.uid())
    or private.current_role() in ('manager','admin')
  )
);

create policy tasks_insert_company on public.tasks
for insert to authenticated
with check (
  assigned_by = (select auth.uid())
  and company_id = private.current_company_id()
  and exists (
    select 1 from public.profiles target
    where target.id = assigned_to
      and target.company_id = private.current_company_id()
      and target.active = true
  )
  and (
    department_id is null
    or exists (
      select 1 from public.departments d
      where d.id = department_id and d.company_id = private.current_company_id()
    )
  )
);

create policy comments_read_visible_task on public.task_comments
for select to authenticated
using (exists (select 1 from public.tasks t where t.id = task_id));

create policy comments_insert_visible_task on public.task_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.tasks t where t.id = task_id)
);

create policy history_read_visible_task on public.task_history
for select to authenticated
using (exists (select 1 from public.tasks t where t.id = task_id));

create policy notifications_read_own on public.notifications
for select to authenticated
using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Explicit Data API grants (new Supabase projects do not auto-expose tables).
grant select on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant select on public.departments to authenticated;
grant select, insert on public.tasks to authenticated;
grant select, insert on public.task_comments to authenticated;
grant select on public.task_history to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

-- Secure workflow functions. Direct UPDATE on tasks is intentionally not granted.
create or replace function public.start_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t public.tasks;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  if t.company_id <> private.current_company_id() or t.assigned_to <> auth.uid() then raise exception 'Not allowed'; end if;
  if t.status not in ('assigned','returned') then raise exception 'Task cannot be started from status %', t.status; end if;
  update public.tasks set status='in_progress', started_at=coalesce(started_at,now()), updated_at=now(), return_note=null where id=p_task_id;
end;
$$;

create or replace function public.complete_task(p_task_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t public.tasks;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  if t.company_id <> private.current_company_id() or t.assigned_to <> auth.uid() then raise exception 'Not allowed'; end if;
  if t.status <> 'in_progress' then raise exception 'Only an in-progress task can be completed'; end if;
  update public.tasks set status='awaiting_approval', completed_at=now(), completion_note=nullif(trim(p_note),''), updated_at=now() where id=p_task_id;
end;
$$;

create or replace function public.close_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t public.tasks; r public.user_role;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  r := private.current_role();
  if t.company_id <> private.current_company_id() or not (t.assigned_by = auth.uid() or r in ('manager','admin')) then raise exception 'Not allowed'; end if;
  if t.status <> 'awaiting_approval' then raise exception 'Task is not awaiting approval'; end if;
  update public.tasks set status='closed', closed_at=now(), closed_by=auth.uid(), updated_at=now() where id=p_task_id;
end;
$$;

create or replace function public.return_task(p_task_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare t public.tasks; r public.user_role;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  r := private.current_role();
  if t.company_id <> private.current_company_id() or not (t.assigned_by = auth.uid() or r in ('manager','admin')) then raise exception 'Not allowed'; end if;
  if t.status <> 'awaiting_approval' then raise exception 'Task is not awaiting approval'; end if;
  update public.tasks set status='returned', return_note=nullif(trim(p_note),''), updated_at=now() where id=p_task_id;
end;
$$;

revoke all on function public.start_task(uuid) from public, anon;
revoke all on function public.complete_task(uuid,text) from public, anon;
revoke all on function public.close_task(uuid) from public, anon;
revoke all on function public.return_task(uuid,text) from public, anon;
grant execute on function public.start_task(uuid) to authenticated;
grant execute on function public.complete_task(uuid,text) to authenticated;
grant execute on function public.close_task(uuid) to authenticated;
grant execute on function public.return_task(uuid,text) to authenticated;

-- Optional helper for management dashboards; respects caller company and role.
create or replace function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.current_role() in ('manager','admin') $$;
revoke all on function public.is_management() from public, anon;
grant execute on function public.is_management() to authenticated;

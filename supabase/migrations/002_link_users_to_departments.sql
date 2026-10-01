-- Link users to departments and require task assignment within the selected department.

alter table public.profiles
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists profiles_department_idx on public.profiles(department_id);

create or replace function private.validate_profile_department()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.department_id is not null and not exists (
    select 1
    from public.departments d
    where d.id = new.department_id
      and d.company_id = new.company_id
      and d.active = true
  ) then
    raise exception 'Department must belong to the same company and be active';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate_department on public.profiles;
create trigger profiles_validate_department
before insert or update of company_id, department_id on public.profiles
for each row execute function private.validate_profile_department();

drop policy if exists tasks_insert_company on public.tasks;
create policy tasks_insert_company on public.tasks
for insert to authenticated
with check (
  assigned_by = (select auth.uid())
  and company_id = private.current_company_id()
  and department_id is not null
  and exists (
    select 1
    from public.departments d
    where d.id = department_id
      and d.company_id = private.current_company_id()
      and d.active = true
  )
  and exists (
    select 1
    from public.profiles target
    where target.id = assigned_to
      and target.company_id = private.current_company_id()
      and target.department_id = department_id
      and target.active = true
  )
);

create index if not exists tasks_department_idx on public.tasks(department_id);

-- Go East Mechanics authorization setup for Supabase
-- Run this in Supabase SQL Editor after confirming your existing table names/columns.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('developer', 'upper_admin', 'receptionist', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() in ('developer', 'upper_admin', 'receptionist');
$$;

create or replace function public.has_full_staff_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() in ('developer', 'upper_admin');
$$;

alter table public.profiles enable row level security;
alter table public.service_requests enable row level security;

-- Profiles
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Developer can read all profiles"
on public.profiles for select
to authenticated
using (public.current_role() = 'developer');

create policy "Developer can manage profiles"
on public.profiles for all
to authenticated
using (public.current_role() = 'developer')
with check (public.current_role() = 'developer');

-- Service requests
create policy "Anyone can create service requests"
on public.service_requests for insert
to anon, authenticated
with check (true);

create policy "Staff can read all service requests"
on public.service_requests for select
to authenticated
using (public.is_staff());

create policy "Customers can read their own service requests"
on public.service_requests for select
to authenticated
using (email = auth.jwt()->>'email');

create policy "Developer and upper admin can update service requests"
on public.service_requests for update
to authenticated
using (public.has_full_staff_access())
with check (public.has_full_staff_access());

create policy "Receptionist can acknowledge service requests"
on public.service_requests for update
to authenticated
using (public.current_role() = 'receptionist')
with check (public.current_role() = 'receptionist' and status = 'acknowledged');

-- Recommended: enable these only if the tables exist.
-- alter table public.invoices enable row level security;
-- alter table public.payments enable row level security;
-- create policy "Full staff can manage invoices" on public.invoices for all to authenticated using (public.has_full_staff_access()) with check (public.has_full_staff_access());
-- create policy "Customers can read own invoices" on public.invoices for select to authenticated using (customer_email = auth.jwt()->>'email');
-- create policy "Full staff can manage payments" on public.payments for all to authenticated using (public.has_full_staff_access()) with check (public.has_full_staff_access());
-- create policy "Customers can read own payments" on public.payments for select to authenticated using (invoice_id in (select id from public.invoices where customer_email = auth.jwt()->>'email'));

-- Create the first developer manually. Replace this email with your developer/admin email.
-- update public.profiles set role = 'developer' where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

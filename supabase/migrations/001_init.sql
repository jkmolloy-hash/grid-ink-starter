-- ============================================================
-- Grid & Ink Shop — foundation schema
-- Paste this whole file into Supabase > SQL Editor > Run.
-- Safe to run once on a fresh project.
-- ============================================================

-- ---------- customer profiles (auto-created on signup) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "own profile read"  on public.profiles
  for select using (auth.uid() = id);
create policy "own profile write" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','in_production','shipped','cancelled')),
  product_key text,
  product_name text not null,
  size_label text not null,
  price_cents integer not null check (price_cents > 0),
  shipping_cents integer not null default 0,
  ship_method text,
  athlete_name text,
  jersey_number text,
  city_name text,
  notes text,
  stripe_session_id text,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
alter table public.orders enable row level security;

create policy "own orders read"   on public.orders
  for select using (auth.uid() = user_id);
create policy "own orders insert" on public.orders
  for insert with check (auth.uid() = user_id);
create policy "own orders update" on public.orders
  for update using (auth.uid() = user_id);

-- ---------- images attached to orders ----------
create table if not exists public.order_images (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'source',
  created_at timestamptz not null default now()
);
alter table public.order_images enable row level security;

create policy "own order images read" on public.order_images
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()));
create policy "own order images insert" on public.order_images
  for insert with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()));

-- ---------- private photo storage ----------
insert into storage.buckets (id, name, public)
values ('customer-photos', 'customer-photos', false)
on conflict (id) do nothing;

create policy "own photos read" on storage.objects
  for select using (
    bucket_id = 'customer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos upload" on storage.objects
  for insert with check (
    bucket_id = 'customer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- hardening (applied in production) ----------
-- The signup trigger runs internally; nobody may call it over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create index if not exists order_images_order_idx
  on public.order_images(order_id);

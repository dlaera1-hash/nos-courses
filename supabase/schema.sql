-- Nos courses : schéma Supabase
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis Run.
-- Remplace les deux adresses e-mail de la section 1 avant de lancer.

-- 1. Qui a le droit d'utiliser la liste (vous deux, rien d'autre)
create table if not exists public.members (
  email text primary key
);

insert into public.members (email) values
  ('ton.email@exemple.fr'),
  ('email.de.ta.compagne@exemple.fr')
on conflict do nothing;

-- 2. Les produits (un produit = une ligne, qu'il soit sur la liste ou non)
create table if not exists public.items (
  id           text primary key,            -- identifiant lisible, ex. "pate-a-tartiner"
  name         text not null,
  rayon        text not null default 'autre',
  on_list      boolean not null default false,
  in_cart      boolean not null default false,
  qty          integer,
  purchases    bigint[] not null default '{}', -- dates d'achat (millisecondes), 12 dernières
  snooze_until bigint,
  added_at     bigint,
  updated_at   bigint
);

-- 3. Règles d'accès : seuls les membres lisent et écrivent
alter table public.members enable row level security;
alter table public.items   enable row level security;
-- Aucune règle sur members : la table n'est lisible par personne depuis l'appli.

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where lower(m.email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;

drop policy if exists "membres lisent"    on public.items;
drop policy if exists "membres ajoutent"  on public.items;
drop policy if exists "membres modifient" on public.items;
drop policy if exists "membres suppriment" on public.items;

create policy "membres lisent"     on public.items for select to authenticated using (public.is_member());
create policy "membres ajoutent"   on public.items for insert to authenticated with check (public.is_member());
create policy "membres modifient"  on public.items for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "membres suppriment" on public.items for delete to authenticated using (public.is_member());

-- 4. Mise à jour en direct entre vos deux téléphones
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;

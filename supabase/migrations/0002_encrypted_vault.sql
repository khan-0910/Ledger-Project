-- ============================================================
-- Ledger — end-to-end encrypted storage + account deletion
-- Run once in the Supabase SQL editor, after 0001_init.sql.
--
-- The app encrypts all money data in the browser before saving.
-- The server (and the project owner) only ever see ciphertext.
-- ============================================================

-- One encrypted blob per user: the whole ledger (profile, txns, budgets, goals...)
create table if not exists public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  iv text not null,
  ciphertext text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- The user's data key, wrapped twice: by their password and by their recovery code.
-- Neither secret is ever sent here, so these rows are useless without them.
create table if not exists public.user_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pw_salt text not null,
  pw_iv text not null,
  pw_wrapped text not null,
  rc_salt text not null,
  rc_iv text not null,
  rc_wrapped text not null,
  iterations integer not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;
alter table public.user_keys enable row level security;

drop policy if exists "vaults: own row" on public.vaults;
create policy "vaults: own row"
  on public.vaults for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_keys: own row" on public.user_keys;
create policy "user_keys: own row"
  on public.user_keys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stop copying the signup name into plain-text profiles; the name lives in the vault now.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, '', '')
  on conflict (id) do nothing;

  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Let a signed-in user delete their own account. Every table cascades from auth.users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

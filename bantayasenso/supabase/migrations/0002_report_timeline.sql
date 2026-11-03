-- 1. Add author_name to reports and expose created_by for badge aggregation
alter table public.reports
  add column if not exists author_name text check (author_name is null or char_length(author_name) <= 80);

grant select (created_by, author_name) on public.reports to anon, authenticated;
grant insert (author_name) on public.reports to authenticated;

-- 2. Likes table (1 like per user per report)
create table if not exists public.report_likes (
  report_id uuid not null references public.reports on delete cascade,
  user_id uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

alter table public.report_likes enable row level security;
grant select (report_id, user_id, created_at) on public.report_likes to anon, authenticated;
grant insert (report_id) on public.report_likes to authenticated;
grant delete on public.report_likes to authenticated;

drop policy if exists "report_likes_read" on public.report_likes;
create policy "report_likes_read" on public.report_likes for select using (true);

drop policy if exists "report_likes_insert" on public.report_likes;
create policy "report_likes_insert" on public.report_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "report_likes_delete" on public.report_likes;
create policy "report_likes_delete" on public.report_likes for delete to authenticated
  using (user_id = auth.uid());

-- 3. View with per-report likes and per-author total likes for badges
create or replace view public.report_timeline
with (security_invoker = true) as
select
  r.id,
  r.project_id,
  r.note,
  r.photo_path,
  r.status,
  r.admin_response,
  r.created_at,
  r.created_by,
  coalesce(nullif(trim(r.author_name), ''), 'Citizen') as author_name,
  coalesce(l.likes, 0) as likes,
  coalesce(u.author_total_likes, 0) as author_total_likes
from public.reports r
left join (
  select report_id, count(*) as likes
  from public.report_likes
  group by report_id
) l on l.report_id = r.id
left join (
  select r2.created_by, count(rl.user_id) as author_total_likes
  from public.reports r2
  join public.report_likes rl on rl.report_id = r2.id
  group by r2.created_by
) u on u.created_by = r.created_by;

grant select on public.report_timeline to anon, authenticated;

-- 4. Remove hazard override from project_color
create or replace function public.project_color(
  p_source text,
  p_progress numeric,
  p_dpwh_status text,
  p_target_date date,
  p_open_hazards bigint,
  p_today date default current_date
) returns text language sql immutable as $$
  select case
    when p_source = 'citizen' then 'gray'
    when coalesce(p_progress, 0) >= 100 or coalesce(p_dpwh_status, '') ilike 'Completed%' then 'green'
    when p_target_date is null then 'gray'
    when p_today > p_target_date then 'red'
    when p_target_date - p_today <= 30 then 'yellow'
    else 'green'
  end;
$$;


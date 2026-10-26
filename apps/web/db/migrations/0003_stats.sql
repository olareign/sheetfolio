-- Phase 3: durable copies of the view and download counters. Redis keeps the live counters (they are written on every
-- public visit and must stay fast); a daily job copies their totals here, so history outlives Redis's 90-day expiry and
-- any loss of Redis. Plain DDL only: the runner splits on a semicolon at the end of a line (see lib/db/migrate.ts).

create table stats_daily (
  slug   text not null,
  day    date not null,
  views  integer not null,
  primary key (slug, day),
  constraint stats_daily_views_nonneg check (views >= 0)
);

create table stats_projects (
  slug        text not null,
  project_id  text not null,
  views       integer not null,
  primary key (slug, project_id),
  constraint stats_projects_views_nonneg check (views >= 0)
);

create table stats_cv (
  slug       text primary key,
  downloads  integer not null,
  constraint stats_cv_downloads_nonneg check (downloads >= 0)
);

-- Phase 2: the pages themselves. One row per page address, holding the draft and the published copy as JSON.
-- Plain DDL only: the runner splits on a semicolon at the end of a line (see lib/db/migrate.ts).

create table sites (
  slug               text primary key,
  draft              jsonb not null,
  published          jsonb,
  draft_updated_at   timestamptz not null,
  published_at       timestamptz,
  first_published_at timestamptz,
  constraint sites_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint sites_draft_is_object check (jsonb_typeof(draft) = 'object'),
  constraint sites_published_is_object check (published is null or jsonb_typeof(published) = 'object'),
  constraint sites_published_dates check ((published is null) = (published_at is null))
);

-- Newest published pages first: the Featured list and the admin overview read this way.
create index sites_published_newest on sites (published_at desc) where published is not null;

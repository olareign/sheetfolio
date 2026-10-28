-- Phase 5: tailored CV versions. Each person keeps up to three, one per slot, so the limit holds even when two saves
-- arrive at the same moment. A version is only wording and ordering (an overlay on the page, by id): the page's own
-- facts are never copied here. Plain DDL only: the runner splits on a semicolon at the end of a line.

create table tailored_cvs (
  id          text primary key,
  slug        text not null,
  slot        smallint not null,
  name        text not null,
  job_title   text not null default '',
  job_company text not null default '',
  job_source  text not null default '',
  overlay     jsonb not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  constraint tailored_cvs_slot_key unique (slug, slot),
  constraint tailored_cvs_slot_range check (slot between 1 and 3),
  constraint tailored_cvs_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tailored_cvs_overlay_is_object check (jsonb_typeof(overlay) = 'object')
);

-- One step of undo for "use this version on my page": what the page said just before it was applied.
create table tailored_undo (
  slug      text primary key,
  label     text not null,
  snapshot  jsonb not null,
  taken_at  timestamptz not null,
  constraint tailored_undo_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tailored_undo_snapshot_is_object check (jsonb_typeof(snapshot) = 'object')
);

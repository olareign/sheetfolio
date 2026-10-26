-- Phase 1: who people are, how they sign in, and the enquiries sent to them.
-- Plain DDL only: the runner splits on a semicolon at the end of a line (see lib/db/migrate.ts).

create table users (
  id          text primary key,
  email       text not null,
  slug        text not null,
  role        text not null,
  name        text not null,
  created_at  timestamptz not null,
  constraint users_email_key unique (email),
  constraint users_slug_key unique (slug),
  constraint users_email_lower check (email = lower(email)),
  constraint users_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint users_role_valid check (role in ('engineer', 'admin'))
);

-- Password sign-in. `username` is optional, unique and lower case, so a person can sign in with it or with their email.
create table credentials (
  email          text primary key,
  username       text,
  password_hash  text not null,
  updated_at     timestamptz not null,
  constraint credentials_username_key unique (username),
  constraint credentials_email_lower check (email = lower(email)),
  constraint credentials_username_lower check (username is null or username = lower(username))
);

-- Bumped when a password changes or is reset: every sign-in stamped with an older number stops working.
create table session_epochs (
  email  text primary key,
  epoch  integer not null default 0,
  constraint session_epochs_email_lower check (email = lower(email))
);

-- Enquiries sent from a public page. Keyed by the page's address; the page itself moves to Postgres in a later phase.
create table leads (
  id          text primary key,
  slug        text not null,
  name        text not null,
  email       text not null,
  company     text,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null
);

create index leads_slug_newest on leads (slug, created_at desc, id desc);

create index leads_slug_unread on leads (slug) where not read;

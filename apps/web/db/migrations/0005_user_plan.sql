-- Which plan an account is on. Everyone starts on 'free'; there is no billing yet, so an account is moved to 'pro' by
-- hand (update users set plan = 'pro' where email = '...'). Pro accounts have their CV tailored by Claude.
-- Plain DDL only: the runner splits on a semicolon at the end of a line (see lib/db/migrate.ts).

alter table users add column plan text not null default 'free';

alter table users add constraint users_plan_valid check (plan in ('free', 'pro'));

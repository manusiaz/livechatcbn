-- Skema data live chat Talita. Ditulis hanya oleh API server (service role).
-- RLS aktif tanpa policy: anon/authenticated tidak bisa baca/tulis langsung.

create table public.talita_sessions (
  id            text primary key,
  visitor_id    text not null,
  variant       text not null,
  page_url      text,
  page_path     text,
  page_title    text,
  referrer      text,
  utm           jsonb not null default '{}'::jsonb,
  locale        text,
  timezone      text,
  screen        text,
  user_agent    text,
  metadata      jsonb not null default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index talita_sessions_visitor_idx on public.talita_sessions (visitor_id);
create index talita_sessions_started_idx on public.talita_sessions (started_at desc);

create table public.talita_leads (
  id                    text primary key,
  session_id            text not null references public.talita_sessions (id) on delete cascade,
  visitor_id            text,
  variant               text not null,
  source                text not null check (source in ('recommendation', 'chat_form', 'chat_inline')),
  name                  text not null,
  email                 text not null,
  company               text not null default '',
  phone                 text not null,
  industry              text,
  need                  text,
  ai_stage              text,
  selected_services     text[] not null default '{}',
  recommended_services  text[] not null default '{}',
  consent               jsonb not null default '{}'::jsonb,
  page_url              text,
  submitted_at          timestamptz not null default now(),
  created_at            timestamptz not null default now()
);
create index talita_leads_session_idx on public.talita_leads (session_id);
create index talita_leads_created_idx on public.talita_leads (created_at desc);
create index talita_leads_email_idx on public.talita_leads (lower(email));

create table public.talita_messages (
  id          bigint generated always as identity primary key,
  session_id  text not null references public.talita_sessions (id) on delete cascade,
  message_id  text,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  variant     text,
  lead_id     text references public.talita_leads (id) on delete set null,
  context     jsonb,
  model       text,
  latency_ms  integer,
  error       text,
  created_at  timestamptz not null default now()
);
create index talita_messages_session_idx on public.talita_messages (session_id, created_at);
create index talita_messages_lead_idx on public.talita_messages (lead_id);

create table public.talita_events (
  id          bigint generated always as identity primary key,
  session_id  text not null references public.talita_sessions (id) on delete cascade,
  visitor_id  text,
  variant     text,
  type        text not null,
  data        jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index talita_events_session_idx on public.talita_events (session_id);
create index talita_events_type_at_idx on public.talita_events (type, at desc);

alter table public.talita_sessions enable row level security;
alter table public.talita_leads    enable row level security;
alter table public.talita_messages enable row level security;
alter table public.talita_events   enable row level security;

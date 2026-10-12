create table public.leads (
  id         text primary key check (id ~ '^lead_[0-9]{4}$'),
  full_name  text not null,
  company    text not null,
  email      text not null,
  source     text not null check (source in ('website', 'google-ads', 'facebook-ads', 'linkedin', 'referral', 'webinar')),
  status     text not null check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget     integer check (budget is null or budget >= 0),
  message    text not null,
  created_at timestamptz not null
);

alter table public.leads enable row level security;

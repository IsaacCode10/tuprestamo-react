create or replace view public.borrower_mora_view as
select
  b.id,
  b.opportunity_id,
  b.borrower_id,
  b.expected_amount,
  b.status,
  b.due_date,
  b.paid_at,
  b.paid_amount,
  b.receipt_url,
  b.created_at,
  b.updated_at,
  3::int as grace_days,
  case
    when b.due_date is null then null
    when b.status = 'paid' then greatest(0, (coalesce(date(b.paid_at), current_date) - b.due_date - 3))
    else greatest(0, (current_date - b.due_date - 3))
  end as days_past_due,
  case
    when b.due_date is null then false
    when b.status = 'paid' then (date(b.paid_at) > b.due_date + 3)
    else (current_date > b.due_date + 3)
  end as is_overdue,
  case
    when b.status = 'paid'
      and b.due_date is not null
      and b.paid_at is not null
      and date(b.paid_at) > b.due_date + 3
      then true
    else false
  end as paid_late
from borrower_payment_intents b;

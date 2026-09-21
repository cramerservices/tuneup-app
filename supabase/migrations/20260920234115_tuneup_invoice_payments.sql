-- Billing decisions and links are accessible only through the authenticated staff Edge Function.
create table if not exists public.tuneup_billing (
  inspection_id uuid primary key references public.inspections(id),
  invoice_id uuid unique references public.crm_invoices(id),
  draft jsonb not null default '{"choices":[]}'::jsonb,
  recipient_email text,
  snapshot jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  email_id text,
  email_sent_at timestamptz
);
alter table public.tuneup_billing enable row level security;
revoke all on public.tuneup_billing from public, anon, authenticated;
grant all on public.tuneup_billing to service_role;

create or replace function public.save_tuneup_billing(
 p_inspection_id uuid, p_draft jsonb, p_line_items jsonb, p_actor uuid, p_create boolean default false
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_inspection public.inspections%rowtype;
 v_billing public.tuneup_billing%rowtype;
 v_customer_id uuid;
 v_invoice_id uuid;
 v_total numeric;
begin
 -- Serializes save/create requests for this inspection, including first creation.
 select * into v_inspection from public.inspections where id=p_inspection_id for update;
 if not found then raise exception 'Inspection not found'; end if;
 select * into v_billing from public.tuneup_billing where inspection_id=p_inspection_id;
 if v_billing.invoice_id is not null then return to_jsonb(v_billing); end if;
 if jsonb_typeof(p_draft->'choices') is distinct from 'array' then raise exception 'Invalid invoice selections'; end if;
 insert into public.tuneup_billing(inspection_id,draft,updated_by)
 values(p_inspection_id,p_draft,p_actor)
 on conflict(inspection_id) do update set draft=excluded.draft, updated_by=excluded.updated_by,updated_at=now();
 if p_create then
   if nullif(trim(v_inspection.customer_email),'') is null then raise exception 'Customer email is required on the report'; end if;
   if jsonb_typeof(p_line_items) is distinct from 'array' or jsonb_array_length(p_line_items)=0 then raise exception 'Approve at least one item'; end if;
   if exists(select 1 from jsonb_array_elements(p_line_items) i where (i->>'total_cost')::numeric<0 or nullif(trim(i->>'description'),'') is null) then raise exception 'Invalid invoice items'; end if;
   perform pg_advisory_xact_lock(hashtextextended(lower(trim(v_inspection.customer_email)),0));
   select id into v_customer_id from public.customers where lower(trim(email))=lower(trim(v_inspection.customer_email)) order by created_at limit 1;
   if v_customer_id is null then
     insert into public.customers(name,full_name,email,address,service_address)
       values(v_inspection.customer_name,v_inspection.customer_name,lower(trim(v_inspection.customer_email)),v_inspection.address,v_inspection.address)
       returning id into v_customer_id;
   end if;
   select sum(round((item->>'total_cost')::numeric,2)) into v_total from jsonb_array_elements(p_line_items) item;
   insert into public.crm_invoices(invoice_number,customer_id,invoice_date,due_date,work_completed_date,status,tech_name,notes,total_amount,amount_paid,amount_due)
   values('INV-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),v_customer_id,current_date,current_date+7,v_inspection.inspection_date,'draft',v_inspection.technician_name,v_inspection.notes,v_total,0,v_total)
   returning id into v_invoice_id;
   insert into public.crm_invoice_line_items(invoice_id,description,material_cost,labor_cost,total_cost,sort_order)
   select v_invoice_id,item->>'description',0,round((item->>'total_cost')::numeric,2),round((item->>'total_cost')::numeric,2),ordinality
     from jsonb_array_elements(p_line_items) with ordinality as x(item,ordinality);
   update public.tuneup_billing set invoice_id=v_invoice_id,
     recipient_email=trim(v_inspection.customer_email),snapshot=jsonb_build_object(
       'customer_name',v_inspection.customer_name,'address',v_inspection.address,
       'technician_name',v_inspection.technician_name,'inspection_date',v_inspection.inspection_date)
     where inspection_id=p_inspection_id;
 end if;
 select * into v_billing from public.tuneup_billing where inspection_id=p_inspection_id;
 return to_jsonb(v_billing);
end;
$$;
revoke all on function public.save_tuneup_billing(uuid,jsonb,jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function public.save_tuneup_billing(uuid,jsonb,jsonb,uuid,boolean) to service_role;
alter table public.tuneup_billing add column if not exists email_session_id text;

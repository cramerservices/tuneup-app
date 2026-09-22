-- Private mapping for standalone staff invoices; no inspection is created.
create table public.quick_invoice_billing (
 invoice_id uuid primary key references public.crm_invoices(id),
 request_id uuid not null unique,
 recipient_email text not null,
 snapshot jsonb not null,
 draft jsonb not null,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 email_id text, email_session_id text, email_sent_at timestamptz
);
alter table public.quick_invoice_billing enable row level security;
revoke all on public.quick_invoice_billing from public,anon,authenticated;
grant all on public.quick_invoice_billing to service_role;

create or replace function public.create_quick_invoice(p_request_id uuid,p_customer jsonb,p_draft jsonb,p_line_items jsonb,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_existing public.quick_invoice_billing%rowtype;
 v_customer uuid; v_invoice uuid; v_total numeric; v_email text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,1));
 select * into v_existing from public.quick_invoice_billing where request_id=p_request_id;
 if found then
   if v_existing.updated_by<>p_actor then raise exception 'Invoice request belongs to another staff member'; end if;
   return to_jsonb(v_existing);
 end if;
 v_email:=lower(trim(p_customer->>'email'));
 if nullif(trim(p_customer->>'name'),'') is null or nullif(v_email,'') is null then raise exception 'Customer name and email required'; end if;
 if jsonb_typeof(p_line_items) is distinct from 'array' or jsonb_array_length(p_line_items)=0 then raise exception 'Invoice needs at least one item'; end if;
 if exists(select 1 from jsonb_array_elements(p_line_items) i where (i->>'total_cost')::numeric<0 or nullif(trim(i->>'description'),'') is null) then raise exception 'Invalid items'; end if;
 select sum(round((i->>'total_cost')::numeric,2)) into v_total from jsonb_array_elements(p_line_items) i;
 if v_total<0.50 or v_total>999999.99 then raise exception 'Invoice total must be between $0.50 and $999,999.99'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_email,0));
 select id into v_customer from public.customers where lower(trim(email))=v_email order by created_at limit 1;
 if v_customer is null then
   insert into public.customers(name,full_name,email,address,service_address)
   values(trim(p_customer->>'name'),trim(p_customer->>'name'),v_email,p_customer->>'address',p_customer->>'address') returning id into v_customer;
 end if;
 insert into public.crm_invoices(invoice_number,customer_id,invoice_date,due_date,work_completed_date,status,tech_name,notes,total_amount,amount_paid,amount_due)
 values('INV-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),v_customer,current_date,current_date,(p_customer->>'serviceDate')::date,'draft',p_customer->>'technician',p_customer->>'notes',v_total,0,v_total) returning id into v_invoice;
 insert into public.crm_invoice_line_items(invoice_id,description,material_cost,labor_cost,total_cost,sort_order)
 select v_invoice,i->>'description',0,round((i->>'total_cost')::numeric,2),round((i->>'total_cost')::numeric,2),ordinality from jsonb_array_elements(p_line_items) with ordinality x(i,ordinality);
 insert into public.quick_invoice_billing(invoice_id,request_id,recipient_email,snapshot,draft,updated_by)
 values(v_invoice,p_request_id,v_email,jsonb_build_object('customer_name',trim(p_customer->>'name'),'customer_email',v_email,'address',p_customer->>'address','technician_name',p_customer->>'technician','inspection_date',p_customer->>'serviceDate','quick_invoice',true),p_draft,p_actor);
 select * into v_existing from public.quick_invoice_billing where invoice_id=v_invoice;
 return to_jsonb(v_existing);
end;
$$;
revoke all on function public.create_quick_invoice(uuid,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_quick_invoice(uuid,jsonb,jsonb,jsonb,uuid) to service_role;

-- Drop vestigial child tables.
-- Deal finance notes and attachments are now stored as jsonb columns on
-- public.deals (deals.finance_notes / deals.attachments), written by the
-- create_deal_with_inventory RPC and store.updateDeal. The old child tables
-- were left empty and unreferenced after that refactor.

drop table if exists public.deal_attachments cascade;
drop table if exists public.finance_notes cascade;

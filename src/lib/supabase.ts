import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zgzwzixmxzgsrsseqgne.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnend6aXhteHpnc3Jzc2VxZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Nzc0MTEsImV4cCI6MjA5ODI1MzQxMX0.Ovqwbl6WUO8K8upudTXoy8qecAgZSSFUfqKNQdpDTDY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


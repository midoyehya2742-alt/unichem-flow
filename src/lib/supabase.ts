import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zgzwzixmxzgsrsseqgne.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_h_VTvKErYVtKiHLbidR9cw_fAEVHY5E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

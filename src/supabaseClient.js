import { createClient } from "@supabase/supabase-js";

// Tus credenciales exactas (las que ya funcionan en tu App)
const SUPABASE_URL = "https://gruszoneusbmhkmeogvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydXN6b25ldXNibWhrbWVvZ3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODk1NDQsImV4cCI6MjA4OTg2NTU0NH0.Z_F4EIKj_sahMRNgywImTT6m5jMU1KhE6MWQ1oVLRpM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

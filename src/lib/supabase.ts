import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wgqcfxsjswfcifovvecd.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWNmeHNqc3dmY2lmb3Z2ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU4NzA0NSwiZXhwIjoyMTAwMTYzMDQ1fQ.TwkfX5rKqdYEWvf79BN_2jr9K_VznHPTDsDYDPXbI2A";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function genId(prefix = "cl"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
}
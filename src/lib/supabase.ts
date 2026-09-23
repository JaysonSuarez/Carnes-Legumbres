import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wgqcfxsjswfcifovvecd.supabase.co";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
}

// Crear el cliente bajo demanda evita que Vercel necesite el secreto durante
// la evaluación de módulos al compilar rutas API.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function genId(prefix = "cl"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
}

import { createClient } from "@supabase/supabase-js";

// A Supabase client that uses the secret SERVICE ROLE key.
//
// This key bypasses Row Level Security, so it can read/write any row. Because of
// that it must ONLY ever be used in trusted server code (route handlers, server
// actions) and NEVER in the browser. We only use it after we have already checked
// who the logged-in user is, so we can safely make the change on their behalf.
export const createSupabaseAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // We don't need this client to remember any login session.
      auth: { persistSession: false },
    }
  );
};

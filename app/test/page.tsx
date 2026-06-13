"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function TestPage() {
  const testConnection = async () => {
    console.log("BUTTON CLICKED");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();

    console.log("data:", data);
    console.log("error:", error);
  };

  return (
    <button onClick={testConnection}>
      Test Supabase
    </button>
  );
}
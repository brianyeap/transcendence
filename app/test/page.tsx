"use client";

import { supabase } from "@/srcs/lib/supabase/client";

export default function TestPage() {
  const testConnection = async () => {
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
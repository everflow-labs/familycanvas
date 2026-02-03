"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("get_shared_tree", {
        share_token_input: params.token,
      });

      if (error) setError(error.message);
      else setData(data);

      setLoading(false);
    };

    run();
  }, [params.token]);

  return (
    <div className="min-h-screen p-6">
      <div className="font-semibold">FamilyCanvas</div>

      <div className="mt-6 rounded border bg-white p-4">
        {loading ? (
          <div className="text-sm text-gray-600">Loading shared tree…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

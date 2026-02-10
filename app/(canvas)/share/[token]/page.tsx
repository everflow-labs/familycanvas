// app/(canvas)/share/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import TreeCanvas from "@/components/canvas/TreeCanvas";
import Logo from "@/components/ui/Logo";
import type { Person, Relationship } from "@/types/database";

type SharedTreeData = {
  tree_name: string;
  people: Person[];
  relationships: Relationship[];
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedTreeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      const { data: rows, error: rpcError } = await supabase.rpc("get_shared_tree", {
        share_token_input: token,
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      // RPC returns an array of rows; we expect one row
      const row = Array.isArray(rows) ? rows[0] : rows;

      if (!row) {
        setError("This share link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setData({
        tree_name: row.tree_name || "Family Tree",
        people: row.people || [],
        relationships: row.relationships || [],
      });
      setLoading(false);
    };

    run();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading shared tree…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mb-2 text-lg font-semibold text-gray-900">Link not found</div>
          <p className="text-sm text-gray-500">
            {error || "This share link is invalid or has expired."}
          </p>
        </div>
        <a
          href="/"
          className="mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Create your own family tree →
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Minimal header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <Logo size="xs" />
            <span className="text-sm font-semibold text-gray-900 hidden sm:inline">
              FamilyCanvas
            </span>
          </div>

          {/* Separator + tree name */}
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600 truncate max-w-48 sm:max-w-72">
            {data.tree_name}
          </span>
        </div>

        {/* CTA */}
        <a
          href="/signup"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Create your own
        </a>
      </div>

      {/* Tree canvas - read only */}
      <div className="flex-1">
        {data.people.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">This tree is empty.</p>
          </div>
        ) : (
          <TreeCanvas
            people={data.people}
            relationships={data.relationships}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

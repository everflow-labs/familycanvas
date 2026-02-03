"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

import { getOrCreatePrimaryTree } from "@/lib/api/trees";
import { listPeople } from "@/lib/api/people";
import { listRelationships } from "@/lib/api/relationships";

type TreeRow = {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
};

export default function CanvasPage() {
  const { user, signOut } = useAuth();

  const [tree, setTree] = useState<TreeRow | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  useEffect(() => {
    const run = async () => {
      if (!userId) return;

      setLoadingData(true);
      setError(null);

      try {
        const t = await getOrCreatePrimaryTree(userId);
        setTree(t);

        const [p, r] = await Promise.all([listPeople(t.id), listRelationships(t.id)]);
        setPeople(p);
        setRelationships(r);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load tree data");
      } finally {
        setLoadingData(false);
      }
    };

    run();
  }, [userId]);

  const summary = useMemo(() => {
    return {
      peopleCount: people.length,
      relationshipCount: relationships.length,
    };
  }, [people.length, relationships.length]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-6">
        <div className="flex justify-between items-center">
          <div className="font-semibold">FamilyCanvas</div>
          <button className="text-sm underline" onClick={() => signOut()}>
            Log out
          </button>
        </div>

        <div className="mt-6 rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Signed in as</div>
          <div className="mt-1 font-medium">{user?.email}</div>
        </div>

        <div className="mt-6 rounded border bg-white p-4">
          <div className="font-medium">Canvas</div>

          {loadingData ? (
            <div className="mt-3 text-sm text-gray-600">Loading your family…</div>
          ) : error ? (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          ) : (
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              <div>
                <span className="text-gray-600">Tree:</span>{" "}
                <span className="font-medium">{tree?.name}</span>
              </div>
              <div>
                <span className="text-gray-600">People:</span> {summary.peopleCount}
              </div>
              <div>
                <span className="text-gray-600">Relationships:</span> {summary.relationshipCount}
              </div>

              <div className="mt-4 rounded border p-3 text-gray-600">
                Next step: render this data in React Flow.
              </div>

              {/* Temporary: show raw lists so you know the queries work */}
              <details className="mt-3">
                <summary className="cursor-pointer">Debug: raw data</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify({ people, relationships }, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

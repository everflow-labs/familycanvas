"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/canvas");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="font-semibold tracking-tight">FamilyCanvas</div>
          <div className="space-x-4 text-sm">
            <Link className="underline" href="/login">
              Log in
            </Link>
            <Link className="underline" href="/signup">
              Sign up
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-16">
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
            Map your family in minutes
          </h1>
          <p className="mt-4 text-zinc-600 max-w-2xl text-lg leading-8">
            A modern, visual family map designed for real life—easy to build, beautiful to share.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-black text-white px-5 py-3 text-sm font-medium"
              href="/signup"
            >
              Get started
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-medium"
              href="/login"
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* Value props */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold">Fast</div>
            <div className="mt-2 text-sm text-zinc-600">
              Add 10 people in under 10 minutes—no tutorial required.
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold">Visual</div>
            <div className="mt-2 text-sm text-zinc-600">
              A clean, modern canvas that makes relationships easy to understand at a glance.
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold">Culturally flexible</div>
            <div className="mt-2 text-sm text-zinc-600">
              Built for real families—diaspora, blended, chosen family, and beyond.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-zinc-200 pt-8 text-sm text-zinc-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>© {new Date().getFullYear()} FamilyCanvas</div>
          <div className="space-x-4">
            <Link className="underline" href="/login">
              Log in
            </Link>
            <Link className="underline" href="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database";
import { UsersClientView } from "./UsersClientView";

export const metadata = {
  title: "Gestion des Collaborateurs | SIX SIGMA ERP",
  description: "Administration centrale des employés, attribution des rôles et conformité RH.",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // 1. Verify user session & admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/dashboard");
  }

  // 2. Fetch all employees
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load profiles:", error);
  }

  return (
    <div className="space-y-6">
      <UsersClientView
        initialProfiles={(profiles as Profile[]) || []}
        currentUserId={user.id}
      />
    </div>
  );
}

import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClientView } from "./ProfileClientView";
import { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Mon Profil & Sécurité | SIX SIGMA ERP",
  description: "Gestion du profil collaborateur, contrat de travail et sécurité du mot de passe",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return <ProfileClientView currentUser={profile as Profile} userEmail={user.email || ""} />;
}

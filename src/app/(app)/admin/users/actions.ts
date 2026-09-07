"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/database";

export interface CreateEmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  sub_role?: string;
  phone?: string;
  contract_end_date?: string;
  id_expiry_date?: string;
}

const ROOT_SUPER_ADMIN_EMAIL = "elyseemudimbi@sixsigma.cd";

/**
 * Ensures caller is authenticated and holds the 'admin' role.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Authentification requise pour cette action.");
  }

  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (pError || !profile || profile.role !== "admin") {
    throw new Error("Accès refusé : Privilège réservé au Super-Administrateur.");
  }

  return { currentUserId: user.id, currentEmail: profile.email, profile };
}

/**
 * Creates a new user in Supabase Auth & public.profiles
 */
export async function createEmployeeAccount(data: CreateEmployeeInput) {
  try {
    const { currentUserId } = await requireAdmin();

    const firstName = data.first_name?.trim();
    const lastName = data.last_name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password?.trim();

    if (!firstName || !lastName || !email || !password || !data.role) {
      return { success: false, error: "Tous les champs obligatoires doivent être renseignés." };
    }

    if (password.length < 6) {
      return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
    }

    const adminClient = createAdminClient();

    // 1. Create Auth User via Supabase Admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: data.role,
        sub_role: data.sub_role || null,
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || "Impossible de créer le compte utilisateur dans Supabase Auth.",
      };
    }

    const newUserId = authData.user.id;

    // 2. Insert or update public.profiles with compliance dates
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      email,
      phone: data.phone?.trim() || null,
      role: data.role,
      sub_role: data.sub_role?.trim() || null,
      is_active: true,
      contract_end_date: data.contract_end_date || null,
      id_expiry_date: data.id_expiry_date || null,
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return { success: false, error: "Compte créé mais échec de configuration du profil RH." };
    }

    // 3. Centralized audit logging
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: newUserId,
      action: "CREATE_EMPLOYEE",
      new_data: {
        email,
        role: data.role,
        first_name: firstName,
        last_name: lastName,
        contract_end_date: data.contract_end_date,
        id_expiry_date: data.id_expiry_date,
      },
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true, userId: newUserId };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur inattendue lors de la création." };
  }
}

/**
 * Updates an employee's business role among the 14 roles
 */
export async function updateEmployeeRole(profileId: string, newRole: UserRole) {
  try {
    const { currentUserId } = await requireAdmin();
    const adminClient = createAdminClient();

    // Check target profile
    const { data: targetProfile, error: tError } = await adminClient
      .from("profiles")
      .select("email, role")
      .eq("id", profileId)
      .single();

    if (tError || !targetProfile) {
      return { success: false, error: "Profil introuvable." };
    }

    if (targetProfile.email === ROOT_SUPER_ADMIN_EMAIL && newRole !== "admin") {
      return {
        success: false,
        error: "Règle de sécurité : Le rôle du Super-Administrateur racine ne peut pas être modifié.",
      };
    }

    const oldRole = targetProfile.role;

    // 1. Update public.profiles
    const { error: pError } = await adminClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profileId);

    if (pError) {
      return { success: false, error: pError.message };
    }

    // 2. Update auth.users metadata
    await adminClient.auth.admin.updateUserById(profileId, {
      user_metadata: { role: newRole },
    });

    // 3. Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "UPDATE_USER_ROLE",
      old_data: { role: oldRole },
      new_data: { role: newRole },
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors du changement de rôle." };
  }
}

/**
 * Toggles an employee's status (is_active).
 * If deactivated, subsequent requests trigger instant session destruction in middleware.
 */
export async function toggleEmployeeStatus(profileId: string, isActive: boolean) {
  try {
    const { currentUserId } = await requireAdmin();
    const adminClient = createAdminClient();

    // Check target profile
    const { data: targetProfile, error: tError } = await adminClient
      .from("profiles")
      .select("email, is_active")
      .eq("id", profileId)
      .single();

    if (tError || !targetProfile) {
      return { success: false, error: "Profil introuvable." };
    }

    if (targetProfile.email === ROOT_SUPER_ADMIN_EMAIL && !isActive) {
      return {
        success: false,
        error: "Protection active : Impossible de désactiver le compte Super-Administrateur racine.",
      };
    }

    // 1. Update status
    const { error: pError } = await adminClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", profileId);

    if (pError) {
      return { success: false, error: pError.message };
    }

    // 2. Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "TOGGLE_USER_STATUS",
      old_data: { is_active: targetProfile.is_active },
      new_data: { is_active: isActive },
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true, is_active: isActive };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la modification du statut." };
  }
}

/**
 * Updates HR compliance dates (contract end date, ID expiry date)
 */
export async function updateEmployeeCompliance(
  profileId: string,
  contractEndDate: string | null,
  idExpiryDate: string | null
) {
  try {
    const { currentUserId } = await requireAdmin();
    const adminClient = createAdminClient();

    const { error: pError } = await adminClient
      .from("profiles")
      .update({
        contract_end_date: contractEndDate || null,
        id_expiry_date: idExpiryDate || null,
      })
      .eq("id", profileId);

    if (pError) {
      return { success: false, error: pError.message };
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "UPDATE_COMPLIANCE_DATES",
      new_data: { contract_end_date: contractEndDate, id_expiry_date: idExpiryDate },
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la mise à jour des dates." };
  }
}

/**
 * Resets an employee password directly via Supabase Admin API
 */
export async function resetEmployeePassword(profileId: string, newPassword: string) {
  try {
    const { currentUserId } = await requireAdmin();
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(profileId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "RESET_PASSWORD",
      performed_by: currentUserId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la réinitialisation." };
  }
}

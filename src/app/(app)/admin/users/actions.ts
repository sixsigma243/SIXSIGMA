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
  daily_rate?: number;
  trade_category?: string;
}

const ROOT_SUPER_ADMIN_EMAIL = "elyseemudimbi@sixsigma.cd";

/**
 * Ensures caller is authenticated and holds the 'admin' role.
 */
async function requireAdmin(customErrorMessage = "Accès refusé : Privilège réservé exclusivement au Super-Administrateur.") {
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
    throw new Error(customErrorMessage);
  }

  return { currentUserId: user.id, currentEmail: profile.email, profile };
}

/**
 * Ensures caller is authenticated and holds either 'admin', 'hr_officer', or 'company_management'.
 */
async function requireAdminOrHr() {
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

  if (pError || !profile || !["admin", "hr_officer", "company_management"].includes(profile.role)) {
    throw new Error("Accès refusé : Action réservée aux Ressources Humaines et Administrateurs.");
  }

  return { currentUserId: user.id, currentEmail: profile.email, profile };
}

/**
 * Creates a new user in Supabase Auth & public.profiles
 * Strictly restricted to Super-Administrateur ('admin').
 */
export async function createEmployeeAccount(data: CreateEmployeeInput) {
  try {
    const { currentUserId } = await requireAdmin(
      "403 Forbidden: Seul un Administrateur Système peut créer un collaborateur."
    );

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
        trade_category: data.trade_category || null,
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || "Impossible de créer le compte utilisateur dans Supabase Auth.",
      };
    }

    const newUserId = authData.user.id;

    // 2. Insert or update public.profiles with compliance dates and worker specifics
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
      daily_rate: data.daily_rate ?? (data.role === "worker" ? 0 : null),
      trade_category: data.trade_category?.trim() ?? (data.role === "worker" ? "Manœuvre" : null),
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

// Alias conforme aux spécifications
export const createUserAction = createEmployeeAccount;

/**
 * Updates an employee's business role among the 15 roles.
 * Strictly restricted to Super-Administrateur ('admin').
 */
export async function updateEmployeeRole(profileId: string, newRole: UserRole) {
  try {
    const { currentUserId } = await requireAdmin(
      "403 Forbidden: Seul un Administrateur Système peut modifier les rôles d'un collaborateur."
    );
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

// Alias conforme aux spécifications
export const updateUserRoleAction = updateEmployeeRole;

/**
 * Toggles an employee's status (is_active).
 * If deactivated, subsequent requests trigger instant session destruction in middleware.
 * Strictly restricted to Super-Administrateur ('admin').
 */
export async function toggleEmployeeStatus(profileId: string, isActive: boolean) {
  try {
    const { currentUserId } = await requireAdmin(
      "403 Forbidden: Seul un Administrateur Système peut suspendre ou réactiver un compte utilisateur."
    );
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

export interface UpdateUserData {
  role?: UserRole;
  is_active?: boolean;
  contract_end_date?: string | null;
  id_expiry_date?: string | null;
  base_salary?: number | null;
  daily_rate?: number | null;
  trade_category?: string | null;
  job_title?: string | null;
}

/**
 * Universal updateUserAction respecting SoD:
 * - If 'role' or 'is_active' is updated: strictly requires 'admin'.
 * - If caller is 'hr_officer': allows ONLY administrative fields (contract_end_date, id_expiry_date, base_salary, daily_rate, trade_category, job_title).
 */
export async function updateUserAction(userId: string, data: UpdateUserData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentification requise pour cette action." };
    }

    const { data: callerProfile, error: pError } = await supabase
      .from("profiles")
      .select("id, role, email")
      .eq("id", user.id)
      .single();

    if (pError || !callerProfile) {
      return { success: false, error: "Profil de l'opérateur introuvable." };
    }

    const adminClient = createAdminClient();

    // 1. Check target user
    const { data: targetProfile, error: tError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (tError || !targetProfile) {
      return { success: false, error: "Utilisateur cible introuvable." };
    }

    const payloadToUpdate: Record<string, any> = {};

    // 2. Check role / is_active modification
    if (data.role !== undefined || data.is_active !== undefined) {
      if (callerProfile.role !== "admin") {
        return {
          success: false,
          error: "403 Forbidden: Seul un Administrateur Système peut modifier le rôle ou suspendre/réactiver un compte.",
        };
      }

      if (data.role !== undefined) {
        if (targetProfile.email === ROOT_SUPER_ADMIN_EMAIL && data.role !== "admin") {
          return { success: false, error: "Le rôle du Super-Administrateur racine ne peut pas être modifié." };
        }
        payloadToUpdate.role = data.role;
      }

      if (data.is_active !== undefined) {
        if (targetProfile.email === ROOT_SUPER_ADMIN_EMAIL && !data.is_active) {
          return { success: false, error: "Impossible de suspendre le compte Super-Administrateur racine." };
        }
        payloadToUpdate.is_active = data.is_active;
      }
    }

    // 3. Handle HR / Administrative fields
    if (callerProfile.role === "hr_officer" || callerProfile.role === "admin" || callerProfile.role === "company_management") {
      if (data.contract_end_date !== undefined) payloadToUpdate.contract_end_date = data.contract_end_date;
      if (data.id_expiry_date !== undefined) payloadToUpdate.id_expiry_date = data.id_expiry_date;
      if (data.base_salary !== undefined) payloadToUpdate.base_salary = data.base_salary;
      if (data.daily_rate !== undefined) payloadToUpdate.daily_rate = data.daily_rate;
      if (data.trade_category !== undefined) payloadToUpdate.trade_category = data.trade_category;
      if (data.job_title !== undefined) payloadToUpdate.job_title = data.job_title;
    } else {
      return { success: false, error: "403 Forbidden: Droits insuffisants pour mettre à jour les données du collaborateur." };
    }

    if (Object.keys(payloadToUpdate).length === 0) {
      return { success: false, error: "Aucun champ valide à mettre à jour." };
    }

    // 4. Update in public.profiles
    const { error: updateError } = await adminClient
      .from("profiles")
      .update(payloadToUpdate)
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 5. Update auth user metadata if role was updated
    if (payloadToUpdate.role) {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role: payloadToUpdate.role },
      });
    }

    // 6. Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: userId,
      action: "UPDATE_USER",
      old_data: targetProfile,
      new_data: payloadToUpdate,
      performed_by: user.id,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la mise à jour." };
  }
}

/**
 * Updates HR compliance & administrative details.
 * Authorized for RH ('hr_officer'), Direction ('company_management') and Super-Admin ('admin').
 */
export async function updateEmployeeCompliance(
  profileId: string,
  contractEndDate: string | null,
  idExpiryDate: string | null,
  extra?: {
    base_salary?: number | null;
    daily_rate?: number | null;
    trade_category?: string | null;
    job_title?: string | null;
  }
) {
  try {
    const { currentUserId } = await requireAdminOrHr();
    const adminClient = createAdminClient();

    const updatePayload: Record<string, any> = {
      contract_end_date: contractEndDate || null,
      id_expiry_date: idExpiryDate || null,
    };

    if (extra?.base_salary !== undefined) updatePayload.base_salary = extra.base_salary;
    if (extra?.daily_rate !== undefined) updatePayload.daily_rate = extra.daily_rate;
    if (extra?.trade_category !== undefined) updatePayload.trade_category = extra.trade_category;
    if (extra?.job_title !== undefined) updatePayload.job_title = extra.job_title;

    const { error: pError } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileId);

    if (pError) {
      return { success: false, error: pError.message };
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "UPDATE_COMPLIANCE_DATES",
      new_data: updatePayload,
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la mise à jour des dates." };
  }
}

/**
 * Resets an employee password directly via Supabase Admin API.
 * Strictly restricted to Super-Administrateur ('admin').
 */
export async function resetEmployeePassword(profileId: string, newPassword: string) {
  try {
    const { currentUserId } = await requireAdmin(
      "403 Forbidden: Seul un Administrateur Système peut réinitialiser le mot de passe d'un collaborateur."
    );
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

// Alias conforme aux spécifications
export const resetUserPasswordAction = resetEmployeePassword;

/**
 * Deletes an employee account permanently (Auth user and profile).
 * Strictly restricted to Super-Administrateur ('admin').
 */
export async function deleteEmployeeAccount(profileId: string) {
  try {
    const { currentUserId } = await requireAdmin(
      "403 Forbidden: Seul un Administrateur Système peut supprimer définitivement un compte utilisateur."
    );
    const adminClient = createAdminClient();

    // 1. Check target profile
    const { data: targetProfile, error: tError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", profileId)
      .single();

    if (tError || !targetProfile) {
      return { success: false, error: "Profil introuvable." };
    }

    if (targetProfile.email === ROOT_SUPER_ADMIN_EMAIL) {
      return {
        success: false,
        error: "Règle de sécurité critique : Impossible de supprimer le compte Super-Administrateur racine.",
      };
    }

    if (profileId === currentUserId) {
      return {
        success: false,
        error: "Action interdite : Vous ne pouvez pas supprimer votre propre compte administrateur en cours d'utilisation.",
      };
    }

    // 2. Delete from Supabase Auth via Admin API
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(profileId);
    if (authDeleteError) {
      console.warn("Auth delete warning:", authDeleteError.message);
    }

    // 3. Delete from public.profiles explicitly
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (profileDeleteError) {
      console.warn("Profile delete warning:", profileDeleteError.message);
    }

    // 4. Centralized audit logging
    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: profileId,
      action: "DELETE_USER",
      old_data: {
        email: targetProfile.email,
        full_name: targetProfile.full_name,
        role: targetProfile.role,
      },
      new_data: {
        target: profileId,
      },
      performed_by: currentUserId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la suppression du compte." };
  }
}

// Alias conforme aux spécifications
export const deleteUserAction = deleteEmployeeAccount;


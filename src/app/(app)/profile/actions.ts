"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PasswordChangeResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action Sécurisée pour le changement de mot de passe autonome (Self-Service)
 */
export async function updatePasswordAction(
  prevState: any,
  formData: FormData
): Promise<PasswordChangeResult> {
  try {
    const supabase = await createClient();

    // 1. Vérification de la session utilisateur
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return {
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
      };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // 2. Validation des champs requis
    if (!currentPassword || !newPassword || !confirmPassword) {
      return {
        success: false,
        error: "Tous les champs (mot de passe actuel, nouveau et confirmation) sont obligatoires.",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
      };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit être différent du mot de passe actuel.",
      };
    }

    // 3. Vérification de la robustesse du mot de passe (règle de sécurité stricte)
    if (newPassword.length < 8) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins une lettre majuscule.",
      };
    }

    if (!/[a-z]/.test(newPassword)) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins une lettre minuscule.",
      };
    }

    if (!/[0-9]/.test(newPassword)) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins un chiffre.",
      };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins un caractère spécial (!@#$%...)",
      };
    }

    // 4. Vérification de l'authenticité du mot de passe actuel
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: "Le mot de passe actuel saisi est incorrect.",
      };
    }

    // 5. Mise à jour effective du mot de passe via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return {
        success: false,
        error: "Erreur lors de la mise à jour : " + updateError.message,
      };
    }

    // 6. Journalisation obligatoire dans audit_logs
    await supabase.from("audit_logs").insert({
      table_name: "auth.users",
      record_id: user.id,
      action: "USER_PASSWORD_CHANGE_SELF_SERVICE",
      new_data: {
        user_id: user.id,
        email: user.email,
        status: "success",
        changed_at: new Date().toISOString(),
      },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Votre mot de passe a été modifié avec succès.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "Erreur inattendue : " + (err.message || "Impossible de modifier le mot de passe."),
    };
  }
}

/**
 * Server Action pour la mise à jour des coordonnées de contact
 */
export async function updateContactAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Non autorisé" };
    }

    const phone = (formData.get("phone") as string)?.trim();

    const { error } = await supabase
      .from("profiles")
      .update({
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      table_name: "public.profiles",
      record_id: user.id,
      action: "PROFILE_CONTACT_UPDATE",
      new_data: { phone },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Coordonnées de contact mises à jour.",
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

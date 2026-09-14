"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Calcule le nombre de jours ouvrés (lundi → samedi) dans une période.
 * Utilisé pour le prorata temporis des salariés mensuels.
 */
function countWorkingDays(startDate: string, endDate: string): number {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
    if (dayOfWeek !== 0) {
      // Lundi–Samedi = jours ouvrés SIX SIGMA (6 jours/semaine)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calcul unifié de la paie mensuelle pour tous les agents (Staff + Ouvriers)
 * RÈGLE MÉTIER MISE À JOUR :
 * - Cadres / Staff : prorata temporis = (base_salary / jours_ouvrés_théoriques) × jours_présents_réels
 * - Ouvriers / Journaliers : daily_rate × jours_présents_pointés réels
 */
export async function calculateMonthlyPayrollAction(periodId: string) {
  try {
    const supabase = await createClient();

    // 1. Vérification des autorisations RH / Direction
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (
      !currentProfile ||
      !["hr_officer", "admin", "company_management"].includes(currentProfile.role)
    ) {
      return {
        success: false,
        error: "Accès refusé : Seul le Responsable RH ou la Direction peut ordonner le calcul de la paie.",
      };
    }

    // 2. Récupération de la période
    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("id", periodId)
      .single();

    if (periodError || !period) {
      return { success: false, error: "Période de paie introuvable." };
    }

    if (period.is_locked) {
      return { success: false, error: "Cette période de paie est clôturée et ne peut plus être recalculée." };
    }

    // 3. Récupération de l'ensemble des agents actifs (Staff + Ouvriers)
    const { data: activeProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, employee_id, role, sub_role, job_title, trade_category, base_salary, daily_rate, contract_type"
      )
      .eq("is_active", true)
      .order("role")
      .order("full_name");

    if (profilesError || !activeProfiles) {
      return { success: false, error: "Impossible de charger la liste des employés actifs." };
    }

    // 3.5 Calcul des jours ouvrés théoriques de la période (lundi → samedi)
    const theoreticalWorkingDays = countWorkingDays(period.start_date, period.end_date);

    // 3.6 Récupération des pointages réels 'present' sur la période
    const { data: timeEntries } = await supabase
      .from("time_entries")
      .select("profile_id, worker_name, status, entry_date")
      .gte("entry_date", period.start_date)
      .lte("entry_date", period.end_date)
      .in("status", ["present", "late"]); // présent + retard comptent comme jours travaillés

    // Dénombrement des jours présents pointés par profil ou par nom d'ouvrier
    const attendanceMap = new Map<string, number>();
    if (timeEntries) {
      for (const entry of timeEntries) {
        if (entry.profile_id) {
          attendanceMap.set(entry.profile_id, (attendanceMap.get(entry.profile_id) || 0) + 1);
        }
        if (entry.worker_name) {
          const normName = entry.worker_name.toLowerCase().trim();
          attendanceMap.set(normName, (attendanceMap.get(normName) || 0) + 1);
        }
      }
    }

    // 4. Calcul mensuel — Prorata Temporis pour Staff, Journalier pour Ouvriers
    // ─────────────────────────────────────────────────────────────────────────
    // RÈGLE MÉTIER STRICTE :
    // ► Cadres / Staff : (base_salary / jours_ouvrés_théoriques) × jours_présents_réels
    //   → Pas de paiement pour les jours absents non justifiés
    //   → Si aucun pointage trouvé = salaire plein (cadres sans pointer = présumés présents)
    // ► Ouvriers / Journaliers (role = 'worker') : daily_rate × jours_présents_pointés
    //   → Paiement strictement basé sur pointages réels
    const itemsToUpsert = [];
    let sumGross = 0;
    let sumDeductions = 0;
    let sumNet = 0;

    for (const p of activeProfiles) {
      const isWorker = p.role === "worker";

      let baseSalary = 0;
      let daysWorked = 0;
      let calculationMode = "monthly_fixed";

      if (isWorker) {
        // OUVRIER : daily_rate × jours présents réels
        const workedDays =
          attendanceMap.get(p.id) ||
          attendanceMap.get(p.full_name.toLowerCase().trim()) ||
          0;
        daysWorked = workedDays;
        const daily = Number(p.daily_rate) > 0 ? Number(p.daily_rate) : 15;
        baseSalary = Math.round(daily * workedDays);
        calculationMode = "daily_rate_worked";
      } else {
        // STAFF / CADRE : prorata temporis sur jours ouvrés réels de la période
        const contractBase = Number(p.base_salary);
        let monthlyBase = 0;

        if (contractBase > 0) {
          monthlyBase = contractBase;
        } else if (Number(p.daily_rate) > 0) {
          // Si pas de salaire mensuel, reconstituer depuis daily_rate × 26j théoriques
          monthlyBase = Math.round(Number(p.daily_rate) * 26);
        } else {
          // Grille salariale standard SIX SIGMA par rôle
          switch (p.role) {
            case "admin":
            case "company_management": monthlyBase = 2500; break;
            case "site_manager": monthlyBase = 1800; break;
            case "supervisor": monthlyBase = 1200; break;
            case "team_leader": monthlyBase = 650; break;
            case "hr_officer":
            case "accountant":
            case "treasury_officer": monthlyBase = 1100; break;
            case "buyer":
            case "warehouse_keeper":
            case "safety_officer": monthlyBase = 800; break;
            default: monthlyBase = 500; break;
          }
        }

        // Récupérer les jours présents du staff
        const staffPresentDays =
          attendanceMap.get(p.id) ||
          attendanceMap.get(p.full_name.toLowerCase().trim());

        if (staffPresentDays !== undefined && theoreticalWorkingDays > 0) {
          // Prorata réel : on connaît les jours présents
          daysWorked = staffPresentDays;
          baseSalary = Math.round((monthlyBase / theoreticalWorkingDays) * staffPresentDays);
        } else {
          // Pas de pointage trouvé → salaire mensuel plein (cadres présumés présents)
          daysWorked = theoreticalWorkingDays;
          baseSalary = monthlyBase;
        }
        calculationMode = "prorata_working_days";
      }

      // Cotisations sociales CNSS (5%) + IPR fiscal RDC (~8%) consolidés à ~13%
      const deductions = Math.round(baseSalary * 0.13);
      const bonuses = 0;
      const overtimePay = 0;
      const netSalary = Math.max(0, baseSalary + bonuses + overtimePay - deductions);

      sumGross += baseSalary;
      sumDeductions += deductions;
      sumNet += netSalary;

      itemsToUpsert.push({
        period_id: periodId,
        profile_id: p.id,
        worker_name: p.full_name,
        days_worked: daysWorked,
        base_salary: baseSalary,
        overtime_pay: overtimePay,
        bonuses: bonuses,
        deductions: deductions,
        net_salary: netSalary,
        currency: "USD",
        calculation_mode: calculationMode,
        absence_days: 0,
      });
    }

    // 5. Enregistrement des lignes de paie individuelles
    const { error: upsertError } = await supabase
      .from("payroll_items")
      .upsert(itemsToUpsert, { onConflict: "period_id,profile_id" });

    if (upsertError) {
      console.error("Upsert payroll_items error:", upsertError);
      throw upsertError;
    }

    // 6. Mise à jour de la période consolidée
    const { error: updatePeriodError } = await supabase
      .from("payroll_periods")
      .update({
        total_gross: sumGross,
        total_deductions: sumDeductions,
        total_net: sumNet,
        status: "calculated",
        currency: "USD",
      })
      .eq("id", periodId);

    if (updatePeriodError) throw updatePeriodError;

    // 7. Audit log
    await supabase.from("audit_logs").insert({
      table_name: "payroll_periods",
      record_id: periodId,
      action: "CALCULATE_MONTHLY_PAYROLL",
      new_data: {
        period_name: period.period_name,
        total_agents: activeProfiles.length,
        total_gross: sumGross,
        total_net: sumNet,
        performed_by: currentProfile.full_name,
      },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    revalidatePath("/attendance");

    return {
      success: true,
      count: activeProfiles.length,
      totalGross: sumGross,
      totalNet: sumNet,
      totalDeductions: sumDeductions,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de calcul de la paie" };
  }
}

/**
 * Ajustement manuel d'une ligne de paie (jours prestés, primes, déductions pour absence) par le RH
 */
export async function updatePayrollItemAction(
  itemId: string,
  data: {
    bonuses?: number;
    deductions?: number;
    absence_days?: number;
    days_worked?: number;
    notes?: string;
  }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié" };

    // 1. Récupérer l'élément actuel avec son profil
    const { data: item, error: itemErr } = await supabase
      .from("payroll_items")
      .select("*, period:period_id(*), profile:profile_id(*)")
      .eq("id", itemId)
      .single();

    if (itemErr || !item) return { success: false, error: "Ligne de paie introuvable" };

    const isWorker = item.profile?.role === "worker" || item.calculation_mode === "daily_rate_worked";
    let newDaysWorked = data.days_worked !== undefined ? Number(data.days_worked) : Number(item.days_worked || 0);
    let baseSalary = Number(item.base_salary);

    // Si les jours prestés sont modifiés pour un ouvrier, recalculer le salaire de base
    if (isWorker && data.days_worked !== undefined) {
      const dailyRate = Number(item.profile?.daily_rate) > 0 ? Number(item.profile?.daily_rate) : 15;
      baseSalary = Math.round(dailyRate * Math.max(0, newDaysWorked));
    }

    const newBonuses = data.bonuses !== undefined ? Number(data.bonuses) : Number(item.bonuses);
    const newDeductions = data.deductions !== undefined ? Number(data.deductions) : Number(item.deductions);
    const newAbsenceDays = data.absence_days !== undefined ? Number(data.absence_days) : Number(item.absence_days || 0);

    const overtimePay = Number(item.overtime_pay || 0);
    const newNetSalary = Math.max(0, baseSalary + overtimePay + newBonuses - newDeductions);

    // 2. Mettre à jour l'élément
    const { error: updateErr } = await supabase
      .from("payroll_items")
      .update({
        days_worked: newDaysWorked,
        base_salary: baseSalary,
        bonuses: newBonuses,
        deductions: newDeductions,
        absence_days: newAbsenceDays,
        net_salary: newNetSalary,
        notes: data.notes !== undefined ? data.notes : item.notes,
      })
      .eq("id", itemId);

    if (updateErr) throw updateErr;

    // 3. Recalculer les totaux de la période
    const { data: allItems } = await supabase
      .from("payroll_items")
      .select("base_salary, overtime_pay, bonuses, deductions, net_salary")
      .eq("period_id", item.period_id);

    if (allItems) {
      let totGross = 0;
      let totDed = 0;
      let totNet = 0;
      for (const it of allItems) {
        totGross += Number(it.base_salary) + Number(it.overtime_pay) + Number(it.bonuses);
        totDed += Number(it.deductions);
        totNet += Number(it.net_salary);
      }

      await supabase
        .from("payroll_periods")
        .update({
          total_gross: totGross,
          total_deductions: totDed,
          total_net: totNet,
        })
        .eq("id", item.period_id);
    }

    revalidatePath("/attendance");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Création d'une nouvelle période de paie mensuelle
 */
export async function createPayrollPeriodAction(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié" };

    const periodName = (formData.get("period_name") as string)?.trim();
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;

    if (!periodName || !startDate || !endDate) {
      return { success: false, error: "Veuillez renseigner le nom et les dates de la période." };
    }

    const { data, error } = await supabase
      .from("payroll_periods")
      .insert({
        period_name: periodName,
        start_date: startDate,
        end_date: endDate,
        currency: "USD",
        status: "draft",
        is_locked: false,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/attendance");
    return { success: true, period: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

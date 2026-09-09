import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES_CONFIG } from "@/lib/rbac";

export interface AppNotification {
  id: string;
  type: "cashbox" | "stock" | "requisition" | "report" | "attendance" | "audit";
  module: string;
  title: string;
  action: string;
  authorName: string;
  authorRole: string;
  authorRoleLabel: string;
  timestamp: string;
  writtenText: string; // Le texte exact rédigé par l'opérateur
  secondaryText?: string;
  metadata?: {
    label: string;
    value: string;
  }[];
  link: string;
  statusBadge?: {
    label: string;
    variant: "success" | "warning" | "danger" | "info" | "neutral";
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Fetch in parallel the most recent activity across operational tables
    const [
      { data: cashboxData },
      { data: stockData },
      { data: reqData },
      { data: reportsData },
      { data: attendanceData },
      { data: auditData },
    ] = await Promise.all([
      supabase
        .from("cashbox_transactions")
        .select("*, creator:created_by(*), validator:validated_by(*), project:project_id(*)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("stock_movements")
        .select("*, performer:performed_by(*), item:item_id(*), project:project_id(*)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("material_requisitions")
        .select("*, requester:requested_by(*), site_manager:site_manager_id(*), project:project_id(*)")
        .order("updated_at", { ascending: false })
        .limit(15),
      supabase
        .from("daily_site_reports")
        .select("*, supervisor:supervisor_id(*), validator:validated_by(*), project:project_id(*)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("attendance_reconciliations")
        .select("*, supervisor:supervisor_id(*), project:project_id(*)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("audit_logs")
        .select("*, performer:performed_by(*)")
        .order("performed_at", { ascending: false })
        .limit(15),
    ]);

    const notifications: AppNotification[] = [];

    // 1. Cashbox Transactions
    cashboxData?.forEach((t) => {
      const author = t.creator?.full_name || "Comptable Caisse";
      const role = t.creator?.role || "accountant";
      const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Comptable";
      const amountStr = `${Number(t.amount).toLocaleString("fr-FR")} ${t.currency}`;
      const isApproved = t.status === "approved";
      const isRejected = t.status === "rejected";

      notifications.push({
        id: `cash-${t.id}`,
        type: "cashbox",
        module: "Finance & Caisse",
        title: t.transaction_type === "EXPENSE" ? "Dépense de caisse" : "Entrée de caisse",
        action: isApproved
          ? `Validé par ${t.validator?.full_name || "Direction"}`
          : isRejected
          ? "Rejeté par la Direction"
          : "Nouvelle saisie de transaction",
        authorName: author,
        authorRole: role,
        authorRoleLabel: roleLabel,
        timestamp: t.validated_at || t.created_at,
        writtenText: t.description || "(Aucun motif renseigné)",
        secondaryText: t.beneficiary ? `Bénéficiaire : ${t.beneficiary}` : undefined,
        metadata: [
          { label: "Montant", value: amountStr },
          { label: "Catégorie", value: t.category || "Général" },
          ...(t.project?.title ? [{ label: "Chantier", value: t.project.title }] : []),
        ],
        link: "/finance",
        statusBadge: isApproved
          ? { label: "Approuvé", variant: "success" }
          : isRejected
          ? { label: "Rejeté", variant: "danger" }
          : { label: "En attente", variant: "warning" },
      });
    });

    // 2. Stock Movements
    stockData?.forEach((m) => {
      const author = m.performer?.full_name || "Magasinier";
      const role = m.performer?.role || "warehouse_keeper";
      const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Magasinier";
      const itemName = m.item?.name || "Article de stock";
      const qtyStr = `${m.quantity > 0 ? "+" : ""}${m.quantity} ${m.item?.unit || "unités"}`;

      notifications.push({
        id: `stock-${m.id}`,
        type: "stock",
        module: "Stocks & Magasin",
        title: m.movement_type === "IN" ? "Entrée de stock" : "Sortie de matériel",
        action: `Mouvement effectué par le magasinier`,
        authorName: author,
        authorRole: role,
        authorRoleLabel: roleLabel,
        timestamp: m.created_at,
        writtenText: m.notes || `Mouvement de stock pour l'article ${itemName}`,
        secondaryText: m.reference_doc ? `Réf Doc : ${m.reference_doc}` : undefined,
        metadata: [
          { label: "Article", value: itemName },
          { label: "Quantité", value: qtyStr },
          ...(m.project?.title ? [{ label: "Chantier", value: m.project.title }] : []),
        ],
        link: "/inventory",
        statusBadge: {
          label: m.movement_type === "IN" ? "Entrée +" : "Sortie -",
          variant: m.movement_type === "IN" ? "success" : "info",
        },
      });
    });

    // 3. Material Requisitions
    reqData?.forEach((r) => {
      const author = r.requester?.full_name || "Conducteur de travaux";
      const role = r.requester?.role || "site_manager";
      const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Conducteur de Travaux";

      let written = r.supervisor_comment || r.validation_comment || "";
      if (!written && r.supplier_name) {
        written = `Fournisseur retenu : ${r.supplier_name} - Devis : ${r.po_amount || 0} USD`;
      }
      if (!written && r.items && r.items.length > 0) {
        written = r.items.map((i: any) => `${i.quantity}x ${i.item_name}`).join(", ");
      }

      notifications.push({
        id: `req-${r.id}`,
        type: "requisition",
        module: "Réquisitions DRI",
        title: `Réquisition ${r.requisition_number}`,
        action:
          r.status === "approved"
            ? "DRI Approuvée par le Conducteur"
            : r.status === "delivered"
            ? "Matériel livré par le magasinier"
            : r.status === "submitted"
            ? "Nouvelle demande soumise"
            : `Statut : ${r.status}`,
        authorName: author,
        authorRole: role,
        authorRoleLabel: roleLabel,
        timestamp: r.updated_at || r.created_at,
        writtenText: written || "Demande de matériel pour exécution de chantier",
        metadata: [
          { label: "Numéro", value: r.requisition_number },
          ...(r.project?.title ? [{ label: "Chantier", value: r.project.title }] : []),
          ...(r.po_amount ? [{ label: "Montant PO", value: `${r.po_amount} USD` }] : []),
        ],
        link: "/requisitions",
        statusBadge:
          r.status === "delivered"
            ? { label: "Livré", variant: "success" }
            : r.status === "approved"
            ? { label: "Approuvé", variant: "success" }
            : { label: "En cours", variant: "warning" },
      });
    });

    // 4. Daily Site Reports
    reportsData?.forEach((rep) => {
      const author = rep.supervisor?.full_name || "Superviseur Chantier";
      const role = rep.supervisor?.role || "supervisor";
      const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Superviseur";

      const written = rep.validation_notes || rep.activities_summary || rep.issues_and_delays || "";

      notifications.push({
        id: `report-${rep.id}`,
        type: "report",
        module: "Journaux de Chantier",
        title: `Journal Chantier du ${rep.report_date}`,
        action:
          rep.status === "validated"
            ? `Visé et validé par ${rep.validator?.full_name || "Conducteur"}`
            : "Journal soumis par le superviseur",
        authorName: author,
        authorRole: role,
        authorRoleLabel: roleLabel,
        timestamp: rep.validated_at || rep.created_at,
        writtenText: written || "(Aucune note particulière rédigée)",
        secondaryText: rep.issues_and_delays ? `Difficultés : ${rep.issues_and_delays}` : undefined,
        metadata: [
          { label: "Date", value: rep.report_date },
          { label: "Effectif", value: `${rep.workforce_count} ouvriers` },
          ...(rep.project?.title ? [{ label: "Chantier", value: rep.project.title }] : []),
        ],
        link: "/field-reports",
        statusBadge:
          rep.status === "validated"
            ? { label: "Validé (Visé)", variant: "success" }
            : { label: "Soumis", variant: "info" },
      });
    });

    // 5. Attendance Reconciliations
    attendanceData?.forEach((att) => {
      const author = att.supervisor?.full_name || "Superviseur RH";
      const role = att.supervisor?.role || "supervisor";
      const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Superviseur";

      notifications.push({
        id: `att-${att.id}`,
        type: "attendance",
        module: "Pointage & RH",
        title: `Arbitrage RH : ${att.worker_name}`,
        action: att.status === "resolved" ? "Écart arbitré et résolu" : "Écart de pointage signalé",
        authorName: author,
        authorRole: role,
        authorRoleLabel: roleLabel,
        timestamp: att.arbitrated_at || att.created_at,
        writtenText: att.notes || `Arbitrage pour ${att.worker_name} (${att.worker_function || "Ouvrier"})`,
        metadata: [
          { label: "Ouvrier", value: att.worker_name },
          { label: "Date", value: att.reconciliation_date },
          { label: "Statut", value: att.arbitrated_status || att.pointer_status },
        ],
        link: "/attendance",
        statusBadge: att.status === "resolved"
          ? { label: "Résolu", variant: "success" }
          : { label: "À arbitrer", variant: "warning" },
      });
    });

    // 6. Audit Logs (sensitive locks and modifications)
    auditData?.forEach((log) => {
      if (log.action.includes("LOCK") || log.action.includes("PERIOD")) {
        const author = log.performer?.full_name || "Direction SI / Admin";
        const role = log.performer?.role || "admin";
        const roleLabel = (ROLES_CONFIG as any)[role]?.label || "Super-Admin";

        notifications.push({
          id: `audit-${log.id}`,
          type: "audit",
          module: "Gouvernance & Audit",
          title: "Verrouillage Période de Paie",
          action: log.action === "LOCK_PAYROLL_PERIOD" ? "Clôture définitive du mois" : "Déverrouillage exceptionnel",
          authorName: author,
          authorRole: role,
          authorRoleLabel: roleLabel,
          timestamp: log.performed_at,
          writtenText: `Modification du verrou de paie sur la période ${log.new_data?.period_name || log.record_id}`,
          metadata: [
            { label: "Action", value: log.action },
            { label: "Table", value: log.table_name },
          ],
          link: "/audit",
          statusBadge: {
            label: log.action.includes("LOCK") ? "Verrouillé" : "Ouvert",
            variant: "neutral",
          },
        });
      }
    });

    // Sort all notifications chronologically descending
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      notifications,
      totalCount: notifications.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erreur API notifications:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

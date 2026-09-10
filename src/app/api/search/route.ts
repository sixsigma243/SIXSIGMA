import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface SearchResultItem {
  id: string;
  category: "project" | "employee" | "inventory" | "finance" | "requisition" | "module";
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

const MODULE_NAV_ITEMS: SearchResultItem[] = [
  { id: "mod-dashboard", category: "module", categoryLabel: "Module ERP", title: "Tableau de Bord", subtitle: "Vue d'ensemble opérationnelle et financière", link: "/dashboard" },
  { id: "mod-projects", category: "module", categoryLabel: "Module ERP", title: "Chantiers & Projets", subtitle: "Gestion des sites, budgets et affectations", link: "/projects" },
  { id: "mod-field-reports", category: "module", categoryLabel: "Module ERP", title: "Journaux de Chantier", subtitle: "Rapports journaliers, visas et clôture 19h", link: "/field-reports" },
  { id: "mod-attendance", category: "module", categoryLabel: "Module ERP", title: "Pointage & RH", subtitle: "Gestion des présences, biométrie et paie", link: "/attendance" },
  { id: "mod-requisitions", category: "module", categoryLabel: "Module ERP", title: "Réquisitions DRI", subtitle: "Demandes de matériel, achats et devis", link: "/requisitions" },
  { id: "mod-inventory", category: "module", categoryLabel: "Module ERP", title: "Stocks & Magasin", subtitle: "Gestion du stock, seuils d'alerte et entrées/sorties", link: "/inventory" },
  { id: "mod-finance", category: "module", categoryLabel: "Module ERP", title: "Trésorerie & Caisse", subtitle: "Caisse centrale, décaissements chantiers et SoD", link: "/finance" },
  { id: "mod-fleet", category: "module", categoryLabel: "Module ERP", title: "Flotte & Engins", subtitle: "Ordres de mission, charroi et maintenance", link: "/fleet" },
  { id: "mod-audit", category: "module", categoryLabel: "Module ERP", title: "Gouvernance & Audit", subtitle: "Piste d'audit inaltérable et verrous de paie", link: "/audit" },
  { id: "mod-users", category: "module", categoryLabel: "Module ERP", title: "Administration Employés", subtitle: "Gestion des comptes et rôles métier", link: "/admin/users" },
];

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: MODULE_NAV_ITEMS,
      });
    }

    const qLower = query.toLowerCase();

    // 1. Modules matches
    const matchedModules = MODULE_NAV_ITEMS.filter(
      (m) => m.title.toLowerCase().includes(qLower) || m.subtitle.toLowerCase().includes(qLower)
    );

    // 2. Parallel Supabase queries
    const [
      { data: projects },
      { data: profiles },
      { data: inventory },
      { data: cashbox },
      { data: requisitions },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, code, title, client_name, location, status")
        .or(`title.ilike.%${query}%,code.ilike.%${query}%,client_name.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(6),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, phone")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(6),
      supabase
        .from("inventory_items")
        .select("id, name, sku, category, current_stock, unit")
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(6),
      supabase
        .from("cashbox_transactions")
        .select("id, description, amount, currency, transaction_type, category, recipient_or_payer")
        .or(`description.ilike.%${query}%,category.ilike.%${query}%,recipient_or_payer.ilike.%${query}%`)
        .limit(6),
      supabase
        .from("material_requisitions")
        .select("id, requisition_number, supervisor_comment, supplier_name, status")
        .or(`requisition_number.ilike.%${query}%,supervisor_comment.ilike.%${query}%,supplier_name.ilike.%${query}%`)
        .limit(6),
    ]);

    const results: SearchResultItem[] = [...matchedModules];

    // Projects
    projects?.forEach((p) => {
      results.push({
        id: `proj-${p.id}`,
        category: "project",
        categoryLabel: "Chantiers",
        title: `${p.code} • ${p.title}`,
        subtitle: `Client : ${p.client_name || "N/A"} • Localisation : ${p.location || "RDC"}`,
        badge: p.status,
        link: `/projects`,
      });
    });

    // Profiles / Employees
    profiles?.forEach((u) => {
      results.push({
        id: `user-${u.id}`,
        category: "employee",
        categoryLabel: "Collaborateurs",
        title: u.full_name,
        subtitle: `${u.email} ${u.phone ? "• " + u.phone : ""}`,
        badge: u.role,
        link: `/admin/users`,
      });
    });

    // Inventory
    inventory?.forEach((item) => {
      results.push({
        id: `inv-${item.id}`,
        category: "inventory",
        categoryLabel: "Stocks",
        title: `${item.sku} • ${item.name}`,
        subtitle: `Catégorie : ${item.category} • En stock : ${item.current_stock} ${item.unit}`,
        badge: `${item.current_stock} ${item.unit}`,
        link: `/inventory`,
      });
    });

    // Cashbox
    cashbox?.forEach((c) => {
      results.push({
        id: `cash-${c.id}`,
        category: "finance",
        categoryLabel: "Caisse & Finance",
        title: `${c.transaction_type === "EXPENSE" ? "Dépense" : "Entrée"} : ${Number(c.amount).toLocaleString("fr-FR")} ${c.currency}`,
        subtitle: c.description || c.category || "Transaction de caisse",
        badge: c.category,
        link: `/finance`,
      });
    });

    // Requisitions
    requisitions?.forEach((r) => {
      results.push({
        id: `req-${r.id}`,
        category: "requisition",
        categoryLabel: "Réquisitions DRI",
        title: `Réquisition ${r.requisition_number}`,
        subtitle: r.supervisor_comment || (r.supplier_name ? `Fournisseur : ${r.supplier_name}` : "Demande de matériel"),
        badge: r.status,
        link: `/requisitions`,
      });
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Erreur lors de la recherche."
            : err.message,
      },
      { status: 500 }
    );
  }
}

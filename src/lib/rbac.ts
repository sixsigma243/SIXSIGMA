import { UserRole } from "@/types/database";

export interface RoleConfig {
  id: UserRole;
  label: string;
  department: string;
  badgeColor: string;
  description: string;
  testEmail: string;
}

export const ROLES_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    id: "admin",
    label: "Super-Administrateur",
    department: "Direction SI & Gouvernance",
    badgeColor: "bg-purple-900/60 text-purple-200 border-purple-700",
    description: "Gestion des utilisateurs, affectation des rôles, logs d'audit et paramètres généraux.",
    testEmail: "admin@sixsigma.cd",
  },
  company_management: {
    id: "company_management",
    label: "Direction Générale",
    department: "Executive Management",
    badgeColor: "bg-blue-900/60 text-blue-200 border-blue-700",
    description: "KPIs analytiques, trésorerie consolidée, validation des dépenses > 5 000 USD.",
    testEmail: "direction@sixsigma.cd",
  },
  site_manager: {
    id: "site_manager",
    label: "Conducteur / Directeur Travaux",
    department: "Génie Civil & Chantiers",
    badgeColor: "bg-amber-900/60 text-amber-200 border-amber-700",
    description: "Supervise l'ensemble des chantiers, valide les réquisitions DRI et les journaux de chantier.",
    testEmail: "conducteur.travaux@sixsigma.cd",
  },
  supervisor: {
    id: "supervisor",
    label: "Chef de Chantier",
    department: "Opérations Terrain",
    badgeColor: "bg-orange-900/60 text-orange-200 border-orange-700",
    description: "Gère le chantier assigné, valide le pointage, rédige le journal quotidien et émet les DRI.",
    testEmail: "chef.chantier@sixsigma.cd",
  },
  team_leader: {
    id: "team_leader",
    label: "Chef d'Équipe",
    department: "Opérations Terrain",
    badgeColor: "bg-yellow-900/60 text-yellow-200 border-yellow-700",
    description: "Saisie de présence d'équipe, rapport d'avancement physique des tâches.",
    testEmail: "chef.equipe@sixsigma.cd",
  },
  hr_officer: {
    id: "hr_officer",
    label: "Ressources Humaines",
    department: "RH & Paie",
    badgeColor: "bg-pink-900/60 text-pink-200 border-pink-700",
    description: "Pointage, contrats de travail, fiches de paie, acomptes et déclarations sociales.",
    testEmail: "rh@sixsigma.cd",
  },
  accountant: {
    id: "accountant",
    label: "Comptabilité & Finance",
    department: "Finance & Fiscalité",
    badgeColor: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
    description: "Trésorerie, facturation, caisses de chantier et banques multi-devises USD / CDF.",
    testEmail: "compta@sixsigma.cd",
  },
  buyer: {
    id: "buyer",
    label: "Acheteur / Relations Fournisseurs",
    department: "Approvisionnements & Achats",
    badgeColor: "bg-amber-900/60 text-amber-200 border-amber-700",
    description: "Relations fournisseurs, comparatifs de prix (min. 2 devis), bons de commande (PO) adossés aux DRI validées.",
    testEmail: "buyer@sixsigma.cd",
  },
  warehouse_keeper: {
    id: "warehouse_keeper",
    label: "Magasinier / Gestionnaire Stock",
    department: "Logistique & Approvisionnement",
    badgeColor: "bg-teal-900/60 text-teal-200 border-teal-700",
    description: "Entrées/sorties de stock, seuils d'alerte, réceptions de commandes et préparation DRI.",
    testEmail: "magasinier@sixsigma.cd",
  },
  stewardship: {
    id: "stewardship",
    label: "Intendance & Équipements",
    department: "Services Généraux",
    badgeColor: "bg-indigo-900/60 text-indigo-200 border-indigo-700",
    description: "Dotation des EPI, renouvellement uniformes, ravitaillement bases-vie et consommables.",
    testEmail: "intendance@sixsigma.cd",
  },
  mechanic: {
    id: "mechanic",
    label: "Chef d'Atelier / Mécanique",
    department: "Maintenance Matériel & Engins",
    badgeColor: "bg-cyan-900/60 text-cyan-200 border-cyan-700",
    description: "Ordres de réparation, carnet d'entretien préventif/curatif des engins et camions.",
    testEmail: "mecanique@sixsigma.cd",
  },
  dispatch: {
    id: "dispatch",
    label: "Logistique & Transport",
    department: "Charroi Roulant & Dispatch",
    badgeColor: "bg-sky-900/60 text-sky-200 border-sky-700",
    description: "Affectation véhicules/chauffeurs, ordres de mission, suivi carburant et kilométrage.",
    testEmail: "dispatch@sixsigma.cd",
  },
  safety_officer: {
    id: "safety_officer",
    label: "Responsable QHSE",
    department: "Qualité, Hygiène & Sécurité",
    badgeColor: "bg-green-900/60 text-green-200 border-green-700",
    description: "Fiches d'incidents, near-miss, audits de conformité et quarts d'heure de sécurité.",
    testEmail: "qhse@sixsigma.cd",
  },
  commercial: {
    id: "commercial",
    label: "Commercial & Devis",
    department: "Développement Commercial",
    badgeColor: "bg-violet-900/60 text-violet-200 border-violet-700",
    description: "Prospects, devis, opportunités de chantiers et catalogue des prestations.",
    testEmail: "commercial@sixsigma.cd",
  },
  worker: {
    id: "worker",
    label: "Ouvrier / Employé Simple",
    department: "Opérations Terrain & Chantiers",
    badgeColor: "bg-slate-800 text-slate-200 border-slate-700",
    description: "Effectifs de terrain, journaliers et exécutants sans accès direct à l'interface applicative ERP.",
    testEmail: "ouvrier@sixsigma.cd",
  },
};

export interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
  allowedRoles: UserRole[];
  badgeKey?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Tableau de Bord",
    href: "/dashboard",
    iconName: "LayoutDashboard",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "supervisor",
      "team_leader",
      "hr_officer",
      "accountant",
      "buyer",
      "warehouse_keeper",
      "stewardship",
      "mechanic",
      "dispatch",
      "safety_officer",
      "commercial",
    ],
  },
  {
    name: "Chantiers & Projets",
    href: "/projects",
    iconName: "HardHat",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "supervisor",
      "team_leader",
      "commercial",
      "buyer",
    ],
  },
  {
    name: "Journaux de Chantier",
    href: "/field-reports",
    iconName: "ClipboardList",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "supervisor",
      "safety_officer",
    ],
  },
  {
    name: "Pointage & RH",
    href: "/attendance",
    iconName: "Users",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "supervisor",
      "team_leader",
      "hr_officer",
    ],
  },
  {
    name: "Réquisitions & Achats",
    href: "/requisitions",
    iconName: "FileCheck2",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "supervisor",
      "buyer",
      "warehouse_keeper",
      "accountant",
    ],
  },
  {
    name: "Stocks & Matériaux",
    href: "/inventory",
    iconName: "Boxes",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "warehouse_keeper",
      "buyer",
      "stewardship",
      "mechanic",
    ],
  },
  {
    name: "Caisses & Trésorerie",
    href: "/finance",
    iconName: "Coins",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "accountant",
    ],
  },
  {
    name: "Flotte & Engins BTP",
    href: "/fleet",
    iconName: "Truck",
    allowedRoles: [
      "admin",
      "company_management",
      "site_manager",
      "dispatch",
      "mechanic",
    ],
  },
  {
    name: "Gouvernance & Audit Logs",
    href: "/audit",
    iconName: "ShieldAlert",
    allowedRoles: [
      "admin",
      "company_management",
    ],
  },
  {
    name: "Collaborateurs & Base RH",
    href: "/admin/users",
    iconName: "UserCog",
    allowedRoles: ["admin", "hr_officer", "company_management"],
  },
];

export function hasRoleAccess(userRole: UserRole | undefined | null, allowedRoles: UserRole[]): boolean {
  if (!userRole || userRole === "worker") return false; // Ouvrier/Journalier sans accès direct à l'interface
  if (userRole === "admin") return true; // Super admin has access to everything
  return allowedRoles.includes(userRole);
}

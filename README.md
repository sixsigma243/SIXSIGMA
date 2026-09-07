# SIX SIGMA ERP — « La constance dans la qualité »

Portail ERP d'entreprise et d'administration opérationnelle développé pour **SIX SIGMA**, société active dans le BTP, Génie Civil, Construction Métallique, Logistique/Engins Lourds, Placement de Personnel et Négoce Technique en République Démocratique du Congo (RDC).

---

## Architecture & Stack Technique

- **Frontend & Server Components :** Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI :** Tailwind CSS, Lucide React
- **Base de Données & Authentification :** Supabase (PostgreSQL 17), Row Level Security (RLS)
- **Sécurité Métier & SoD :** Triggers PostgreSQL pour la séparation des pouvoirs (SoD) et l'inviolabilité des écritures
- **Monnaies :** Dualité native USD et Franc Congolais (CDF) avec taux de référence officiel

---

## Fonctionnalités Clés

1. **Matrice des 14 Rôles Opérationnels :**
   - Super-Administrateur Système (`admin`)
   - Direction Générale (`company_management`)
   - Conducteur / Directeur de Travaux (`site_manager`)
   - Chef de Chantier (`supervisor`)
   - Chef d'Équipe / Contremaître (`team_leader`)
   - Ressources Humaines & Paie (`hr_officer`)
   - Comptabilité & Trésorerie (`accountant`)
   - Acheteur & Négociation Fournisseurs (`buyer`)
   - Magasinier & Gestion des Stocks (`warehouse_keeper`)
   - Intendant & Moyens Généraux (`stewardship`)
   - Chef d'Atelier & Maintenance Engins (`mechanic`)
   - Responsable Dispatching & Charroi (`dispatch`)
   - Responsable QHSE (`safety_officer`)
   - Ingénieur Commercial & Devis (`commercial`)

2. **Gouvernance & Séparation des Pouvoirs (SoD) :**
   - Interdiction à l'administrateur système de valider des dépenses de caisse.
   - Visa obligatoire de la Direction Générale pour tout décaissement $\ge 5\,000\text{ USD}$ (ou équivalent CDF).
   - Zéro stock négatif autorisé et rattachement chantier/engin obligatoire pour toute sortie de magasin.
   - Blocage immédiat du dispatching pour tout engin en maintenance ou hors service.
   - Règle stricte d'un minimum de 2 devis comparatifs avant émission d'un Bon de Commande (PO).
   - Table de réconciliation et arbitrage des écarts de présence RH (Pointeur vs Chef d'Équipe).

3. **Modules ERP :**
   - **Tableau de Bord & KPIs :** Synthèse budgétaire, trésorerie multi-devises, alertes opérationnelles.
   - **Chantiers & Projets :** Suivi technique, budgets, jalons et assignations.
   - **Journaux de Chantier :** Rapports journaliers terrain, météo, effectifs, incidents.
   - **Pointage & RH :** Présences guérite, relevés de front et arbitrage des litiges.
   - **Réquisitions & Achats :** Cycle DRI $\rightarrow$ Approbation Conducteur Travaux $\rightarrow$ Devis comparatifs $\rightarrow$ Bon de Commande.
   - **Stocks & Magasins :** Inventaire permanent, seuils d'alerte, entrées/sorties.
   - **Trésorerie & Caisse :** Encaissements/décaissements USD/CDF, visas hiérarchiques.
   - **Flotte & Engins :** Disponibilité du charroi, ordres de mission, ordres de réparation (OR).

---

## Installation & Démarrage

### Prérequis
- Node.js 20+
- Compte / Projet Supabase

### Installation
```bash
# 1. Cloner le dépôt
git clone https://github.com/sixsigma243/SIXSIGMA.git
cd SIXSIGMA

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env.local
# Renseigner vos clés Supabase dans .env.local

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## Documentation Complète

Le manuel d'architecture complet des 14 rôles et la matrice RACI sont disponibles dans [`docs/ROLES_ET_PERMISSIONS.md`](docs/ROLES_ET_PERMISSIONS.md).

---

## Licence

Propriété exclusive de **SIX SIGMA** — République Démocratique du Congo. Tous droits réservés.

# SIX SIGMA ERP — Manuel d'Architecture & Matrice des 14 Rôles Utilisateurs
*« La constance dans la qualité »*

---

## Introduction & Principes Directeurs

Le portail ERP de **SIX SIGMA** est conçu pour répondre aux exigences strictes de gouvernance opérationnelle, financière et technique dans les secteurs du BTP, Génie Civil, Construction Métallique, Logistique Minière et Placement de Personnel en République Démocratique du Congo (RDC).

L'architecture repose sur trois piliers fondamentaux :
1. **Le principe du moindre privilège (PoLP) :** Chaque collaborateur n'accède qu'aux données strictement requises pour sa fonction.
2. **La Séparation des Pouvoirs (Segregation of Duties - SoD) :** Les opérations critiques (mouvements de trésorerie, sorties de stock matériel, engagements de commande) font l'objet de verrous programmatiques et de triggers PostgreSQL inviolables interdisant l'auto-approbation ou les conflits d'intérêts.
3. **La dualité monétaire native USD / CDF :** Gestion intégrée des devises avec conversion au taux de référence officiel (1 USD = 2 850 CDF) et seuils d'approbation stricts.

Tous les comptes de test et de démonstration partagent le mot de passe standardisé : `SixSigma2026!`.

---

## Fiches Détaillées des 14 Rôles Métier

---

### 1. `admin` — Super-Administrateur Système
- **Intitulé & Département :** Super-Administrateur Système — *Direction des Systèmes d'Information & Gouvernance (DSI)*
- **Compte de test configuré :** `admin@sixsigma.cd` | Collaborateur : **Fabrice Mukendi** | Tél : `+243 81 000 0001`
- **Périmètre d'action opérationnel :**
  - Gouvernance technique globale de la plateforme, gestion du cycle de vie des comptes utilisateurs, attribution et révocation des rôles dans `public.profiles`.
  - Supervision des logs d'audit, configuration des paramètres système et maintenance de l'intégrité de la base de données.
  - *Frontière d'autorité :* L'administrateur n'a aucun pouvoir décisionnel opérationnel ou financier. Il ne peut engager l'entreprise sur un chantier, ni valider une dépense.
- **Actions autorisées (CRUD & Pages) :**
  - Accès transversal en lecture/administration à l'ensemble des routes applicatives (`/dashboard`, `/projects`, `/field-reports`, `/attendance`, `/requisitions`, `/inventory`, `/finance`, `/fleet`).
  - **CRUD complet** sur les utilisateurs, profils, tables de référence et configuration technique.
- **Interactions & Partenaires de flux :**
  - Reçoit les demandes d'ouverture/modification de compte de la Direction Générale et des Ressources Humaines.
  - Transmet les comptes d'accès opérationnels aux différents chefs de département.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Trigger `trg_enforce_sod_cashbox` :** Interdiction absolue pour le rôle `admin` d'être renseigné comme validateur (`validated_by`) sur une transaction financière (`cashbox_transactions`). Tout essai d'approbation déclenche l'exception SQL : *« Séparation des pouvoirs : L'administrateur système ne valide pas de dépenses financières. »*.

---

### 2. `company_management` — Direction Générale (DG / Comex)
- **Intitulé & Département :** Directeur Général / Comité Exécutif — *Direction Générale (Executive Management)*
- **Compte de test configuré :** `direction@sixsigma.cd` | Collaborateur : **Patrick Kalala (DG)** | Tél : `+243 81 000 0002`
- **Périmètre d'action opérationnel :**
  - Supervision stratégique et consolidation financière de l'ensemble des projets miniers et chantiers de construction.
  - Arbitrage ultime des budgets, validation des engagements de dépenses majeurs et analyse des KPIs macro-économiques.
  - *Frontière d'autorité :* Ne saisit pas les données quotidiennes de terrain (pointage, rapports de chantier, mouvements physiques de stock).
- **Actions autorisées (CRUD & Pages) :**
  - Accès complet en consultation sur `/dashboard` (KPIs consolidés, budgets multi-devises, trésorerie), `/projects`, `/field-reports`, `/attendance`, `/requisitions`, `/finance`, `/fleet`.
  - Approbation financière exclusive des décaissements et transactions de caisse de montant élevé.
- **Interactions & Partenaires de flux :**
  - Reçoit les demandes d'engagement et réquisitions budgétaires du Conducteur de Travaux (`site_manager`) et du Comptable (`accountant`).
  - Émet les visas d'autorisation financière pour les achats majeurs et décaissements de trésorerie.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Plafond d'autorisation exclusive $\ge 5\,000\text{ USD}$ (Trigger `trg_enforce_sod_cashbox`) :** Toute transaction de caisse dont le montant est supérieur ou égal à $5\,000\text{ USD}$ (ou $\ge 14\,250\,000\text{ CDF}$) requiert obligatoirement le visa d'un profil ayant le rôle `company_management`. Tout visa par un tiers est rejeté par la base de données.

---

### 3. `site_manager` — Conducteur / Directeur de Travaux
- **Intitulé & Département :** Conducteur de Travaux Principal — *Direction Technique & Exploitation Génie Civil*
- **Compte de test configuré :** `conducteur.travaux@sixsigma.cd` | Collaborateur : **Ing. Michel Tshilombo** | Tél : `+243 81 000 0003`
- **Périmètre d'action opérationnel :**
  - Pilotage transversal du portefeuille de chantiers (mines et infrastructures), affectation des ressources humaines et matérielles par projet.
  - Validation hiérarchique des Demandes de Réquisition Interne (DRI) de matériaux émises par le terrain avant transfert aux Achats.
  - Contrôle et validation des Journaux Quotidiens de Chantier rédigés par les Chefs de Chantier.
  - *Frontière d'autorité :* Ne peut négocier directement avec les fournisseurs (rôle réservé à l'Acheteur) ni décaisser des fonds sans visa comptable.
- **Actions autorisées (CRUD & Pages) :**
  - `/dashboard` : Vue opérationnelle des projets actifs, effectifs et alertes de stock.
  - `/projects` : Création et modification des fiches projets, jalons et budgets prévisionnels.
  - `/field-reports` : Lecture, révision et validation (`validated_by`) des rapports quotidiens.
  - `/attendance` : Consultation du pointage global et **arbitrage officiel des litiges de présence RH** (`attendance_reconciliations`).
  - `/requisitions` : Approbation technique formelle (`approved`) des réquisitions de matériaux.
  - `/finance` & `/fleet` : Consultation pour alignement logistique et suivi des dépenses engagées.
- **Interactions & Partenaires de flux :**
  - Reçoit les DRI et rapports journaliers du Chef de Chantier (`supervisor`).
  - Transmet les DRI validées à l'Acheteur (`buyer`) et au Magasinier (`warehouse_keeper`).
  - Arbitre les écarts de présence constatés par le Pointeur (`hr_officer`) et le Chef d'Équipe (`team_leader`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Seul profil habilité (avec la DG) à faire passer une réquisition du statut `submitted` à `approved`.
  - Autorisé par la politique RLS `attendance_reconciliations` à exécuter les arbitrages définitifs sur les litiges de pointage.

---

### 4. `supervisor` — Chef de Chantier
- **Intitulé & Département :** Chef de Chantier Résident — *Exploitation & Opérations Terrain*
- **Compte de test configuré :** `chef.chantier@sixsigma.cd` | Collaborateur : **Dieudonné Kasongo** | Tél : `+243 81 000 0004`
- **Périmètre d'action opérationnel :**
  - Responsable opérationnel in situ d'un chantier précis (ex: Base-Vie Kamoa ou Plateforme TFM).
  - Émission quotidienne du Journal de Chantier (avancement des travaux, météo, retards, effectif présent).
  - Déclenchement des besoins en matériaux via la création des DRI.
  - *Frontière d'autorité :* Ne peut approuver lui-même ses propres réquisitions (interdiction d'auto-validation DRI). Limité à son périmètre de chantier.
- **Actions autorisées (CRUD & Pages) :**
  - `/field-reports` & `/field-reports/new` : Création et édition du rapport journalier de son chantier.
  - `/requisitions` : Création (`INSERT`) des demandes de réquisition interne (`submitted`).
  - `/attendance` : Consultation des présences sur site et premier niveau d'arbitrage des conflits de pointage.
  - `/projects` : Consultation des données techniques et du planning de son chantier.
- **Interactions & Partenaires de flux :**
  - Reçoit les feuilles de présence et bilans d'avancement du Chef d'Équipe (`team_leader`).
  - Transmet le rapport journalier et les réquisitions au Conducteur de Travaux (`site_manager`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Ne peut modifier le statut d'une réquisition en `approved` (bloqué par l'interface et RLS).
  - Ne peut arbitrer que les réconciliations de présence des projets auxquels il est formellement assigné dans `project_assignments`.

---

### 5. `team_leader` — Chef d'Équipe (Team Leader)
- **Intitulé & Département :** Chef d'Équipe / Contremaître — *Terrain, Pose & Exécution Spécialisée*
- **Compte de test configuré :** `chef.equipe@sixsigma.cd` | Collaborateur : **Alain Mbuyi** | Tél : `+243 81 000 0005`
- **Périmètre d'action opérationnel :**
  - Encadrement direct des ouvriers, maçons, ferrailleurs, soudeurs et poseurs sur le front de travail.
  - Saisie de la présence opérationnelle de son équipe (qui a effectivement travaillé sur le front).
  - Rapport verbal ou écrit de l'avancement physique des tâches confiées.
  - *Frontière d'autorité :* N'a aucun accès aux modules financiers, achats, stocks globaux ou administration.
- **Actions autorisées (CRUD & Pages) :**
  - `/attendance` : Saisie des fiches de présence de son équipe (`presence_status`).
  - `/dashboard` : Visualisation synthétique des alertes de chantier.
  - `/projects` : Consultation en lecture seule des directives de son chantier.
- **Interactions & Partenaires de flux :**
  - Transmet sa feuille de pointage opérationnelle au Chef de Chantier (`supervisor`) et au Pointeur RH (`hr_officer`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **SoD Pointage vs Paie :** Le Chef d'Équipe n'a pas le droit d'arbitrer un écart entre son relevé et celui du pointeur. La saisie du Chef d'Équipe est stockée dans `team_leader_status` et mise en concurrence avec `pointer_status` pour détecter les ouvriers fantômes (*ghost workers*).

---

### 6. `hr_officer` — Ressources Humaines (Pointage, Payroll, Social)
- **Intitulé & Département :** Chargé des Ressources Humaines & Paie — *Direction des Ressources Humaines (DRH)*
- **Compte de test configuré :** `rh@sixsigma.cd` | Collaborateur : **Nathalie Kapinga** | Tél : `+243 81 000 0006`
- **Périmètre d'action opérationnel :**
  - Contrôle indépendant de la présence physique à la guérite d'entrée (rôle du Pointeur).
  - Gestion administrative du personnel (contrats, classification professionnelle, calcul de la paie, acomptes, déclarations sociales INSS/CNSS, ONEM, INPP).
  - Détection et signalement des écarts de pointage pour réconciliation.
  - *Frontière d'autorité :* Ne peut trancher un litige technique sur le chantier (l'arbitrage d'un écart revient à la ligne managériale travaux).
- **Actions autorisées (CRUD & Pages) :**
  - `/attendance` : Saisie du pointage d'accès (`time_entries`), consultation de la table des réconciliations (`attendance_reconciliations`), extraction des états de paie.
  - `/dashboard` : Suivi des effectifs totaux mobilisés et des heures supplémentaires.
- **Interactions & Partenaires de flux :**
  - Confronte ses pointages de guérite avec ceux du Chef d'Équipe (`team_leader`).
  - Soumet les écarts constatés (`status = 'pending'`) au Chef de Chantier ou Conducteur de Travaux pour arbitrage.
  - Transmet les états de paie validés au Comptable (`accountant`) pour paiement.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Ne peut s'auto-attribuer le statut d'arbitre sur une réconciliation de présence (réservé à `supervisor`, `site_manager`, `admin`).
  - La politique RLS garantit l'inviolabilité des écritures de paie face aux intervenants chantier.

---

### 7. `accountant` — Comptabilité & Trésorerie
- **Intitulé & Département :** Responsable Comptable & Financier — *Direction Financière & Fiscalité*
- **Compte de test configuré :** `compta@sixsigma.cd` | Collaborateur : **Serge Ilunga** | Tél : `+243 81 000 0007`
- **Périmètre d'action opérationnel :**
  - Tenue des journaux de caisse (USD et CDF), gestion des comptes bancaires, règlement des factures fournisseurs et paiement des salaires/avances.
  - Suivi des taux de change officiel et rapprochement des caisses de menues dépenses de chantier (*petty cash*).
  - *Frontière d'autorité :* Ne valide pas les dépenses excédant son seuil de délégation ($5\,000\text{ USD}$), qui incombent à la Direction Générale.
- **Actions autorisées (CRUD & Pages) :**
  - `/finance` : Saisie des transactions d'encaissement et décaissement (`cashbox_transactions`), rapprochement de caisse, validation des menues dépenses ($< 5\,000\text{ USD}$).
  - `/requisitions` : Consultation des bons de commande émis pour ordonnancement du paiement.
  - `/dashboard` : Visualisation des soldes de trésorerie consolidés par devise.
- **Interactions & Partenaires de flux :**
  - Reçoit les bons de commande et devis validés de l'Acheteur (`buyer`).
  - Reçoit les états d'avancement validés du Conducteur de Travaux (`site_manager`).
  - Transmet les demandes de décaissement $\ge 5\,000\text{ USD}$ au Directeur Général (`company_management`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Trigger `trg_enforce_sod_cashbox` :** Toute validation tentée par le comptable sur un montant $\ge 5\,000\text{ USD}$ ou contre-valeur CDF est bloquée immédiatement avec l'erreur : *« Toute dépense >= 5 000 USD requiert obligatoirement le visa de la Direction Générale. »*.

---

### 8. `buyer` — Acheteur / Approvisionnements
- **Intitulé & Département :** Responsable des Achats & Négociation — *Département Approvisionnements & Achats*
- **Compte de test configuré :** `buyer@sixsigma.cd` | Collaborateur : **Olivier Malela** | Tél : `+243 81 000 0014`
- **Périmètre d'action opérationnel :**
  - Consultation des Réquisitions Internes (DRI) approuvées par le Conducteur de Travaux.
  - Lancement des consultations fournisseurs, négociation des conditions tarifaires, délais et modalités de transport.
  - Analyse comparative des offres et émission des Bons de Commande (Purchase Orders - PO).
  - *Frontière d'autorité :* Ne peut émettre un bon de commande sans DRI préalable approuvée, ni valider le décaissement financier correspondant.
- **Actions autorisées (CRUD & Pages) :**
  - `/requisitions` : Visualisation des DRI approuvées, saisie des devis comparatifs fournisseurs, génération des bons de commande officiels.
  - `/inventory` : Consultation des stocks pour identifier les ruptures et anticiper les approvisionnements.
  - `/projects` : Consultation des besoins matériels par chantier.
- **Interactions & Partenaires de flux :**
  - Reçoit les DRI approuvées du Conducteur de Travaux (`site_manager`).
  - Consulte le Magasinier (`warehouse_keeper`) pour vérifier l'inexistence de matériel équivalent en stock.
  - Transmet le Bon de Commande (PO) au Comptable (`accountant`) et au Magasinier (pour attente de réception).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Règle impérative des 2 devis comparatifs :** Aucun bon de commande ne peut être finalisé sans la saisie formalisée d'au minimum deux (2) cotations fournisseurs concurrentes (prix unitaire, devise, délai de livraison, conditions de paiement).
  - Interdiction de créer des DRI pour son propre compte (séparation prescripteur / acheteur).

---

### 9. `warehouse_keeper` — Magasinier / Gestionnaire de Stock
- **Intitulé & Département :** Magasinier Central & Gestionnaire des Parcs — *Direction Logistique & Approvisionnements*
- **Compte de test configuré :** `magasinier@sixsigma.cd` | Collaborateur : **Junior Kabeya** | Tél : `+243 81 000 0008`
- **Périmètre d'action opérationnel :**
  - Réception physique des commandes livrées par les fournisseurs, vérification de conformité avec le PO.
  - Rangement, étiquetage, tenue de l'inventaire permanent des matériaux (ciment, fers à béton, carburant, pièces de rechange).
  - Préparation et délivrance des matériels sur présentation d'un bon de sortie adossé à une DRI approuvée.
  - *Frontière d'autorité :* Ne peut délivrer aucun article sans rattachement formel à un chantier ou engin identifié.
- **Actions autorisées (CRUD & Pages) :**
  - `/inventory` : Création et mise à jour des fiches articles (`inventory_items`), enregistrement des mouvements de stock (entrées `IN`, sorties `OUT`, ajustements `ADJUST`).
  - `/requisitions` : Consultation des DRI approuvées pour préparation des lots.
- **Interactions & Partenaires de flux :**
  - Reçoit les copies de bons de commande de l'Acheteur (`buyer`) pour préparer la réception.
  - Reçoit les demandes de retrait physique du Chef de Chantier (`supervisor`) ou Chef d'Atelier (`mechanic`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Trigger `trg_validate_stock_out` :**
    1. *Zéro stock négatif :* Rejet immédiat de toute sortie dont la quantité excède le stock physique disponible en magasin (`current_stock >= NEW.quantity`).
    2. *Rattachement chantier obligatoire :* Rejet de toute sortie où `project_id IS NULL` (*« Sortie de stock obligatoirement rattachée à un chantier ou un engin précis. »*).

---

### 10. `stewardship` — Intendance & Moyens Généraux
- **Intitulé & Département :** Responsable Intendance & Moyens Généraux — *Direction des Services Généraux & Bases-Vie*
- **Compte de test configuré :** `intendance@sixsigma.cd` | Collaborateur : **Béatrice Mwamba** | Tél : `+243 81 000 0009`
- **Périmètre d'action opérationnel :**
  - Approvisionnement et intendance des bases-vie minières (hébergement, restauration, eau potable, literie).
  - Gestion du registre et de la dotation des Équipements de Protection Individuelle (EPI : casques, chasubles, bottes, gants) et uniformes.
  - Suivi de l'usure, du renouvellement et de la traçabilité des dotations par travailleur.
  - *Frontière d'autorité :* N'intervient pas dans les matériaux de construction lourds ni dans les pièces mécaniques d'engins.
- **Actions autorisées (CRUD & Pages) :**
  - `/inventory` : Gestion des stocks dédiés aux EPI et consommables de vie.
  - Gestion du registre des allocations EPI (`epi_allocations`) avec statuts d'usure (`assigned`, `worn_out`, `lost`, `damaged`).
  - `/dashboard` : Suivi des effectifs équipés et alertes de renouvellement EPI.
- **Interactions & Partenaires de flux :**
  - Coordonne avec le Responsable QHSE (`safety_officer`) pour le respect des normes de sécurité des EPI.
  - Coordonne avec les RH (`hr_officer`) pour équiper les nouvelles recrues dès leur embauche.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Tout EPI réformé doit être formellement qualifié via l'enum `public.epi_status` pour justifier une nouvelle dotation et éviter les gaspillages ou sorties illicites.

---

### 11. `mechanic` — Chef d'Atelier / Maintenance Flotte
- **Intitulé & Département :** Chef d'Atelier Mécanique Engins Lourds — *Département Maintenance Matériel & Charroi*
- **Compte de test configuré :** `mecanique@sixsigma.cd` | Collaborateur : **David Lubamba** | Tél : `+243 81 000 0010`
- **Périmètre d'action opérationnel :**
  - Diagnostic, entretien préventif et réparations curatives de la flotte d'engins BTP (bulldozers, pelles excavatrices, camions bennes, compacteurs).
  - Ouverture, mise à jour et clôture des Ordres de Réparation (`repair_orders`).
  - Immobilisation technique des engins défaillants (basculement du statut en `under_maintenance` ou `out_of_service`).
  - *Frontière d'autorité :* Ne peut affecter un engin à une mission de transport (compétence exclusive du Dispatcher).
- **Actions autorisées (CRUD & Pages) :**
  - `/fleet` : Gestion de l'état mécanique des engins, carnet d'entretien, création et suivi des Ordres de Réparation (`repair_orders`).
  - `/inventory` : Demande de pièces de rechange et lubrifiants (adossées aux Ordres de Réparation).
- **Interactions & Partenaires de flux :**
  - Reçoit les signalements de panne des chauffeurs et du Dispatcher (`dispatch`).
  - Transmet les besoins en pièces détachées au Magasinier (`warehouse_keeper`) ou à l'Acheteur (`buyer`).
  - Remet les engins réparés à la disposition du Dispatcher via le statut `available`.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Cycle de vie strict des Ordres de Réparation encadré par l'enum `public.or_status` (`draft` $\rightarrow$ `diagnosing` $\rightarrow$ `waiting_parts` $\rightarrow$ `in_repair` $\rightarrow$ `completed`).
  - Dès qu'un engin est placé sous maintenance, son statut technique verrouille automatiquement son utilisation par le module Dispatch.

---

### 12. `dispatch` — Responsable Dispatching & Charroi
- **Intitulé & Département :** Responsable Dispatching & Logistique Transport — *Département Charroi Roulant & Transport*
- **Compte de test configuré :** `dispatch@sixsigma.cd` | Collaborateur : **Gaston Banza** | Tél : `+243 81 000 0011`
- **Périmètre d'action opérationnel :**
  - Planification des transports de matériaux et rotations d'engins entre les carrières, les bases-vie et les chantiers miniers.
  - Émission des ordres de mission (`dispatch_missions`), affectation des chauffeurs/opérateurs et suivi du kilométrage/carburant.
  - *Frontière d'autorité :* Ne peut forcer l'utilisation d'un engin déclaré inapte par l'Atelier Mécanique.
- **Actions autorisées (CRUD & Pages) :**
  - `/fleet` : Visualisation de la disponibilité de la flotte, création et suivi des ordres de mission, affectation des chauffeurs.
  - `/dashboard` : Suivi en temps réel des engins mobilisés, disponibles ou immobilisés.
- **Interactions & Partenaires de flux :**
  - Reçoit les demandes d'évacuation ou d'approvisionnement des Chefs de Chantier (`supervisor`).
  - Vérifie la conformité mécanique auprès du Chef d'Atelier (`mechanic`).
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - **Trigger `trg_validate_dispatch_vehicle` :** Interdiction absolue d'affecter à un ordre de mission un véhicule ou engin dont le statut dans `fleet_vehicles` est `under_maintenance` ou `out_of_service`. Toute tentative déclenche l'exception SQL : *« Véhicule indisponible (en atelier ou hors service) : affectation en mission bloquée. »*.

---

### 13. `safety_officer` — Responsable QHSE
- **Intitulé & Département :** Responsable Qualité, Hygiène, Sécurité & Environnement — *Direction QHSE & Conformité RSE*
- **Compte de test configuré :** `qhse@sixsigma.cd` | Collaborateur : **Sandrine Luvualu** | Tél : `+243 81 000 0012`
- **Périmètre d'action opérationnel :**
  - Veille au respect des standards de sécurité sur l'ensemble des chantiers (normes minières RDC, port des EPI, analyse des risques).
  - Enregistrement des incidents, accidents du travail, quasi-accidents (*near-miss*) et arrêts de travail.
  - Contrôle et validation des observations sécurité consignées dans les journaux de chantier.
  - *Frontière d'autorité :* Dispose d'un droit de veto sécuritaire pour suspendre une activité à risque, mais ne modifie pas les plannings techniques ou les budgets.
- **Actions autorisées (CRUD & Pages) :**
  - `/field-reports` : Consultation des rapports de chantier et audit des sections `safety_observations`.
  - `/dashboard` : Suivi des indicateurs QHSE (taux de fréquence des accidents, jours sans accident, conformité des causeries sécurité).
  - `/projects` : Audit de conformité des chantiers actifs.
- **Interactions & Partenaires de flux :**
  - Reçoit les alertes incidents du Chef de Chantier (`supervisor`) et du Chef d'Équipe (`team_leader`).
  - Coordonne avec l'Intendant (`stewardship`) pour s'assurer que les dotations d'EPI répondent aux normes de protection requises.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Les fiches et observations QHSE font l'objet d'un archivage inaltérable garantissant l'intégrité des données en cas d'audit d'assurance ou de l'Inspection du Travail.

---

### 14. `commercial` — Ingénieur Commercial & Devis
- **Intitulé & Département :** Ingénieur Chargé d'Affaires & Devis — *Direction Commerciale & Développement*
- **Compte de test configuré :** `commercial@sixsigma.cd` | Collaborateur : **Eric Mulamba** | Tél : `+243 81 000 0013`
- **Périmètre d'action opérationnel :**
  - Prospection, relations clients donneurs d'ordre (compagnies minières, gouvernorat, bailleurs de fonds internationaux).
  - Établissement des offres techniques et financières, chiffrage des bordereaux de prix unitaires (BPU) et devis quantitatifs estimatifs (DQE).
  - Création initiale des opportunités de projet avant conversion en chantiers actifs.
  - *Frontière d'autorité :* Ne pilote pas l'exécution des travaux une fois le marché adjugé et le chantier démarré.
- **Actions autorisées (CRUD & Pages) :**
  - `/projects` : Création des dossiers projets (`status = 'planned'`), saisie des budgets initiaux et consultation des fiches techniques.
  - `/dashboard` : Suivi du portefeuille d'affaires, valeur totale des contrats signés et ratios de rentabilité prévisionnelle.
- **Interactions & Partenaires de flux :**
  - Transmet les dossiers de marché adjugés au Conducteur de Travaux (`site_manager`) pour lancement opérationnel.
  - Collabore avec la Direction Générale (`company_management`) pour l'approbation des remises commerciales et des offres stratégiques.
- **Règles de gestion & Verrous stricts (SoD / PostgreSQL) :**
  - Ne peut modifier les statuts opérationnels d'avancement des chantiers en cours ni interférer dans la gestion des stocks et de la trésorerie.

---

## Tableau Matriciel RACI / Droits d'Accès

### Légende de la Matrice RACI
- **R (Responsible / Exécutant) :** Rôle en charge de la saisie, création ou exécution de l'action dans le module.
- **A (Accountable / Approbateur final) :** Rôle disposant du pouvoir de validation, d'arbitrage ou de signature officielle.
- **C (Consulted / Consulté) :** Rôle consulté ou contributeur régulier dans le flux opérationnel.
- **I (Informed / Informé) :** Rôle disposant d'un droit de consultation en lecture seule (visibilité sans modification).
- **— (Aucun accès) :** Rôle n'ayant pas accès au module (restreint par RBAC et masqué dans la barre de navigation).

---

### Matrice Croisée des 14 Rôles et des Modules Applicatifs

| N° | Rôle Métier | Dashboard (`/dashboard`) | Chantiers (`/projects`) | Journaux Terrain (`/field-reports`) | Pointage & RH (`/attendance`) | DRI & Achats (`/requisitions`) | Stocks & Magasin (`/inventory`) | Caisse & Trésorerie (`/finance`) | Flotte & Engins (`/fleet`) | Sécurité & QHSE | Utilisateurs & Sécurité |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `admin` (Admin Système) | **A** | **A** | **A** | **A** | **A** | **A** | **I** *(SoD)* | **A** | **A** | **R / A** |
| **2** | `company_management` (DG) | **A** | **A** | **I** | **I** | **A** | **I** | **A** *(>5k$)* | **I** | **I** | **I** |
| **3** | `site_manager` (Conducteur Travaux) | **R** | **R / A** | **A** | **A** *(Arbitrage)* | **A** *(Validation)* | **I** | **C** | **C** | **C** | **—** |
| **4** | `supervisor` (Chef Chantier) | **R** | **C** | **R** | **C** | **R** *(DRI)* | **I** | **—** | **I** | **C** | **—** |
| **5** | `team_leader` (Chef Équipe) | **I** | **I** | **—** | **R** *(Présences)* | **—** | **—** | **—** | **—** | **C** | **—** |
| **6** | `hr_officer` (RH & Paie) | **R** | **—** | **—** | **R** *(Guérite/Paie)* | **—** | **—** | **C** | **—** | **I** | **—** |
| **7** | `accountant` (Comptable) | **R** | **—** | **—** | **C** | **C** *(Factures)* | **—** | **R / A** *(<5k$)* | **—** | **—** | **—** |
| **8** | `buyer` (Acheteur) | **R** | **I** | **—** | **—** | **R** *(PO/2 devis)* | **I** | **C** | **—** | **—** | **—** |
| **9** | `warehouse_keeper` (Magasinier) | **R** | **—** | **—** | **—** | **C** *(Réception)* | **R / A** | **—** | **—** | **—** | **—** |
| **10** | `stewardship` (Intendant) | **R** | **—** | **—** | **—** | **C** | **R** *(EPI/Base)* | **—** | **—** | **C** | **—** |
| **11** | `mechanic` (Chef Atelier) | **R** | **—** | **—** | **—** | **C** *(Pièces)* | **C** | **—** | **R / A** *(Maint.)* | **C** | **—** |
| **12** | `dispatch` (Dispatcher) | **R** | **—** | **—** | **—** | **—** | **—** | **—** | **R / A** *(Missions)*| **C** | **—** |
| **13** | `safety_officer` (QHSE) | **R** | **I** | **C** *(Audit Sécu)*| **—** | **—** | **—** | **—** | **I** | **R / A** | **—** |
| **14** | `commercial` (Ingénieur Commercial) | **R** | **R** *(Offres)* | **—** | **—** | **—** | **—** | **—** | **—** | **—** | **—** |

---

## Synthèse des Verrous de Gestion Inviolables (PostgreSQL & Code)

| Verrou de Contrôle | Rôle Concerné | Implémentation Technique | Règle Métier & Comportement Système |
| :--- | :--- | :--- | :--- |
| **SoD Trésorerie & Caisse (Admin)** | `admin` | Trigger `trg_enforce_sod_cashbox` | L'administrateur système ne peut approuver aucune dépense de caisse pour prévenir tout détournement ou manipulation d'écritures. |
| **Seuil Décaissement $\ge 5\,000\text{ USD}$** | `company_management` | Trigger `trg_enforce_sod_cashbox` | Toute dépense $\ge 5\,000\text{ USD}$ ou contre-valeur CDF au taux officiel exige obligatoirement le visa direct de la Direction Générale. |
| **Zéro Stock Négatif** | `warehouse_keeper` | Trigger `trg_validate_stock_out` | Rejet strict de toute sortie de stock si la quantité requise dépasse le stock physique réel disponible. |
| **Rattachement Chantier Obligatoire** | Tous émetteurs de sortie | Trigger `trg_validate_stock_out` | Aucune marchandise ou matériau ne peut sortir du magasin sans code projet/chantier rattaché. |
| **Inviolabilité Engins en Atelier** | `dispatch` | Trigger `trg_validate_dispatch_vehicle` | Impossible d'affecter un engin à une mission si son statut technique est `under_maintenance` ou `out_of_service`. |
| **Concurrence des 2 Devis Achats** | `buyer` | Validation applicative Next.js 15 & DB | Obligation de renseigner un minimum de deux devis comparatifs complets avant de pouvoir émettre un bon de commande fournisseur (PO). |
| **Contre-Pointage Anti-Travailleurs Fantômes** | `team_leader` & `hr_officer` | Table `attendance_reconciliations` | Détection automatique des discordances entre relevé de front et guérite, avec arbitrage réservé au superviseur de travaux. |

-- ==========================================================
-- SIX SIGMA ERP - SEED DATA SCRIPT
-- Comptes de test pour chaque rôle avec mot de passe : SixSigma2026!
-- ==========================================================

DO $$
DECLARE
    pwd_hash TEXT := crypt('SixSigma2026!', gen_salt('bf', 8));
    u_admin UUID := '11111111-1111-4111-8111-111111111101';
    u_management UUID := '11111111-1111-4111-8111-111111111102';
    u_sitemanager UUID := '11111111-1111-4111-8111-111111111103';
    u_supervisor UUID := '11111111-1111-4111-8111-111111111104';
    u_teamleader UUID := '11111111-1111-4111-8111-111111111105';
    u_hr UUID := '11111111-1111-4111-8111-111111111106';
    u_accountant UUID := '11111111-1111-4111-8111-111111111107';
    u_warehouse UUID := '11111111-1111-4111-8111-111111111108';
    u_stewardship UUID := '11111111-1111-4111-8111-111111111109';
    u_mechanic UUID := '11111111-1111-4111-8111-111111111110';
    u_dispatch UUID := '11111111-1111-4111-8111-111111111111';
    u_safety UUID := '11111111-1111-4111-8111-111111111112';
    u_commercial UUID := '11111111-1111-4111-8111-111111111113';

    p_prj1 UUID := '22222222-2222-4222-8222-222222222201';
    p_prj2 UUID := '22222222-2222-4222-8222-222222222202';
    p_prj3 UUID := '22222222-2222-4222-8222-222222222203';

    i_ciment UUID := '33333333-3333-4333-8333-333333333301';
    i_fer12 UUID := '33333333-3333-4333-8333-333333333302';
    i_fer16 UUID := '33333333-3333-4333-8333-333333333303';
    i_sable UUID := '33333333-3333-4333-8333-333333333304';
    i_gasoil UUID := '33333333-3333-4333-8333-333333333305';
    i_casque UUID := '33333333-3333-4333-8333-333333333306';

    v_benne UUID := '44444444-4444-4444-8444-444444444401';
    v_pelle UUID := '44444444-4444-4444-8444-444444444402';
    v_grue UUID := '44444444-4444-4444-8444-444444444403';
    v_pickup UUID := '44444444-4444-4444-8444-444444444404';
BEGIN
    -- 1. INSERT AUTH USERS
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
        (u_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fabrice Mukendi","role":"admin"}', now(), now()),
        (u_management, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'direction@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Patrick Kalala (DG)","role":"company_management"}', now(), now()),
        (u_sitemanager, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'conducteur.travaux@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ing. Michel Tshilombo","role":"site_manager"}', now(), now()),
        (u_supervisor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chef.chantier@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dieudonné Kasongo","role":"supervisor"}', now(), now()),
        (u_teamleader, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chef.equipe@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alain Mbuyi","role":"team_leader"}', now(), now()),
        (u_hr, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rh@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nathalie Kapinga","role":"hr_officer","sub_role":"payroll"}', now(), now()),
        (u_accountant, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'compta@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Serge Ilunga","role":"accountant"}', now(), now()),
        (u_warehouse, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'magasinier@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Junior Kabeya","role":"warehouse_keeper"}', now(), now()),
        (u_stewardship, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intendance@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Béatrice Mwamba","role":"stewardship"}', now(), now()),
        (u_mechanic, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mecanique@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Lubamba","role":"mechanic"}', now(), now()),
        (u_dispatch, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dispatch@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gaston Banza","role":"dispatch"}', now(), now()),
        (u_safety, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qhse@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sandrine Luvualu","role":"safety_officer"}', now(), now()),
        (u_commercial, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commercial@sixsigma.cd', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eric Mulamba","role":"commercial"}', now(), now())
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- 2. INSERT IDENTITIES FOR PASSWORD AUTH
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES
        (u_admin, u_admin, json_build_object('sub', u_admin, 'email', 'admin@sixsigma.cd'), 'email', 'admin@sixsigma.cd', now(), now(), now()),
        (u_management, u_management, json_build_object('sub', u_management, 'email', 'direction@sixsigma.cd'), 'email', 'direction@sixsigma.cd', now(), now(), now()),
        (u_sitemanager, u_sitemanager, json_build_object('sub', u_sitemanager, 'email', 'conducteur.travaux@sixsigma.cd'), 'email', 'conducteur.travaux@sixsigma.cd', now(), now(), now()),
        (u_supervisor, u_supervisor, json_build_object('sub', u_supervisor, 'email', 'chef.chantier@sixsigma.cd'), 'email', 'chef.chantier@sixsigma.cd', now(), now(), now()),
        (u_teamleader, u_teamleader, json_build_object('sub', u_teamleader, 'email', 'chef.equipe@sixsigma.cd'), 'email', 'chef.equipe@sixsigma.cd', now(), now(), now()),
        (u_hr, u_hr, json_build_object('sub', u_hr, 'email', 'rh@sixsigma.cd'), 'email', 'rh@sixsigma.cd', now(), now(), now()),
        (u_accountant, u_accountant, json_build_object('sub', u_accountant, 'email', 'compta@sixsigma.cd'), 'email', 'compta@sixsigma.cd', now(), now(), now()),
        (u_warehouse, u_warehouse, json_build_object('sub', u_warehouse, 'email', 'magasinier@sixsigma.cd'), 'email', 'magasinier@sixsigma.cd', now(), now(), now()),
        (u_stewardship, u_stewardship, json_build_object('sub', u_stewardship, 'email', 'intendance@sixsigma.cd'), 'email', 'intendance@sixsigma.cd', now(), now(), now()),
        (u_mechanic, u_mechanic, json_build_object('sub', u_mechanic, 'email', 'mecanique@sixsigma.cd'), 'email', 'mecanique@sixsigma.cd', now(), now(), now()),
        (u_dispatch, u_dispatch, json_build_object('sub', u_dispatch, 'email', 'dispatch@sixsigma.cd'), 'email', 'dispatch@sixsigma.cd', now(), now(), now()),
        (u_safety, u_safety, json_build_object('sub', u_safety, 'email', 'qhse@sixsigma.cd'), 'email', 'qhse@sixsigma.cd', now(), now(), now()),
        (u_commercial, u_commercial, json_build_object('sub', u_commercial, 'email', 'commercial@sixsigma.cd'), 'email', 'commercial@sixsigma.cd', now(), now(), now())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- 3. PROFILES UPDATE
    INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, role, sub_role)
    VALUES
        (u_admin, 'admin@sixsigma.cd', 'Fabrice Mukendi', 'Fabrice', 'Mukendi', '+243 81 000 0001', 'admin', NULL),
        (u_management, 'direction@sixsigma.cd', 'Patrick Kalala (DG)', 'Patrick', 'Kalala', '+243 81 000 0002', 'company_management', NULL),
        (u_sitemanager, 'conducteur.travaux@sixsigma.cd', 'Ing. Michel Tshilombo', 'Michel', 'Tshilombo', '+243 81 000 0003', 'site_manager', NULL),
        (u_supervisor, 'chef.chantier@sixsigma.cd', 'Dieudonné Kasongo', 'Dieudonné', 'Kasongo', '+243 81 000 0004', 'supervisor', NULL),
        (u_teamleader, 'chef.equipe@sixsigma.cd', 'Alain Mbuyi', 'Alain', 'Mbuyi', '+243 81 000 0005', 'team_leader', NULL),
        (u_hr, 'rh@sixsigma.cd', 'Nathalie Kapinga', 'Nathalie', 'Kapinga', '+243 81 000 0006', 'hr_officer', 'payroll'),
        (u_accountant, 'compta@sixsigma.cd', 'Serge Ilunga', 'Serge', 'Ilunga', '+243 81 000 0007', 'accountant', NULL),
        (u_warehouse, 'magasinier@sixsigma.cd', 'Junior Kabeya', 'Junior', 'Kabeya', '+243 81 000 0008', 'warehouse_keeper', NULL),
        (u_stewardship, 'intendance@sixsigma.cd', 'Béatrice Mwamba', 'Béatrice', 'Mwamba', '+243 81 000 0009', 'stewardship', NULL),
        (u_mechanic, 'mecanique@sixsigma.cd', 'David Lubamba', 'David', 'Lubamba', '+243 81 000 0010', 'mechanic', NULL),
        (u_dispatch, 'dispatch@sixsigma.cd', 'Gaston Banza', 'Gaston', 'Banza', '+243 81 000 0011', 'dispatch', NULL),
        (u_safety, 'qhse@sixsigma.cd', 'Sandrine Luvualu', 'Sandrine', 'Luvualu', '+243 81 000 0012', 'safety_officer', NULL),
        (u_commercial, 'commercial@sixsigma.cd', 'Eric Mulamba', 'Eric', 'Mulamba', '+243 81 000 0013', 'commercial', NULL)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        sub_role = EXCLUDED.sub_role;

    -- 4. PROJECTS
    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, site_manager_id, status, start_date, end_date, description)
    VALUES
        (p_prj1, 'PRJ-2026-001', 'Construction Pont & Ouvrages Hydrauliques Nsele', 'Ministère des ITPR / ACGT', 'Kinshasa - Nsele', 1450000.00, 'USD', u_sitemanager, 'in_progress', '2026-01-15', '2026-11-30', 'Ouvrage d''art mixte béton armé et tablier métallique pour franchissement fluvial.'),
        (p_prj2, 'PRJ-2026-002', 'Aménagement & Voirie Urbaine Gombe', 'Hôtel de Ville de Kinshasa', 'Kinshasa - Gombe', 820000.00, 'USD', u_sitemanager, 'in_progress', '2026-02-01', '2026-08-30', 'Réfection de 3.8 km de voiries avec caniveaux bétonnés et pose de pavés autobloquants.'),
        (p_prj3, 'PRJ-2026-003', 'Hangar Industriel & Charpente Métallique Maluku', 'Société Industrielle Agro-BTP', 'Kinshasa - Maluku', 540000.00, 'USD', u_sitemanager, 'in_progress', '2026-03-10', '2026-10-15', 'Structure métallique en IPE/HEA portée 30m avec bardage bac alu et dallage lourd.')
    ON CONFLICT (id) DO NOTHING;

    -- 5. PROJECT ASSIGNMENTS
    INSERT INTO public.project_assignments (project_id, supervisor_id, team_leader_id)
    VALUES
        (p_prj1, u_supervisor, u_teamleader),
        (p_prj2, u_supervisor, u_teamleader)
    ON CONFLICT DO NOTHING;

    -- 6. INVENTORY ITEMS
    INSERT INTO public.inventory_items (id, sku, name, category, unit, current_stock, min_threshold, unit_cost, currency)
    VALUES
        (i_ciment, 'MAT-CIM-01', 'Ciment Gris Portland CPJ 42.5', 'Liants & Granulats', 'sac 50kg', 450, 100, 9.50, 'USD'),
        (i_fer12, 'MAT-ACR-12', 'Fer à béton torsadé haute adhérence Ø12mm', 'Armatures & Acier', 'tonne', 18.5, 5.0, 1150.00, 'USD'),
        (i_fer16, 'MAT-ACR-16', 'Fer à béton torsadé haute adhérence Ø16mm', 'Armatures & Acier', 'tonne', 8.0, 4.0, 1180.00, 'USD'),
        (i_sable, 'MAT-GRA-01', 'Sable fluvial lavé calibré 0/4', 'Liants & Granulats', 'm3', 120, 30, 28.00, 'USD'),
        (i_gasoil, 'LOG-CAR-01', 'Carburant Gasoil Diesel pour engins', 'Hydrocarbures', 'litre', 2400, 500, 1.45, 'USD'),
        (i_casque, 'EPI-SEC-01', 'Casque de chantier haute résistance norme EN 397', 'EPI & Sécurité', 'pièce', 85, 20, 12.00, 'USD')
    ON CONFLICT (id) DO NOTHING;

    -- 7. DAILY SITE REPORTS
    INSERT INTO public.daily_site_reports (project_id, supervisor_id, report_date, weather, workforce_count, activities_summary, issues_and_delays, safety_observations, status, validated_by, validation_notes, validated_at)
    VALUES
        (p_prj1, u_supervisor, CURRENT_DATE, 'Ensoleillé (31°C)', 34, 'Coulage du béton de propreté sur la pile P2. Ferraillage de la culée rive droite terminé à 100%. Réception des armatures Ø16mm.', 'Léger retard de 45 minutes sur la livraison de la toupie à béton en raison des embouteillages Boulevard Lumumba.', 'Quart d''heure de sécurité QHSE tenu à 07h30 par Sandrine Luvualu. Port des harnais vérifié pour les travaux sur échafaudages.', 'submitted', NULL, NULL, NULL),
        (p_prj2, u_supervisor, CURRENT_DATE - INTERVAL '1 day', 'Nuageux avec éclaircies', 22, 'Terrassement de la plateforme PK 1+200 à 1+600. Pose des bordures T2 sur 150 mètres linéaires.', 'Aucun incident majeur.', 'Balisage de la zone de chantier conforme et signaleurs présents.', 'validated', u_sitemanager, 'Travaux conformes au planning. Continuer le compactage par couches successives.', now() - INTERVAL '12 hours')
    ON CONFLICT DO NOTHING;

    -- 8. TIME ENTRIES (Attendance)
    INSERT INTO public.time_entries (project_id, profile_id, worker_name, worker_function, entry_date, status, check_in, check_out, overtime_hours, supervisor_id, notes)
    VALUES
        (p_prj1, NULL, 'Kabongo Mwamba', 'Ferrailleur principal', CURRENT_DATE, 'present', '07:30', '16:30', 1.5, u_supervisor, 'Heures sup pour finalisation ferraillage culée'),
        (p_prj1, NULL, 'Kasalu Jean-Claude', 'Coffreur bois/métal', CURRENT_DATE, 'present', '07:25', '16:00', 1.0, u_supervisor, 'Montage coffrage pile P2'),
        (p_prj1, NULL, 'Bokungu Eric', 'Opérateur grue / Grutier', CURRENT_DATE, 'present', '07:15', '16:00', 0.5, u_supervisor, 'Déchargement des fers et paniers d''armature'),
        (p_prj1, NULL, 'Mbuyi Tshimanga', 'Manœuvre polyvalent', CURRENT_DATE, 'late', '08:15', '16:00', 0.0, u_supervisor, 'Arrivée 45 min retard suite panne taxi-bus'),
        (p_prj1, NULL, 'Lutumba Roger', 'Soudeur qualifié TIG/Arc', CURRENT_DATE, 'present', '07:30', '16:00', 2.0, u_supervisor, 'Soudure des plaques d''ancrage métallique'),
        (p_prj2, NULL, 'Banyingela Paul', 'Conducteur compacteur', CURRENT_DATE, 'present', '07:30', '16:00', 0.0, u_supervisor, 'Compactage plateforme')
    ON CONFLICT DO NOTHING;

    -- 9. MATERIAL REQUISITIONS (DRI)
    INSERT INTO public.material_requisitions (requisition_number, project_id, requested_by, site_manager_id, status, items, urgent, supervisor_comment, validation_comment, approved_at)
    VALUES
        ('DRI-2026-001', p_prj1, u_supervisor, u_sitemanager, 'submitted', '[{"item_name":"Ciment Gris CPJ 42.5","quantity":200,"unit":"sac","justification":"Coulage massif pile P2 prévu ce jeudi"},{"item_name":"Gasoil Engins","quantity":500,"unit":"litre","justification":"Alimentation pelleteuse et groupe électrogène"}]'::jsonb, true, 'Urgent pour respecter la date de coulage du radier.', NULL, NULL),
        ('DRI-2026-002', p_prj2, u_supervisor, u_sitemanager, 'site_manager_approved', '[{"item_name":"Bordures béton T2","quantity":300,"unit":"ml","justification":"Linéaire caniveaux tronçon 2"},{"item_name":"Gilet haute visibilité","quantity":15,"unit":"pièce","justification":"Renouvellement équipe voirie"}]'::jsonb, false, 'Demande de réapprovisionnement standard.', 'Validé après vérification du métré par Ing. Michel Tshilombo.', now() - INTERVAL '6 hours')
    ON CONFLICT (requisition_number) DO NOTHING;

    -- 10. FLEET VEHICLES
    INSERT INTO public.fleet_vehicles (id, plate_number, model, vehicle_type, status, current_mileage, assigned_driver, last_maintenance_date)
    VALUES
        (v_benne, 'KN-4821-BG', 'Mercedes Actros 3340 (Benne 16m³)', 'Camion Benne', 'available', 68450, 'M. André Lukoki', CURRENT_DATE - INTERVAL '15 days'),
        (v_pelle, 'ENG-CAT-320', 'Caterpillar 320D Chenilles', 'Pelleteuse', 'in_mission', 4210, 'M. José Kalala', CURRENT_DATE - INTERVAL '30 days'),
        (v_grue, 'GRU-SANY-50', 'SANY SPC500 Mobile 50T', 'Grue mobile', 'available', 18900, 'M. Eric Bokungu', CURRENT_DATE - INTERVAL '10 days'),
        (v_pickup, 'KN-9124-BH', 'Toyota Hilux 4x4 Double Cabine', 'Pick-up Chantier', 'available', 114200, 'Ing. Michel Tshilombo', CURRENT_DATE - INTERVAL '5 days')
    ON CONFLICT (id) DO NOTHING;

    -- 11. DISPATCH MISSIONS
    INSERT INTO public.dispatch_missions (vehicle_id, driver_name, project_id, departure_place, destination, cargo_description, departure_date, return_date, fuel_consumed_liters, status)
    VALUES
        (v_benne, 'André Lukoki', p_prj1, 'Dépôt Central Limete', 'Chantier Pont Nsele', 'Livraison 15 tonnes sable concassé 0/4', now() - INTERVAL '3 hours', NULL, 35.0, 'in_transit'),
        (v_pickup, 'Michel Tshilombo', p_prj2, 'Siège Social Gombe', 'Chantier Voirie Gombe', 'Visite d''inspection technique & réunions riverains', now() - INTERVAL '1 day', now() - INTERVAL '20 hours', 12.0, 'completed')
    ON CONFLICT DO NOTHING;

    -- 12. CASHBOX TRANSACTIONS (USD & CDF)
    INSERT INTO public.cashbox_transactions (cashbox_type, project_id, transaction_type, amount, currency, exchange_rate, category, description, created_by, validated_by, requires_management_approval)
    VALUES
        ('site', p_prj1, 'EXPENSE', 1250.00, 'USD', 2850.0, 'Pièces de rechange', 'Remplacement flexible hydraulique haute pression sur pelleteuse CAT 320', u_supervisor, u_sitemanager, false),
        ('site', p_prj1, 'EXPENSE', 1425000.00, 'CDF', 2850.0, 'Main d''œuvre locale', 'Paie hebdomadaire de 10 manœuvres journaliers de Nsele (équiv. 500 USD)', u_supervisor, u_sitemanager, false),
        ('central', NULL, 'INCOME', 25000.00, 'USD', 2850.0, 'Acompte client', 'Encaissement acompte démarrage PRJ-2026-003 Charpente Maluku', u_accountant, u_management, false),
        ('central', p_prj1, 'EXPENSE', 7200.00, 'USD', 2850.0, 'Matériel lourd', 'Achat groupe électrogène insonorisé SDMO 100kVA pour centrale à béton', u_accountant, NULL, true)
    ON CONFLICT DO NOTHING;

END $$;

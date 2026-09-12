-- ====================================================================
-- MIGRATION: AJOUT DU RÔLE OUVRIER / EMPLOYÉ SIMPLE ('worker')
-- ====================================================================

-- 1. Ajouter la valeur 'worker' à l'enum PostgreSQL user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'worker';

-- 2. Ajouter les champs spécifiques aux ouvriers/journaliers sur public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_rate numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_category text DEFAULT 'Manœuvre';

-- 3. Index pour optimiser le filtrage par métier et affectation
CREATE INDEX IF NOT EXISTS idx_profiles_role_worker ON public.profiles(role) WHERE role = 'worker';
CREATE INDEX IF NOT EXISTS idx_profiles_trade_category ON public.profiles(trade_category);

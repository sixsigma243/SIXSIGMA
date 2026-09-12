export type UserRole =
  | 'admin'
  | 'company_management'
  | 'site_manager'
  | 'supervisor'
  | 'team_leader'
  | 'hr_officer'
  | 'accountant'
  | 'buyer'
  | 'warehouse_keeper'
  | 'stewardship'
  | 'mechanic'
  | 'dispatch'
  | 'safety_officer'
  | 'commercial';

export type CurrencyCode = 'USD' | 'CDF';
export type ProjectStatus = 'draft' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type RequisitionStatus = 'draft' | 'submitted' | 'approved' | 'site_manager_approved' | 'rejected' | 'delivered' | 'fulfilled';
export type VehicleStatus = 'available' | 'in_mission' | 'under_maintenance' | 'out_of_service';
export type PresenceStatus = 'present' | 'late' | 'absent' | 'leave';
export type ReportStatus = 'draft' | 'submitted' | 'validated' | 'rejected';
export type EPIStatus = 'assigned' | 'worn_out' | 'lost' | 'damaged';
export type ORStatus = 'draft' | 'diagnosing' | 'waiting_parts' | 'in_repair' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  sub_role?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  contract_end_date?: string | null;
  id_expiry_date?: string | null;
  employee_id?: string | null;
  job_title?: string | null;
  base_salary?: number;
  id_card_number?: string | null;
  contract_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  client_name: string;
  location: string;
  budget: number;
  budget_allocated_usd?: number;
  budget_allocated_cdf?: number;
  currency: CurrencyCode;
  site_manager_id: string | null;
  status: ProjectStatus;
  approval_status?: 'approved' | 'pending_approval' | 'rejected';
  created_by?: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  site_manager?: Profile | null;
  creator?: Profile | null;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  supervisor_id: string | null;
  team_leader_id: string | null;
  assigned_at: string;
  project?: Project;
  supervisor?: Profile;
  team_leader?: Profile;
}

export interface DailySiteReport {
  id: string;
  project_id: string;
  supervisor_id: string | null;
  report_date: string;
  weather: string | null;
  workforce_count: number;
  activities_summary: string;
  issues_and_delays: string | null;
  safety_observations: string | null;
  status: ReportStatus;
  validated_by: string | null;
  validation_notes: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  supervisor?: Profile;
  validator?: Profile;
}

export interface TimeEntry {
  id: string;
  project_id: string | null;
  profile_id: string | null;
  worker_name: string;
  worker_function: string | null;
  entry_date: string;
  status: PresenceStatus;
  check_in: string | null;
  check_out: string | null;
  overtime_hours: number;
  supervisor_id: string | null;
  notes: string | null;
  created_at: string;
  project?: Project;
  profile?: Profile;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  unit_cost: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference_doc: string | null;
  project_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  item?: InventoryItem;
  project?: Project;
  performer?: Profile;
}

export interface RequisitionItem {
  item_name: string;
  quantity: number;
  unit: string;
  justification?: string;
}

export interface SupplierQuote {
  supplier_name: string;
  amount: number;
  currency: CurrencyCode;
  selected?: boolean;
}

export interface MaterialRequisition {
  id: string;
  requisition_number: string;
  project_id: string;
  requested_by: string | null;
  site_manager_id: string | null;
  status: RequisitionStatus;
  items: RequisitionItem[];
  urgent: boolean;
  supervisor_comment: string | null;
  validation_comment: string | null;
  po_number?: string | null;
  supplier_name?: string | null;
  po_amount?: number | null;
  supplier_quotes?: SupplierQuote[] | null;
  approved_at: string | null;
  delivered_by?: string | null;
  delivered_at?: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  requester?: Profile;
  site_manager?: Profile;
}

export interface AttendanceReconciliation {
  id: string;
  project_id: string | null;
  worker_name: string;
  worker_function: string | null;
  reconciliation_date: string;
  team_leader_status: PresenceStatus;
  pointer_status: PresenceStatus;
  arbitrated_status: PresenceStatus | null;
  supervisor_id: string | null;
  arbitrated_at: string | null;
  notes: string | null;
  status: 'pending' | 'resolved';
  created_at: string;
  project?: Project;
  supervisor?: Profile;
}

export interface FleetVehicle {
  id: string;
  plate_number: string;
  model: string;
  vehicle_type: string;
  status: VehicleStatus;
  current_mileage: number;
  assigned_driver: string | null;
  last_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchMission {
  id: string;
  vehicle_id: string | null;
  driver_name: string;
  driver_license_expiry?: string | null;
  driver_profile_id?: string | null;
  project_id: string | null;
  departure_place: string;
  destination: string;
  cargo_description: string | null;
  departure_date: string;
  return_date: string | null;
  fuel_consumed_liters: number;
  status: 'planned' | 'in_transit' | 'completed' | 'cancelled';
  created_at: string;
  vehicle?: FleetVehicle;
  project?: Project;
  driver_profile?: Profile;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  performed_by: string | null;
  performed_at: string;
  performer?: Profile | null;
}

export interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  total_gross?: number;
  total_net?: number;
  total_deductions?: number;
  currency?: CurrencyCode;
  status?: 'draft' | 'calculated' | 'transmitted_to_finance' | 'paid';
  transmitted_at?: string | null;
  finance_transaction_id?: string | null;
  created_at: string;
  locker?: Profile | null;
}

export interface PayrollItem {
  id: string;
  period_id: string;
  profile_id: string;
  worker_name: string;
  days_worked: number;
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  currency: CurrencyCode;
  created_at: string;
  profile?: Profile;
}

export type HrRequestType = 'sanction' | 'recruitment' | 'promotion' | 'contract_termination' | 'inquiry';
export type HrRequestStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface HrRequest {
  id: string;
  sender_id: string;
  target_user_id?: string | null;
  type: HrRequestType;
  subject: string;
  description: string;
  hr_opinion?: string | null;
  decision_report?: string | null;
  status: HrRequestStatus;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  target_user?: Profile;
}

export type CommercialActivityType = 'call' | 'meeting' | 'site_visit' | 'proposal_sent' | 'follow_up' | 'negotiation';
export type CommercialActivityStatus = 'in_progress' | 'won' | 'lost' | 'postponed';

export interface CommercialActivity {
  id: string;
  commercial_id: string;
  client_name: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  activity_type: CommercialActivityType;
  subject: string;
  notes: string;
  estimated_deal_value?: number;
  currency?: CurrencyCode;
  next_follow_up_date?: string | null;
  status: CommercialActivityStatus;
  project_id?: string | null;
  created_at: string;
  updated_at: string;
  commercial?: Profile;
  project?: Project;
}

export interface CashboxTransaction {
  id: string;
  cashbox_type: 'central' | 'site';
  project_id: string | null;
  transaction_type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  currency: CurrencyCode;
  exchange_rate: number;
  category: string;
  description: string;
  beneficiary?: string | null;
  payment_method?: 'cash' | 'check' | 'wire' | 'airtel_money' | 'm_pesa' | string;
  receipt_url: string | null;
  created_by: string | null;
  validated_by: string | null;
  validated_at?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | string;
  requires_management_approval: boolean;
  created_at: string;
  project?: Project;
  creator?: Profile;
  validator?: Profile;
}

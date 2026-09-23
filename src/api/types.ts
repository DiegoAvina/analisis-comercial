export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Bill {
  id: number;
  name: string;
  provider: string | null;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  category: string | null;
  auto_debit: boolean;
  is_paid: boolean;
  is_overdue: boolean;
  days_until_due: number | null;
  status_text: string | null;
  paid_at: string | null;
}

export interface Expense {
  id: number;
  date: string;
  amount: number;
  type: string;
  source_id: number | null;
  description: string | null;
  created_at: string;
}

export interface SavingGoalParticipant extends User {
  pivot?: {
    role: 'owner' | 'member';
    expected_contribution: number | null;
  };
}

export interface SavingGoal {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  is_group: boolean;
  status: 'active' | 'completed';
  progress_percent: number;
  participants?: SavingGoalParticipant[];
}

export interface TandaMember extends User {
  pivot?: {
    turn_order: number;
    has_received: boolean;
    received_at: string | null;
  };
}

export interface TandaPayment {
  id: number;
  tanda_id: number;
  user_id: number;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  notes: string | null;
}

export interface Tanda {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  contribution_amount: number;
  num_members: number;
  rounds_total: number | null;
  pot_amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  current_round: number;
  next_payment_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  progress_percent: number;
  members?: TandaMember[];
  payments?: TandaPayment[];
}

export type IncomeType =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'sale'
  | 'investment'
  | 'bonus'
  | 'gift'
  | 'refund'
  | 'other';

export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'irregular';

export type IncomeOccurrenceStatus = 'expected' | 'received' | 'partial' | 'missed' | 'cancelled';

export interface IncomeSource {
  id: number;
  user_id: number;
  name: string;
  type: IncomeType;
  type_label: string;
  default_amount: number | null;
  estimated_min_amount: number | null;
  estimated_max_amount: number | null;
  frequency: IncomeFrequency | null;
  is_recurring: boolean;
  active: boolean;
  notes: string | null;
  occurrences_count?: number;
  occurrences?: IncomeOccurrence[];
  rules?: IncomeDistributionRule[];
}

export interface IncomeOccurrence {
  id: number;
  income_source_id: number;
  user_id: number;
  expected_amount: number;
  received_amount: number | null;
  applied_amount: number;
  remaining_amount: number;
  is_overdue: boolean;
  expected_date: string;
  received_date: string | null;
  status: IncomeOccurrenceStatus;
  weekly_income_id: number | null;
  notes: string | null;
  source?: Pick<IncomeSource, 'id' | 'name' | 'type' | 'type_label'>;
}

export type DistributionTargetType = 'saving_goal' | 'tanda' | 'bill' | 'free';

export interface IncomeDistributionRule {
  id: number;
  income_source_id: number;
  target_type: DistributionTargetType;
  target_id: number | null;
  mode: 'percent' | 'fixed';
  value: number;
  order: number;
  active: boolean;
}

export interface DistributionPreviewLine {
  rule_id: number;
  target_type: DistributionTargetType;
  target_id: number | null;
  target_label: string | null;
  mode: 'percent' | 'fixed';
  amount: number;
}

export interface DistributionPreview {
  occurrence_id: number;
  total: number;
  lines: DistributionPreviewLine[];
}

export interface DashboardData {
  savings: { total: number; monthly_change: number };
  bills: {
    pending_count: number;
    paid_this_month: number;
    next: Array<Pick<Bill, 'id' | 'name' | 'due_date' | 'status'> & { amount: number }>;
  };
  goals: Array<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    progress_percent: number;
    deadline: string | null;
    status: string;
    is_group: boolean;
  }>;
  tandas: {
    active_count: number;
    next_payment: Pick<Tanda, 'id' | 'name' | 'next_payment_date' | 'contribution_amount'> | null;
  };
  calendar: {
    upcoming_events: Array<{ id: number; title: string; date: string; type: string; amount: number | null }>;
    daily_expenses: Array<{ date: string; total: number }>;
  };
  income: {
    weekly_income: number;
    spent_this_week: number;
    available_this_week: number;
  };
  incomes: {
    received_this_month: number;
    expected_this_month: number;
    pending_this_month: number;
    next_income:
      | (Pick<IncomeOccurrence, 'id' | 'income_source_id' | 'expected_amount' | 'expected_date'> & {
          source?: Pick<IncomeSource, 'id' | 'name' | 'type'>;
        })
      | null;
  };
  projection: {
    current_balance: number;
    upcoming_income: number;
    upcoming_commitments: number;
    projected_balance: number;
  };
}

export interface CalendarEvent {
  source: 'bill' | 'tanda' | 'saving_goal' | 'manual';
  source_id: number;
  date: string;
  title: string;
  amount: number;
  status: string;
  meta: Record<string, unknown>;
}

export interface CalendarResponse {
  range: { start: string; end: string };
  events: CalendarEvent[];
  daily_expenses: Array<{ date: string; total: number }>;
}

export interface MonthlySummaryEntry {
  month: string; // "YYYY-MM"
  expenses_total: number;
  income_received: number;
  bills_paid: number;
}

export interface MonthlySummaryResponse {
  months: MonthlySummaryEntry[];
}

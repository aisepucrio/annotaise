export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  account_type: 'standard' | 'editor' | 'admin';
  onboarding_status?: 'pending' | 'active';
  date_joined: string;
  projects_count?: number;
  labelings_total?: number;
  answers_count?: number;
  pending_items_count?: number;
};

export type CreateUserPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  account_type: User['account_type'];
};

export type CreateInvitationPayload = {
  email: string;
  account_type: User['account_type'];
  email_language?: 'pt-BR' | 'en';
  project_ids?: number[];
  labeling_ids?: number[];
};

export type UpdateUserPayload = Partial<{
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  account_type: User['account_type'];
  is_active: boolean;
}>;

export type Invitation = {
  token: string;
  email: string;
  role: User['account_type'];
  created_at: string;
  expires_at: string;
  is_used: boolean;
  is_expired?: boolean;
  invited_by?: number | null;
  invited_by_email?: string | null;
};

export type InvitationAssignmentLabeling = {
  id: number;
  title: string;
};

export type InvitationAssignmentProject = {
  id: number;
  name: string;
  labelings: InvitationAssignmentLabeling[];
};

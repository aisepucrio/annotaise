export type ProjectStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export type Project = {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  created_by: number;
};

export type ProjectPayload = {
  name: string;
  description?: string;
  status?: ProjectStatus;
};

export type ProjectDashboard = {
  id: number;
  name: string;
  labeling_users: number;
  finished_labelings: number;
  pending_labelings: number;
  late_labelings: number;
};

export type ProjectMembershipRole = 'owner' | 'contributor' | 'viewer';

export type ProjectMembership = {
  id: number;
  project: number;
  user: number;
  role: ProjectMembershipRole;
  joined_at: string;
  user_detail?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
  };
};

export type ProjectMembershipPayload = {
  project: number;
  user: number;
  role: ProjectMembershipRole;
};

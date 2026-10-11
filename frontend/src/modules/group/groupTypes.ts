export type UserGroup = {
  id: number;
  name: string;
  description?: string;
  created_by?: number | null;
};

export type UserGroupMembership = {
  id: number;
  user: number;
  group: number;
  joined_at: string;
};

export type UserGroupChangesPayload = {
  // IDs of existing groups the user should be added to.
  groupIds: number[];
  // Names of groups that don't exist yet and must be created before insertion.
  newGroupNames: string[];
  // IDs of current memberships that should be removed.
  removedMembershipIds: number[];
};

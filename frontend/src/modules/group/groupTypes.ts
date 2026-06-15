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
  // IDs de grupos já existentes em que o usuário deve ser inserido.
  groupIds: number[];
  // Nomes de grupos que ainda não existem e devem ser criados antes da inserção.
  newGroupNames: string[];
  // IDs das associações (memberships) atuais que devem ser removidas.
  removedMembershipIds: number[];
};

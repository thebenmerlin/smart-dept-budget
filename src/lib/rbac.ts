// Role-Based Access Control utilities
// Note: We use custom JWT auth, not next-auth

export type Role = 'admin' | 'hod' | 'staff';

export interface Permission {
  create:  boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  manageUsers: boolean;
  manageBudgets: boolean;
  viewReports: boolean;
  downloadReports: boolean;
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  admin: {
    create: true,
    read: true,
    update: true,
    delete: true,
    approve:  true,
    manageUsers: true,
    manageBudgets: true,
    viewReports:  true,
    downloadReports: true,
  },
  hod: {
    create: true,
    read: true,
    update:  true,
    delete: false,
    approve:  true,
    manageUsers: false,
    manageBudgets: true,
    viewReports: true,
    downloadReports:  true,
  },
  staff: {
    create: true,
    read:  true,
    update: false,
    delete:  false,
    approve: false,
    manageUsers: false,
    manageBudgets: false,
    viewReports: true,
    downloadReports: false,
  },
};

// Check if a role has a specific permission
export function hasPermission(role: Role, permission: keyof Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ?  permissions[permission] :  false;
}

// Check if a role is allowed to perform an action
export function canPerformAction(role: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role];
  if (!permissions) return false;

  const actionMap: Record<string, keyof Permission> = {
    create: 'create',
    read: 'read',
    update:  'update',
    delete: 'delete',
    approve: 'approve',
    manage_users: 'manageUsers',
    manage_budgets:  'manageBudgets',
    view_reports: 'viewReports',
    download_reports:  'downloadReports',
  };

  const permissionKey = actionMap[action];
  return permissionKey ?  permissions[permissionKey] : false;
}

// Check if user can access a resource
export function canAccessResource(
  userRole: Role,
  resourceOwnerId: number,
  userId: number,
  action: 'read' | 'update' | 'delete'
): boolean {
  // Admins can access everything
  if (userRole === 'admin') return true;

  // HODs can read and update everything in their department
  if (userRole === 'hod' && (action === 'read' || action === 'update')) return true;

  // Staff can only access their own resources
  if (userRole === 'staff') {
    return resourceOwnerId === userId;
  }

  return false;
}

// Get allowed actions for a role
export function getAllowedActions(role: Role): string[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return [];

  const actions:  string[] = [];
  
  if (permissions.create) actions.push('create');
  if (permissions.read) actions.push('read');
  if (permissions.update) actions.push('update');
  if (permissions. delete) actions.push('delete');
  if (permissions.approve) actions.push('approve');
  if (permissions.manageUsers) actions.push('manage_users');
  if (permissions.manageBudgets) actions.push('manage_budgets');
  if (permissions.viewReports) actions.push('view_reports');
  if (permissions.downloadReports) actions.push('download_reports');

  return actions;
}
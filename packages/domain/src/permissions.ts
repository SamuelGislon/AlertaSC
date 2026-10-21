export type OperatorRole = 'ADMIN' | 'OPERATOR';

export type Permission =
  | 'ALERT_TAB_ACCESS'
  | 'ALERT_READ'
  | 'ALERT_EDIT'
  | 'ALERT_APPROVE'
  | 'ALERT_REJECT'
  | 'USER_MANAGE'
  | 'CITIZEN_MANAGE'
  | 'AUDIT_READ';

const ROLE_PERMISSIONS: Record<OperatorRole, ReadonlySet<Permission>> = {
  ADMIN: new Set([
    'ALERT_TAB_ACCESS', 'ALERT_READ', 'ALERT_EDIT', 'ALERT_APPROVE', 'ALERT_REJECT',
    'USER_MANAGE', 'CITIZEN_MANAGE', 'AUDIT_READ',
  ]),
  OPERATOR: new Set(['ALERT_TAB_ACCESS', 'ALERT_READ', 'ALERT_EDIT', 'ALERT_APPROVE', 'ALERT_REJECT']),
};

export function hasPermission(roles: readonly OperatorRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.has(permission) ?? false);
}

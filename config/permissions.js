/**
 * 🛡️ PCMS Clinical Permission Master Registry
 * Each key represents a granular clinical action.
 */
const PERMISSIONS = {
  PATIENTS: {
    VIEW: 'patients:view',
    CREATE: 'patients:create',
    EDIT: 'patients:edit',
    DELETE: 'patients:delete',
  },
  APPOINTMENTS: {
    VIEW: 'appointments:view',
    CREATE: 'appointments:create',
    EDIT: 'appointments:edit',
    CANCEL: 'appointments:cancel',
  },
  DOCTORS: {
    VIEW: 'doctors:view',
    CREATE: 'doctors:create',
    EDIT: 'doctors:edit',
    DELETE: 'doctors:delete',
  },
  BILLING: {
    VIEW: 'billing:view',
    CREATE: 'billing:create',
    EDIT: 'billing:edit',
    VOID: 'billing:void',
  },
  SERVICES: {
    VIEW: 'services:view',
    CREATE: 'services:create',
    EDIT: 'services:edit',
    DELETE: 'services:delete',
    PRICING: 'services:pricing_edit',
  },
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    EDIT: 'users:edit',
    DELETE: 'users:delete',
  },
  ROLES: {
    VIEW: 'roles:view',
    CREATE: 'roles:create',
    EDIT: 'roles:edit',
    DELETE: 'roles:delete',
  },
  EXPENSES: {
    VIEW: 'expenses:view',
    CREATE: 'expenses:create',
    EDIT: 'expenses:edit',
    VOID: 'expenses:void',
  },
  INVENTORY: {
    VIEW: 'inventory:view',
    CREATE: 'inventory:create',
    EDIT: 'inventory:edit',
    VOID: 'inventory:void',
  },
  OPERATIONS: {
    VIEW: 'operations:view',
    CREATE: 'operations:create',
    EDIT: 'operations:edit',
    DELETE: 'operations:delete',
  },
  DASHBOARD: {
    VIEW_STATS: 'dashboard:view_stats',
    VIEW_REVENUE: 'dashboard:view_revenue',
  }
};

export default PERMISSIONS;

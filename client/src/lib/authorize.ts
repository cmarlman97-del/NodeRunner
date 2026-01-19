import type { TenantId, UserId } from "@/types/ids";

export type Resource = 'contacts' | 'pipeline' | 'tasks';
export type Action = 'read' | 'create' | 'update' | 'delete' | 'move_stage';

export interface AuthUser {
  userId: UserId;
  tenantId: TenantId;
  role: 'admin' | 'manager' | 'contributor' | 'viewer';
}

export function can(user: AuthUser, resource: Resource, action: Action, record?: unknown): boolean {
  // Stub implementation - returns true for now
  // Future: implement role-based authorization logic
  return true;
}

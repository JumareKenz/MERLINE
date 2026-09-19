/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * The shape `JwtStrategy.validate()` puts on `request.user`.
 *
 * Promoted out of `auth.controller.ts`, where it was a local interface, so
 * that controllers can type `@CurrentUser()` instead of falling back to `any`.
 * That matters here specifically: `user.organizationId` is now the only
 * trusted source of the tenant, and `any` would let a typo silently produce
 * `undefined` and widen a query to every organization.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

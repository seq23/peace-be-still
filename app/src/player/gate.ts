// Stand-in for lane 2A's gates: same signature and feature name. When 2A lands this file becomes
// `export { canUse, FEATURES } from '../gates';` and nothing else changes.
export const FEATURES = { OFFLINE: 'offline' } as const;
export type User = { paid?: boolean } | null | undefined;
export function canUse(feature: string, user: User): boolean {
  return feature === FEATURES.OFFLINE && user?.paid === true;
}

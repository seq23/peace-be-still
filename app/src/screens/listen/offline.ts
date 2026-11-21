import { canUse, type User } from '../../gates';
import { createDownloads } from '../../player/downloads';
import { expoDownloadFiles } from '../../player/adapters';
import type { Track } from '../../player/library';
import { usePurchases } from '../../purchases/provider';

/** Paid status from lane 5S's PurchasesProvider, the one entitlement every screen reads. */
export function useOffline(age: User['age']): User {
  return { age, paid: usePurchases().paid };
}

export function downloadAvailable(track: Track, user: User): boolean {
  if (!canUse('offline', user)) return false;
  try {
    return !!createDownloads(expoDownloadFiles()).find(track);
  } catch {
    return false;
  }
}

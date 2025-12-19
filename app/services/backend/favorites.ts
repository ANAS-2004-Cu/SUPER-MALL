import type { FavoritesOptions } from './backend';
import {
  getFavorites as backend_getFavorites,
  toggleFavorite as backend_toggleFavorite,
} from './backend';

/**
 * Load or subscribe to a user's favorite product ids.
 * @param userId Firebase Auth uid.
 * @param options Subscription configuration.
 * @returns {Promise<string[]> | (() => void)} Resolved favorites or unsubscribe handle.
 */
export function getFavorites(
  userId: string,
  options?: FavoritesOptions,
): Promise<string[]> | (() => void) {
  // TODO: Normalize product ids to strings before returning to the UI.
  return backend_getFavorites(userId, options);
}

/**
 * Toggle the presence of a product id within the user's favorites list.
 * @param userId Firebase Auth uid.
 * @param productId Target product id.
 * @returns {Promise<{ success: boolean; newStatus?: boolean; error?: string }>}
 */
export async function toggleFavorite(
  userId: string,
  productId: string,
): Promise<{ success: boolean; newStatus?: boolean; error?: string }> {
  // TODO: Surface telemetry when repeated failures occur for the same product.
  return backend_toggleFavorite(userId, productId);
}

import type { OrderRecord } from './backend';
import {
  getOrders as backend_getOrders,
  getUserProfile as backend_getUserProfile,
  isUsernameAvailable as backend_isUsernameAvailable,
  updateUserProfile as backend_updateUserProfile,
} from './backend';

/**
 * Fetch the Firestore profile document for the specified user identifier.
 * @param userId Firebase Auth uid to look up.
 * @returns {Promise<Record<string, any> | null>} Profile payload or null when not found.
 */
export async function getUserProfile(userId: string): Promise<Record<string, any> | null> {
  // TODO: Extend to include optimistic cache hydration if needed by UI.
  return backend_getUserProfile(userId);
}

/**
 * Update mutable profile fields on the backend (e.g., username or avatar).
 * @param userId Firebase Auth uid.
 * @param updates Partial payload containing updated fields.
 * @returns {Promise<{ success: boolean; error?: string }>} Operation result.
 */
export async function updateUserProfile(
  userId: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Map UI-specific field names to backend schema before dispatching.
  return backend_updateUserProfile(userId, updates);
}

/**
 * Determine whether the provided username is available for registration.
 * @param username Desired username string.
 * @returns {Promise<boolean>} True when username is unused.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  // TODO: Apply locale-aware normalization before checking availability.
  return backend_isUsernameAvailable(username);
}

/**
 * Retrieve the historical order list stored on the user document.
 * @param userId Firebase Auth uid.
 * @returns {Promise<OrderRecord[]>} Chronological list of orders.
 */
export async function getOrders(userId: string): Promise<OrderRecord[]> {
  // TODO: Support pagination when Orders grows beyond in-memory limits.
  return backend_getOrders(userId);
}

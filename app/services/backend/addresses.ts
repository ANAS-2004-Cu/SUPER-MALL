import type { UserAddress } from './backend';
import {
  addUserAddress as backend_addUserAddress,
  getUserAddresses as backend_getUserAddresses,
  updateUserAddress as backend_updateUserAddress,
  updateUserAddresses as backend_updateUserAddresses,
} from './backend';

/**
 * Fetch every saved shipping address for the provided user id.
 * @param userId Firebase Auth uid that owns the addresses.
 * @returns {Promise<UserAddress[]>} Ordered list of stored addresses.
 */
export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  // TODO: Add client-side memoization once address forms become multi-step.
  return backend_getUserAddresses(userId);
}

/**
 * Insert a new address record for the current user.
 * @param address Address payload supplied by the UI.
 * @returns {Promise<{ success: boolean; error?: string }>} Backend persistence result.
 */
export async function addUserAddress(
  address: UserAddress,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Normalize phone numbers before persisting to Firestore.
  return backend_addUserAddress(address);
}

/**
 * Update a single address entry in place.
 * @param address Address entity with id field populated.
 * @returns {Promise<{ success: boolean; error?: string }>} Backend update result.
 */
export async function updateUserAddress(
  address: UserAddress,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Validate that the address belongs to the active user prior to update.
  return backend_updateUserAddress(address);
}

/**
 * Replace the complete list of addresses for a user (bulk update helper).
 * @param userId Firebase Auth uid.
 * @param addresses Ordered list of addresses to persist.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateUserAddresses(
  userId: string,
  addresses: UserAddress[],
): Promise<{ success: boolean; error?: string }> {
  // TODO: Enforce exactly one default address before syncing to Firestore.
  return backend_updateUserAddresses(userId, addresses);
}

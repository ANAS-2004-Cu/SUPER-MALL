import type { CartOperationInput, CartOperationResult, CartQueryOptions } from './backend';
import {
  clearCart as backend_clearCart,
  getCart as backend_getCart,
  queueCartOperation as backend_queueCartOperation,
  removeCartItem as backend_removeCartItem,
} from './backend';

/**
 * Fetch a snapshot of the user's cart along with helper metadata.
 * @param userId Firebase Auth uid.
 * @param options Optional filters (e.g., focus on a specific product id).
 * @returns {Promise<{ items: import('./backend').CartItem[]; hasProduct: boolean; productEntry?: import('./backend').CartItem }>}
 */
export async function getCart(
  userId: string,
  options: CartQueryOptions = {},
): Promise<{ items: import('./backend').CartItem[]; hasProduct: boolean; productEntry?: import('./backend').CartItem }> {
  // TODO: Merge server-side pricing updates into cached cart data before returning.
  return backend_getCart(userId, options);
}

/**
 * Apply a cart mutation such as incrementing quantity or setting explicit value.
 * @param userId Firebase Auth uid.
 * @param params Operation descriptor (productId, delta, etc.).
 * @returns {Promise<CartOperationResult>} Result of the cart mutation.
 */
export async function queueCartOperation(
  userId: string,
  params: CartOperationInput,
): Promise<CartOperationResult> {
  // TODO: Add client-side stock validation prior to invoking backend mutation.
  return backend_queueCartOperation(userId, params);
}

/**
 * Remove every cart entry for the specified user.
 * @param userId Firebase Auth uid.
 * @returns {Promise<{ success: boolean; error?: string }>} Deletion outcome.
 */
export async function clearCart(userId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Trigger analytics event once cart reset completes successfully.
  return backend_clearCart(userId);
}

/**
 * Remove a single product from the cart.
 * @param userId Firebase Auth uid.
 * @param productId Target product id.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function removeCartItem(
  userId: string,
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Offer undo support by stashing the removed item for a short period.
  return backend_removeCartItem(userId, productId);
}

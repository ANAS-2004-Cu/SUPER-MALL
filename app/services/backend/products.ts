import type { ProductQueryOptions } from './backend';
import {
  getManageConfig as backend_getManageConfig,
  getPreferredCategories as backend_getPreferredCategories,
  getProductById as backend_getProductById,
  getProducts as backend_getProducts,
  updateProduct as backend_updateProduct,
} from './backend';

/**
 * Load a specific product document by id.
 * @param productId Firestore document id under the products collection.
 * @returns {Promise<Record<string, any> | null>} Product payload or null when missing.
 */
export async function getProductById(productId: string): Promise<Record<string, any> | null> {
  // TODO: Hydrate additional related entities (category, seller) if UI requires them.
  return backend_getProductById(productId);
}

/**
 * Query the products catalog with optional ordering/limit.
 * @param options Query constraints (limit/orderBy fields).
 * @returns {Promise<Record<string, any>[]>} Array of products matching filters.
 */
export async function getProducts(options?: ProductQueryOptions): Promise<Record<string, any>[]> {
  // TODO: Map UI filter chips to backend query options before dispatch.
  return backend_getProducts(options);
}

/**
 * Update an existing product document with partial fields.
 * @param productId Target document id.
 * @param updates Partial payload of product fields to persist.
 * @returns {Promise<{ success: boolean; error?: string }>} Result of update attempt.
 */
export async function updateProduct(
  productId: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Enforce SKU/price validation before applying backend update.
  return backend_updateProduct(productId, updates);
}

/**
 * Retrieve Manage configuration (categories, feature flags, etc.).
 * @param options Source selection such as cache vs remote.
 * @returns {Promise<{ success: boolean; categories: Record<string, any>[] }>}
 */
export async function getManageConfig(
  options?: Parameters<typeof backend_getManageConfig>[0],
): Promise<{ success: boolean; categories: Record<string, any>[] }> {
  // TODO: Surface backend_getManageConfig errors to the caller for better UX.
  return backend_getManageConfig(options);
}

/**
 * Load the locally cached preferred categories for the authenticated user.
 * @returns {Promise<string[]>} Array of preferred category ids/names.
 */
export async function getPreferredCategories(): Promise<string[]> {
  // TODO: Sync cache fallback results with server once offline capability is implemented.
  return backend_getPreferredCategories();
}

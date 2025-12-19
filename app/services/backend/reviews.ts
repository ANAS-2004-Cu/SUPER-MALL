import type { CreateProductReviewInput, ProductReview, ProductReviewOptions } from './backend';
import {
  createProductReview as backend_createProductReview,
  getProductReviews as backend_getProductReviews,
} from './backend';

/**
 * Read or subscribe to product reviews for a specific product document.
 * @param productId Target product id.
 * @param options Optional subscription/settings payload.
 * @returns {Promise<ProductReview[]> | (() => void)} Snapshot promise or unsubscribe handle.
 */
export function getProductReviews(
  productId: string,
  options?: ProductReviewOptions,
): Promise<ProductReview[]> | (() => void) {
  // TODO: Convert consumer-friendly filters (e.g., rating threshold) into backend query params.
  return backend_getProductReviews(productId, options);
}

/**
 * Create a new review entry beneath the specified product document.
 * @param productId Target product id.
 * @param payload Review payload containing comment/rating/user metadata.
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the write operation.
 */
export async function createProductReview(
  productId: string,
  payload: CreateProductReviewInput,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Enforce profanity filtering before submitting the review to Firestore.
  return backend_createProductReview(productId, payload);
}

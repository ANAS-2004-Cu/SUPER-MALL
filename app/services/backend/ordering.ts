import {
  getShippingFeeByCity as backend_getShippingFeeByCity,
  placeOrderFromCart as backend_placeOrderFromCart,
} from './backend';

/**
 * Resolve shipping fee for a given city/region.
 * @param city City name provided by the address form.
 * @returns {Promise<number>} Shipping cost expressed in the store's currency.
 */
export async function getShippingFeeByCity(city: string): Promise<number> {
  // TODO: Implement city name normalization before querying backend data.
  return backend_getShippingFeeByCity(city);
}

/**
 * Convert the current cart into a persisted order document.
 * @param payload Structured order payload (address snapshot, payment info, etc.).
 * @returns {Promise<{ success: boolean; error?: string }>} Result of order creation.
 */
export async function placeOrderFromCart(
  payload: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  // TODO: Attach client-side order ids for easier reconciliation with server logs.
  return backend_placeOrderFromCart(payload);
}

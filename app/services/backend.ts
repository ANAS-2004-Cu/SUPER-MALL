import type { User } from 'firebase/auth';
import { addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import {
  addUserAddress as addUserAddressInternal,
  auth,
  clearUserCart as clearUserCartInternal,
  createLimit,
  createOrderBy,
  createQuery,
  db,
  getCollection,
  getDocument,
  getUserCart,
  getUserData,
  getUserAddresses as getUserAddressesInternal,
  loadCachedCategories,
  loadCachedPreferredCategories,
  listenToUserFavorites,
  onAuthStateChange,
  placeOrderFromCart as placeOrderFromCartInternal,
  getShippingFeeByCity as getShippingFeeByCityInternal,
  removeCartItem as removeCartItemInternal,
  signOut as firebaseSignOut,
  syncAvailableCategories,
  toggleFavorite as toggleFavoriteInternal,
  updateDocument,
  updateCartItemQuantity,
  updateUserAddress as updateUserAddressInternal,
  updateUserAddresses as updateUserAddressesInternal,
  updateUserPreferredCategories as updateUserPreferredCategoriesInternal,
} from './client';

export type FavoriteUpdateCallback = (favorites: string[]) => void;
export type FavoritesOptions = {
  subscribe?: boolean;
  onUpdate?: FavoriteUpdateCallback;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartQueryOptions = {
  productId?: string | number;
};

export type CartOperationInput = {
  productId: string;
  type?: 'increment' | 'set';
  quantity?: number;
  maxQuantity?: number;
};

export type CartOperationResult = {
  success: boolean;
  newQuantity?: number;
  error?: string;
  limit?: number;
  currentQuantity?: number;
};

export type ProductReview = Record<string, any> & {
  id: string;
  comment?: string;
  rating?: number;
  userId?: string;
  username?: string;
  userImage?: string;
};

export type ProductReviewOptions = {
  subscribe?: boolean;
  onUpdate?: (reviews: ProductReview[]) => void;
  order?: 'asc' | 'desc';
};

export type CreateProductReviewInput = {
  comment: string;
  rating: number;
  userId: string;
  username: string;
  userImage?: string;
};

export type ManageConfigOptions = {
  source?: 'remote' | 'cache';
};

export type ProductQueryOptions = {
  limit?: number;
  orderBy?: {
    field: string;
    direction?: 'asc' | 'desc';
  };
};

export type OrderRecord = {
  id?: string;
  createdAt?: string;
  OrderedProducts?: Record<string, any>[];
  [key: string]: any;
};

export type UserAddress = {
  id?: string;
  FullName?: string;
  Street?: string;
  City?: string;
  State?: string;
  ZIP?: string;
  Phone?: string;
  isDefault?: boolean;
  [key: string]: any;
};

/**
 * Return the currently authenticated Firebase user if available.
 */
export const getCurrentUser = (): User | null => {
  if (!auth) {
    throw new Error('Backend client not initialized. Implement app/services/client.ts');
  }
  return auth.currentUser ?? null;
};

/**
 * Subscribe to auth state changes so UI can react to login/logout transitions.
 */
export const onAuthChange = (
  callback: (user: User | null) => void,
): (() => void) => {
  if (typeof callback !== 'function') {
    throw new Error('onAuthChange callback must be a function');
  }
  return onAuthStateChange(callback);
};

/**
 * Sign out the currently authenticated user.
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await firebaseSignOut();
    if (result && typeof result === 'object' && 'success' in result) {
      return result as { success: boolean; error?: string };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign out',
    };
  }
};

/**
 * Fetch profile data for a specific user.
 */
export const getUserProfile = async (
  userId: string,
): Promise<Record<string, any> | null> => {
  if (!userId) return null;
  try {
    return await getUserData(userId);
  } catch {
    return null;
  }
};

/**
 * Retrieve all orders stored alongside the user document.
 */
export const getOrders = async (userId: string): Promise<OrderRecord[]> => {
  if (!userId) {
    return [];
  }

  try {
    const userData = await getUserData(userId);
    const orders = userData?.Orders;
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    console.error('getOrders failed', error);
    return [];
  }
};

/**
 * Update user profile document with provided fields.
 */
export const updateUserProfile = async (
  userId: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string }> => {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }
  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'Missing updates' };
  }

  if (Array.isArray(updates.preferredCategories)) {
    return updateUserPreferredCategoriesInternal(userId, updates.preferredCategories);
  }

  return updateDocument('Users', userId, updates);
};

/**
 * Retrieve all saved addresses for the provided user.
 */
export const getUserAddresses = async (userId: string): Promise<UserAddress[]> => {
  if (!userId) {
    return [];
  }

  try {
    const addresses = await getUserAddressesInternal(userId);
    return Array.isArray(addresses) ? addresses : [];
  } catch {
    return [];
  }
};

/**
 * Append a new address for a user.
 */
export const addUserAddress = async (
  address: UserAddress,
): Promise<{ success: boolean; error?: string }> => {
  if (!address) {
    return { success: false, error: 'Missing address payload' };
  }

  try {
    return await addUserAddressInternal(address);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add address',
    };
  }
};

/**
 * Update a specific address entry.
 */
export const updateUserAddress = async (
  address: UserAddress,
): Promise<{ success: boolean; error?: string }> => {
  if (!address?.id) {
    return { success: false, error: 'Missing address id' };
  }

  try {
    return await updateUserAddressInternal(address);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update address',
    };
  }
};

/**
 * Replace the entire address list for a user (bulk update).
 */
export const updateUserAddresses = async (
  userId: string,
  addresses: UserAddress[],
): Promise<{ success: boolean; error?: string }> => {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  try {
    return await updateUserAddressesInternal(userId, addresses);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update addresses',
    };
  }
};

/**
 * Check if a username is available (case-sensitive match).
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  if (!username) return false;
  const usernameQuery = createQuery('username', '==', username);
  const response = await getCollection('Users', [usernameQuery]);
  if (!response?.success || !Array.isArray(response.data)) {
    return true;
  }
  return response.data.length === 0;
};

/**
 * Fetch a single product document by id.
 */
export const getProductById = async (
  productId: string,
): Promise<Record<string, any> | null> => {
  if (!productId) return null;
  const response = await getDocument('products', productId);
  if (response?.success) {
    return response.data;
  }
  return null;
};

/**
 * Update an existing product document with the provided fields.
 */
export const updateProduct = async (
  productId: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string }> => {
  if (!productId) {
    return { success: false, error: 'Missing productId' };
  }
  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'Missing updates' };
  }

  try {
    return await updateDocument('products', productId, updates);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product',
    };
  }
};

/**
 * Fetch product collection with optional ordering and limits.
 */
export const getProducts = async (
  options?: ProductQueryOptions,
): Promise<Record<string, any>[]> => {
  const conditions: any[] = [];
  if (options?.orderBy?.field) {
    conditions.push(createOrderBy(options.orderBy.field, options.orderBy.direction ?? 'asc'));
  }
  if (typeof options?.limit === 'number' && options.limit > 0) {
    conditions.push(createLimit(options.limit));
  }

  const response = await getCollection('products', conditions);
  if (response?.success && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
};

/**
 * Retrieve global Manage configuration including available categories.
 */
export const getManageConfig = async (
  options?: ManageConfigOptions,
): Promise<{ success: boolean; categories: Record<string, any>[] }> => {
  if (options?.source === 'cache') {
    const cached = await loadCachedCategories();
    return {
      success: Boolean(cached?.success ?? true),
      categories: Array.isArray(cached?.data) ? cached.data : [],
    };
  }

  const response = await syncAvailableCategories();
  return {
    success: Boolean(response?.success),
    categories: Array.isArray(response?.data) ? response.data : [],
  };
};

/**
 * Retrieve product reviews once or via a subscription.
 */
export const getProductReviews = (
  productId: string,
  options?: ProductReviewOptions,
): Promise<ProductReview[]> | (() => void) => {
  if (!productId) {
    return options?.subscribe ? () => {} : Promise.resolve([]);
  }

  const reviewsRef = collection(db, 'products', productId, 'reviews');
  const reviewsQuery = query(reviewsRef, orderBy('createdAt', options?.order ?? 'desc'));

  const mapDocs = (docs: { id: string; data: () => Record<string, any> }[]): ProductReview[] =>
    docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

  if (options?.subscribe && typeof options.onUpdate === 'function') {
    return onSnapshot(reviewsQuery, (snapshot) => {
      options.onUpdate(mapDocs(snapshot.docs as any));
    });
  }

  return (async () => {
    const snapshot = await getDocs(reviewsQuery);
    return mapDocs(snapshot.docs as any);
  })();
};

/**
 * Create a new review entry under a product document.
 */
export const createProductReview = async (
  productId: string,
  payload: CreateProductReviewInput,
): Promise<{ success: boolean; error?: string }> => {
  if (!productId) {
    return { success: false, error: 'Missing productId' };
  }

  try {
    const reviewsRef = collection(db, 'products', productId, 'reviews');
    await addDoc(reviewsRef, {
      comment: payload.comment,
      rating: payload.rating,
      userId: payload.userId,
      username: payload.username,
      userImage: payload.userImage,
      createdAt: serverTimestamp(),
      likes: 0,
      dislikes: 0,
      userReaction: null,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create review',
    };
  }
};

/**
 * Retrieve user favorites once or subscribe for real-time updates.
 */
export const getFavorites = (
  userId: string,
  options?: FavoritesOptions,
): Promise<string[]> | (() => void) => {
  if (!userId) {
    return options?.subscribe ? () => {} : Promise.resolve([]);
  }

  if (options?.subscribe && typeof options.onUpdate === 'function') {
    return listenToUserFavorites(userId, options.onUpdate);
  }

  return (async () => {
    const response = await getDocument('Users', userId);
    if (response?.success) {
      const favorites = response.data?.Fav;
      return Array.isArray(favorites) ? favorites.map((fav) => String(fav)) : [];
    }
    return [];
  })();
};

/**
 * Toggle a product inside the user's favorites collection.
 */
export const toggleFavorite = async (
  userId: string,
  productId: string,
): Promise<{ success: boolean; newStatus?: boolean; error?: string }> => {
  return toggleFavoriteInternal(userId, productId);
};

/**
 * Retrieve preferred categories cached for the authenticated user.
 */
export const getPreferredCategories = async (): Promise<string[]> => {
  try {
    const preferred = await loadCachedPreferredCategories();
    return Array.isArray(preferred) ? preferred.map((cat) => String(cat)) : [];
  } catch {
    return [];
  }
};

/**
 * Fetch the current cart snapshot and optionally include product-specific helpers.
 */
export const getCart = async (
  userId: string,
  options: CartQueryOptions = {},
): Promise<{ items: CartItem[]; hasProduct: boolean; productEntry?: CartItem }> => {
  if (!userId) {
    return { items: [], hasProduct: false };
  }
  const items = await getUserCart(userId);
  const targetId = options.productId != null ? String(options.productId) : null;
  const productEntry = targetId
    ? items.find((item) => String(item.productId) === targetId)
    : undefined;
  return {
    items,
    hasProduct: targetId ? Boolean(productEntry) : false,
    productEntry,
  };
};

/**
 * Apply a queued cart operation such as incrementing quantity while validating constraints.
 */
export const queueCartOperation = async (
  userId: string,
  params: CartOperationInput,
): Promise<CartOperationResult> => {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }
  if (!params?.productId) {
    return { success: false, error: 'Missing productId' };
  }

  const items = await getUserCart(userId);
  const existing = items.find((item) => String(item.productId) === String(params.productId));
  const currentQuantity = Number(existing?.quantity) || 0;
  const delta = Number(params.quantity ?? 1) || 1;
  const type = params.type ?? 'increment';
  const desiredQuantity = type === 'set' ? delta : currentQuantity + delta;
  const normalized = Math.max(1, desiredQuantity);

  if (typeof params.maxQuantity === 'number' && normalized > params.maxQuantity) {
    return {
      success: false,
      error: 'MAX_QUANTITY_EXCEEDED',
      limit: params.maxQuantity,
      currentQuantity,
    };
  }

  const updateResult = await updateCartItemQuantity(userId, params.productId, normalized);
  if (!updateResult?.success) {
    return {
      success: false,
      error: updateResult?.error || 'Failed to update cart',
      currentQuantity,
    };
  }

  return {
    success: true,
    newQuantity: normalized,
  };
};

/**
 * Remove every item from a user's cart in Firestore.
 */
export const clearCart = async (
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  try {
    return await clearUserCartInternal(userId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cart',
    };
  }
};

/**
 * Remove a single cart item for the specified user.
 */
export const removeCartItem = async (
  userId: string,
  productId: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!userId || !productId) {
    return { success: false, error: 'Missing identifiers' };
  }

  try {
    return await removeCartItemInternal(userId, productId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove cart item',
    };
  }
};

/**
 * Calculate shipping fee for a specific city name.
 */
export const getShippingFeeByCity = async (city: string): Promise<number> => {
  if (!city) {
    return 0;
  }

  try {
    const fee = await getShippingFeeByCityInternal(city);
    return typeof fee === 'number' && !Number.isNaN(fee) ? fee : 0;
  } catch {
    return 0;
  }
};

/**
 * Create an order using the items currently stored in the user's cart.
 */
export const placeOrderFromCart = async (
  payload: Record<string, any>,
): Promise<{ success: boolean; error?: string }> => {
  if (!payload) {
    return { success: false, error: 'Missing payload' };
  }

  try {
    return await placeOrderFromCartInternal(payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place order',
    };
  }
};

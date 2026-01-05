import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  documentId,
  DocumentSnapshot,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  startAt,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from './MAINAPI';

/**
 * Sign in response type
 */
interface SignInResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Reset password response type
 */
interface ResetPasswordResponse {
  success: boolean;
  error?: string;
}

/**
 * Sign up response type
 */
interface SignUpResponse {
  success: boolean;
  userId?: string;
  verificationSent?: boolean;
  verificationError?: string;
  error?: string;
}

// Deprecated: kept for reference but no longer used
// interface CategoriesResponse {
//   success: boolean;
//   categories: { id: string; name: string; image: string }[];
//   error?: string;
// }

interface UpdateUserDataResponse {
  success: boolean;
  error?: string;
}

interface AdBanner {
  action: string;
  img: string;
  content?: string;
  id?: string;
  SearchKey?: string;
}

interface AdBannersResponse {
  success: boolean;
  banners: AdBanner[];
  error?: string;
}

interface ManageDocResponse {
  success: boolean;
  unUpadtingManageDocs: DocumentData | null;
  UpadtingManageDocs: DocumentData | null;
  error?: string;
}

interface SignOutResponse {
  success: boolean;
  error?: string;
}

interface OrdersResponse {
  success: boolean;
  orders: DocumentData[];
  error?: string;
}

interface CreateOrderFromCheckoutPayload {
  userId: string;
  OrderedProducts: any[];
  addressSnapshot: Record<string, any>;
  paymentMethod: string;
  paymentDetails?: any;
  shippingFee: number;
  subtotal: number;
  total: number;
}

interface CreateOrderFromCheckoutResponse {
  success: boolean;
  orderId?: string;
  error?: string;
}

/**
 * Sign out the currently authenticated user
 * @returns Promise with success status or error message
 */
export const signOutUser = async (): Promise<SignOutResponse> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    let errorMessage = "An error occurred while signing out";

    switch (error.code) {
      case "auth/network-request-failed":
        errorMessage = "Please check your internet connection";
        break;
      default:
        errorMessage = error.message || "Failed to sign out";
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign in user with email and password
 * @param email - User email
 * @param password - User password
 * @returns Promise with success status, user data, or error message
 */
export const signIn = async (
  email: string,
  password: string
): Promise<SignInResponse> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, userId: userCredential.user.uid };
  } catch (error: any) {
    let errorMessage = "An error occurred during login";

    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        errorMessage = "Invalid email or password";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address";
        break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many attempts. Please try again later";
        break;
      case "auth/network-request-failed":
        errorMessage = "Please check your internet connection";
        break;
      default:
        errorMessage = "Invalid email or password";
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Get user data from Firestore
 * @param uid - User ID
 * @returns Promise with user data or null if not found
 */
export const getUserData = async (
  uid: string
): Promise<DocumentData | null> => {
  try {
    const docRef = doc(db, "Users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }

    console.log("No such user!");
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

/**
 * Reset user password by sending reset email
 * @param email - User email address
 * @returns Promise with success status or error message
 */
export const resetPassword = async (
  email: string
): Promise<ResetPasswordResponse> => {
  try {
    // Convert input email to lowercase for comparison
    const inputEmailLower = email.toLowerCase().trim();

    // Get all users and check manually with case-insensitive comparison
    const usersRef = collection(db, "Users");
    const querySnapshot = await getDocs(usersRef);

    let userExists = false;
    querySnapshot.forEach((docSnapshot) => {
      const userData = docSnapshot.data();
      // Convert stored email to lowercase and compare
      if (userData.email && userData.email.toLowerCase() === inputEmailLower) {
        userExists = true;
      }
    });
    if (!userExists) {
      return {
        success: false,
        error: "No account found with this email address",
      };
    }

    // Use original email for Firebase Auth (Firebase handles case-insensitivity)
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    let errorMessage = "An error occurred while sending reset email";

    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email address";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address";
        break;
      case "auth/network-request-failed":
        errorMessage = "Please check your internet connection";
        break;
      default:
        errorMessage = "Failed to send reset email. Please try again";
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Generic helper to update partial user data in Firestore
 */
export const updateUserData = async (
  userId: string,
  data: Record<string, any>
): Promise<UpdateUserDataResponse> => {
  if (!userId) {
    return { success: false, error: "Missing userId" };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { success: false, error: "Invalid data payload" };
  }

  try {
    const payload: Record<string, any> = { ...data };

    if (Object.prototype.hasOwnProperty.call(payload, "preferredCategories")) {
      payload.preferredCategories = Array.isArray(payload.preferredCategories)
        ? payload.preferredCategories.map((category) => String(category))
        : [];
    }

    if (!Object.prototype.hasOwnProperty.call(payload, "updatedAt")) {
      payload.updatedAt = new Date();
    }

    const userRef = doc(db, "Users", userId);
    await updateDoc(userRef, payload);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update user data",
    };
  }
};

/**
 * Fetch Manage collection
 */
export const fetchManageDocs = async (): Promise<ManageDocResponse> => {
  try {
    const snapshot = await getDocs(collection(db, "Manage"));
    if (snapshot.empty) {
      return { success: true, unUpadtingManageDocs: null, UpadtingManageDocs: null };
    }
    const firstDoc = snapshot.docs[0]?.data() || null;
    const secoundDoc = snapshot.docs[1]?.data() || null;
    return { success: true, unUpadtingManageDocs: secoundDoc, UpadtingManageDocs: firstDoc };
  } catch (error: any) {
    return {
      success: false,
      unUpadtingManageDocs: null,
      UpadtingManageDocs: null,
      error: error?.message || "Failed to load Manage document",
    };
  }
};

/**
 * Fetch orders for a specific user from Orders collection
 */
export const fetchUserOrders = async (userId: string): Promise<OrdersResponse> => {
  if (!userId) {
    return { success: false, orders: [], error: "Missing userId" };
  }

  try {
    const ordersRef = collection(db, "Orders");
    const userOrdersQuery = query(ordersRef, where("userId", "==", userId));
    const snapshot = await getDocs(userOrdersQuery);

    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() || {}),
    }));

    return { success: true, orders };
  } catch (error: any) {
    return {
      success: false,
      orders: [],
      error: error?.message || "Failed to load user orders",
    };
  }
};

export const createOrderFromCheckout = async (
  payload: CreateOrderFromCheckoutPayload
): Promise<CreateOrderFromCheckoutResponse> => {
  if (!payload?.userId) {
    return { success: false, error: "Missing userId" };
  }

  try {
    const orderRecord = {
      userId: String(payload.userId),
      OrderedProducts: Array.isArray(payload.OrderedProducts) ? payload.OrderedProducts : [],
      addressSnapshot: payload.addressSnapshot || null,
      paymentMethod: payload.paymentMethod || "CASH",
      paymentDetails: payload.paymentDetails ?? null,
      shippingFee: Number(payload.shippingFee) || 0,
      subtotal: Number(payload.subtotal) || 0,
      total: Number(payload.total) || 0,
      createdAt: new Date(),
      status: "pending",
    };

    const docRef = await addDoc(collection(db, "Orders"), orderRecord);
    return { success: true, orderId: docRef.id };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to create order",
    };
  }
};

/**
 * Check if username already exists in Firestore
 * @param username - Username to check
 * @returns Promise with boolean indicating if username exists
 */
export const checkUsernameExists = async (
  username: string
): Promise<boolean> => {
  try {
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

/**
 * Sign up new user with email and password
 * @param email - User email
 * @param password - User password
 * @param userData - Additional user data to store
 * @returns Promise with success status, userId, and verification info
 */
export const signUp = async (
  email: string,
  password: string,
  userData: Record<string, any> = {}
): Promise<SignUpResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Save additional user data to Firestore
    await setDoc(doc(db, "Users", user.uid), {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      emailVerified: user.emailVerified || false,
      ...userData,
    });

    // Send verification email
    try {
      await sendEmailVerification(user);
      return { success: true, userId: user.uid, verificationSent: true };
    } catch (e: any) {
      // Non-fatal; still return success but note failure
      return {
        success: true,
        userId: user.uid,
        verificationSent: false,
        verificationError: e.message,
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Fetch a single product document by id
 */
export const getProductById = async (
  productId: string
): Promise<DocumentData | null> => {
  if (!productId) {
    return null;
  }

  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return null;
    }

    return { id: productSnap.id, ...(productSnap.data() || {}) };
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return null;
  }
};

/**
 * Fetch multiple products by ids (minimal shape for curated lists).
 */
export const getProductsByIds = async (ids: string[]): Promise<{
  id: string;
  description: string;
  name: string;
  price: number;
  discount: number;
  image: string;
  category: string;
  stockQuantity: number;
  AvilableQuantityBerOeder: number;
}[]> => {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  const idBatches = chunk(ids.map(String), 10);
  const results: {
    id: string;
    name: string;
    description: string;
    price: number;
    discount: number;
    image: string;
    category: string;
    stockQuantity: number;
    AvilableQuantityBerOeder: number;
  }[] = [];

  for (const batch of idBatches) {
    const q = query(collection(db, "products"), where(documentId(), "in", batch));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      results.push({
        id: docSnap.id,
        description: data.description || "",
        name: data.name || "",
        price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
        discount: typeof data.discount === "number" ? data.discount : Number(data.discount) || 0,
        image: typeof data.image === "string" ? data.image : "",
        category: data.category || "",
        stockQuantity: typeof data.stockQuantity === "number" ? data.stockQuantity : Number(data.stockQuantity) || 100,
        AvilableQuantityBerOeder: typeof data.AvilableQuantityBerOeder === "number"
          ? data.AvilableQuantityBerOeder
          : Number(data.AvilableQuantityBerOeder) || 0,
      });
    });
  }

  return results;
};

export interface ProductsPageCursor {
  name: string;
  id: string;
}

export interface ProductsPageResult {
  items: {
    id: string;
    name: string;
    price: number;
    discount: number;
    image: string;
    category: string;
    stockQuantity: number;
    AvilableQuantityBerOeder: number;
  }[];
  cursor: ProductsPageCursor | null;
  hasMore: boolean;
}

export type SearchProductsPageCursor = DocumentSnapshot<DocumentData> | null;

export interface SearchProductsPageResult {
  items: {
    id: string;
    name: string;
    price: number;
    discount: number;
    image: string;
    category: string;
    stockQuantity: number;
    AvilableQuantityBerOeder: number;
  }[];
  cursor: SearchProductsPageCursor;
  hasMore: boolean;
}

export type FilteredProductsPageCursor = string | null;

export interface FilteredProductsPageResult {
  items: {
    id: string;
    name: string;
    price: number;
    discount: number;
    image: string;
    category: string;
    stockQuantity: number;
    AvilableQuantityBerOeder: number;
  }[];
  cursor: FilteredProductsPageCursor | null;
  hasMore: boolean;
}

export interface ProductSuggestionsResult {
  items: { name: string }[];
}

export const getProductsPage = async (options: {
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  cursor?: ProductsPageCursor | null;
}): Promise<ProductsPageResult> => {
  const pageSize = typeof options.limit === "number" && options.limit > 0 ? options.limit : 20;
  const orderField = options.orderBy || "name";
  const orderDir = options.orderDirection || "asc";

  let q = query(
    collection(db, "products"),
    orderBy(orderField, orderDir),
    orderBy(documentId())
  );

  if (options.cursor) {
    q = query(q, startAfter(options.cursor.name || "", options.cursor.id || ""));
  }

  q = query(q, limit(pageSize));

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const items = docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name || "",
      price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
      discount: typeof data.discount === "number" ? data.discount : Number(data.discount) || 0,
      image: typeof data.image === "string" ? data.image : "",
      category: data.category || "",
      stockQuantity: typeof data.stockQuantity === "number" ? data.stockQuantity : Number(data.stockQuantity) || 100,
      AvilableQuantityBerOeder: typeof data.AvilableQuantityBerOeder === "number"
        ? data.AvilableQuantityBerOeder
        : Number(data.AvilableQuantityBerOeder) || 0,
    };
  });

  const lastDoc = docs[docs.length - 1];
  const nextCursor = lastDoc ? { name: (lastDoc.data() || {}).name || "", id: lastDoc.id } : null;

  return {
    items,
    cursor: nextCursor,
    hasMore: docs.length === pageSize,
  };
};

export const getFilteredProductsPage = async (options: {
  limit?: number;
  cursor?: FilteredProductsPageCursor;
  category?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
}): Promise<FilteredProductsPageResult> => {
  const pageSize = typeof options.limit === "number" && options.limit > 0 ? options.limit : 20;

  const constraints: any[] = [];

  if (options.category) {
    constraints.push(where("category", "==", options.category));
  }

  const hasPriceMin = typeof options.priceMin === "number";
  const hasPriceMax = typeof options.priceMax === "number";

  if (hasPriceMin) {
    constraints.push(where("price", ">=", options.priceMin as number));
  }

  if (hasPriceMax) {
    constraints.push(where("price", "<=", options.priceMax as number));
  }

  constraints.push(orderBy(documentId()));

  if (options.cursor) {
    constraints.push(startAfter(options.cursor));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, "products"), ...constraints));
  const docs = snapshot.docs;
  const items = docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name || "",
      price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
      discount: typeof data.discount === "number" ? data.discount : Number(data.discount) || 0,
      image: typeof data.image === "string" ? data.image : "",
      category: data.category || "",
      stockQuantity: typeof data.stockQuantity === "number" ? data.stockQuantity : Number(data.stockQuantity) || 100,
      AvilableQuantityBerOeder: typeof data.AvilableQuantityBerOeder === "number"
        ? data.AvilableQuantityBerOeder
        : Number(data.AvilableQuantityBerOeder) || 0,
    };
  });

  const lastDoc = docs[docs.length - 1] || null;
  const nextCursor = lastDoc ? lastDoc.id : null;

  return {
    items,
    cursor: nextCursor,
    hasMore: docs.length === pageSize,
  };
};

export const getProductNameSuggestions = async (options: {
  searchText: string;
  limit?: number;
}) => {
  const keyword = options.searchText.trim().toLowerCase();
  const limitSize = options.limit ?? 8;

  if (!keyword) {
    return { items: [] };
  }

  /* =========================
     1) Exact token search
     ========================= */
  const tokenQuery = query(
    collection(db, "products"),
    where("search_tokens", "array-contains", keyword),
    limit(limitSize)
  );

  const tokenSnap = await getDocs(tokenQuery);

  if (!tokenSnap.empty) {
    return {
      items: tokenSnap.docs.map(doc => ({
        name: doc.data().name || "",
      })),
    };
  }

  /* =========================
     2) Prefix fallback search
     ========================= */
  const prefixQuery = query(
    collection(db, "products"),
    orderBy("name_search"),
    startAt(keyword),
    endAt(keyword + "\uf8ff"),
    limit(limitSize)
  );

  const prefixSnap = await getDocs(prefixQuery);

  return {
    items: prefixSnap.docs.map(doc => ({
      name: doc.data().name || "",
    })),
  };
};

export const getSearchProductsPage = async (options: {
  limit?: number;
  cursor?: SearchProductsPageCursor;
  searchText: string;
}): Promise<SearchProductsPageResult> => {

  const pageSize =
    typeof options.limit === "number" && options.limit > 0
      ? options.limit
      : 20;

  const keyword = options.searchText.trim().toLowerCase();

  if (!keyword) {
    return { items: [], cursor: null, hasMore: false };
  }

  /* =========================
     1) Exact token search
     ========================= */
  const tokenConstraints: any[] = [
    where("search_tokens", "array-contains", keyword),
    limit(pageSize),
  ];

  if (options.cursor) {
    tokenConstraints.push(startAfter(options.cursor));
  }

  const tokenQuery = query(
    collection(db, "products"),
    ...tokenConstraints
  );

  const tokenSnap = await getDocs(tokenQuery);

  if (!tokenSnap.empty) {
    const items = tokenSnap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.name || "",
        price: Number(d.price) || 0,
        discount: Number(d.discount) || 0,
        image: d.image || "",
        category: d.category || "",
        stockQuantity: Number(d.stockQuantity) || 100,
        AvilableQuantityBerOeder: Number(d.AvilableQuantityBerOeder) || 0,
      };
    });

    return {
      items,
      cursor: tokenSnap.docs[tokenSnap.docs.length - 1] || null,
      hasMore: tokenSnap.docs.length === pageSize,
    };
  }

  /* =========================
     2) Prefix fallback search
     ========================= */
  const prefixConstraints: any[] = [
    orderBy("name_search"),
    startAt(keyword),
    endAt(keyword + "\uf8ff"),
    limit(pageSize),
  ];

  if (options.cursor) {
    prefixConstraints.push(startAfter(options.cursor));
  }

  const prefixQuery = query(
    collection(db, "products"),
    ...prefixConstraints
  );

  const prefixSnap = await getDocs(prefixQuery);

  const items = prefixSnap.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      name: d.name || "",
      price: Number(d.price) || 0,
      discount: Number(d.discount) || 0,
      image: d.image || "",
      category: d.category || "",
      stockQuantity: Number(d.stockQuantity) || 100,
      AvilableQuantityBerOeder: Number(d.AvilableQuantityBerOeder) || 0,
    };
  });

  return {
    items,
    cursor: prefixSnap.docs[prefixSnap.docs.length - 1] || null,
    hasMore: prefixSnap.docs.length === pageSize,
  };
};

/**
 * Review data model used by UI and API responses
 */
export interface ReviewRecord {
  id: string;
  productId: string;
  userId: string;
  username: string;
  userImage: string;
  rating: number;
  comment: string;
  createdAt: Date;
  lastUpdatedAt: Date | null;
}

export interface ReviewsPageCursor {
  createdAt: string;
  id: string;
}

export interface ReviewsPageResult {
  success: boolean;
  items: ReviewRecord[];
  cursor: ReviewsPageCursor | null;
  hasMore: boolean;
  error?: string;
  code?: string;
}

export interface ReviewMutationResult {
  success: boolean;
  review?: ReviewRecord;
  error?: string;
  code?: string;
}

export interface DeleteReviewResult {
  success: boolean;
  error?: string;
  code?: string;
}

export interface AddReviewPayload {
  rating: number;
  comment: string;
  username?: string;
  userImage?: string;
}

const mapDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeRating = (value: any): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};

const mapReviewSnapshot = (docSnap: DocumentSnapshot<DocumentData>): ReviewRecord => {
  const data = docSnap.data() || {};
  const createdAt = mapDate(data.createdAt) || new Date();
  const lastUpdatedAt = mapDate(data.lastUpdatedAt);

  return {
    id: docSnap.id,
    productId: String(data.productId || ""),
    userId: String(data.userId || ""),
    username: data.username || "Anonymous",
    userImage: data.userImage || "",
    rating: Number(data.rating) || 0,
    comment: data.comment || "",
    createdAt,
    lastUpdatedAt: lastUpdatedAt ?? null,
  };
};

/**
 * Load paginated reviews for a product (createdAt DESC)
 */
// NOTE: Firestore requires a composite index for this query:
// Collection: reviews
// Fields: productId (ASC), createdAt (DESC), __name__ (DESC)
export const getProductReviews = async (
  productId: string,
  cursor: ReviewsPageCursor | null = null,
  limitSize = 10
): Promise<ReviewsPageResult> => {
  if (!productId) {
    return { success: false, items: [], cursor: null, hasMore: false, error: "Missing productId", code: "MISSING_PRODUCT" };
  }

  const pageSize = typeof limitSize === "number" && limitSize > 0 ? limitSize : 10;

  try {
    const constraints: any[] = [
      where("productId", "==", productId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
    ];

    if (cursor?.createdAt && cursor?.id) {
      const cursorDate = new Date(cursor.createdAt);
      constraints.push(startAfter(cursorDate, cursor.id));
    }

    constraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collection(db, "reviews"), ...constraints));
    const items = snapshot.docs.map(mapReviewSnapshot);
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const lastCreatedAt = lastDoc ? mapDate(lastDoc.data().createdAt) : null;
    const nextCursor = lastDoc && lastCreatedAt
      ? { createdAt: lastCreatedAt.toISOString(), id: lastDoc.id }
      : null;

    return {
      success: true,
      items,
      cursor: nextCursor,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error: any) {
    return {
      success: false,
      items: [],
      cursor: null,
      hasMore: false,
      error: error?.message || "Failed to load reviews",
      code: "LOAD_FAILED",
    };
  }
};

/**
 * Add a new review for a product. Enforces one-review-per-user-per-product.
 */
export const addProductReview = async (
  productId: string,
  userId: string,
  reviewPayload: AddReviewPayload
): Promise<ReviewMutationResult> => {
  if (!userId) {
    return { success: false, error: "Missing userId", code: "MISSING_USER" };
  }

  if (!productId) {
    return { success: false, error: "Missing productId", code: "MISSING_PRODUCT" };
  }

  const normalizedRating = normalizeRating(reviewPayload.rating);
  const trimmedComment = (reviewPayload.comment || "").trim();

  if (!normalizedRating) {
    return { success: false, error: "Rating must be between 1 and 5", code: "INVALID_RATING" };
  }

  if (!trimmedComment) {
    return { success: false, error: "Comment is required", code: "INVALID_COMMENT" };
  }

  try {
    const existingQuery = query(
      collection(db, "reviews"),
      where("productId", "==", productId),
      where("userId", "==", userId),
      limit(1)
    );

    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      return {
        success: false,
        error: "You already reviewed this product",
        code: "REVIEW_EXISTS",
        review: mapReviewSnapshot(existingSnap.docs[0]),
      };
    }

    const now = new Date();
    const record = {
      productId,
      userId,
      username: reviewPayload.username || "Anonymous",
      userImage: reviewPayload.userImage || "",
      rating: normalizedRating,
      comment: trimmedComment,
      createdAt: now,
      lastUpdatedAt: null,
    };

    const docRef = await addDoc(collection(db, "reviews"), record);

    return {
      success: true,
      review: {
        id: docRef.id,
        ...record,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to add review",
      code: "CREATE_FAILED",
    };
  }
};

/**
 * Update an existing review (owner only)
 */
export const updateProductReview = async (
  reviewId: string,
  userId: string,
  updatedPayload: Partial<AddReviewPayload>
): Promise<ReviewMutationResult> => {
  if (!userId) {
    return { success: false, error: "Missing userId", code: "MISSING_USER" };
  }

  if (!reviewId) {
    return { success: false, error: "Missing reviewId", code: "MISSING_REVIEW" };
  }

  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      return { success: false, error: "Review not found", code: "REVIEW_NOT_FOUND" };
    }

    const existing = mapReviewSnapshot(reviewSnap);

    if (existing.userId !== userId) {
      return { success: false, error: "You can only edit your own review", code: "FORBIDDEN" };
    }

    const nextRating = updatedPayload.rating !== undefined ? normalizeRating(updatedPayload.rating) : normalizeRating(existing.rating);
    if (!nextRating) {
      return { success: false, error: "Rating must be between 1 and 5", code: "INVALID_RATING" };
    }

    const nextComment = updatedPayload.comment !== undefined
      ? (updatedPayload.comment || "").trim()
      : existing.comment;

    if (!nextComment) {
      return { success: false, error: "Comment is required", code: "INVALID_COMMENT" };
    }

    const updateData = {
      rating: nextRating,
      comment: nextComment,
      lastUpdatedAt: new Date(),
    };

    await updateDoc(reviewRef, updateData);

    return {
      success: true,
      review: {
        ...existing,
        ...updateData,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update review",
      code: "UPDATE_FAILED",
    };
  }
};

/**
 * Delete a review (owner only)
 */
export const deleteProductReview = async (
  reviewId: string,
  userId: string
): Promise<DeleteReviewResult> => {
  if (!userId) {
    return { success: false, error: "Missing userId", code: "MISSING_USER" };
  }

  if (!reviewId) {
    return { success: false, error: "Missing reviewId", code: "MISSING_REVIEW" };
  }

  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      return { success: false, error: "Review not found", code: "REVIEW_NOT_FOUND" };
    }

    const existing = mapReviewSnapshot(reviewSnap);

    if (existing.userId !== userId) {
      return { success: false, error: "You can only delete your own review", code: "FORBIDDEN" };
    }

    await deleteDoc(reviewRef);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to delete review",
      code: "DELETE_FAILED",
    };
  }
};

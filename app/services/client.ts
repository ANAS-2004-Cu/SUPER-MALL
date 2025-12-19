import AsyncStorage from '@react-native-async-storage/async-storage'; // For storing emailForSignIn
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  updateEmail,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useUserStore } from '../../store/userStore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Example Firebase initialization (customize for your project):
 *
 * ```ts
 * // import { initializeApp } from 'firebase/app';
 * // const firebaseApp = initializeApp(firebaseConfig);
 * // export const auth = getAuth(firebaseApp);
 * // export const db = getFirestore(firebaseApp);
 * // export const storage = getStorage(firebaseApp);
 * ```
 */
export function ensureClientInitialized(): void {
  if (!auth || !db) {
    throw new Error('Client not initialized. Implement Firebase init in app/services/client.ts');
  }
}

// Action Code Settings for email link sign-in (adjust the url & domain)
const actionCodeSettings = {
  // Must be a domain you configured in Firebase Auth (e.g. https://cs-303-a525a.firebaseapp.com)
  url: 'https://cs-303-a525a.firebaseapp.com/finishSignIn',
  handleCodeInApp: true,
  // For Firebase Dynamic Links (if enabled)
  dynamicLinkDomain: 'cs-303-a525a.page.link',
};

// Authentication Functions
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = 'An error occurred during login';

    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Please check your internet connection';
        break;
      default:
        errorMessage = 'Invalid email or password';
    }

    return { success: false, error: errorMessage };
  }
};

export const signUp = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save additional user data to Firestore
    await setDoc(doc(db, 'Users', user.uid), {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      emailVerified: user.emailVerified || false,
      ...userData,
    });

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (e) {
      // Non-fatal; still return success but note failure
      console.log(user)
      return { success: true, user, verificationSent: false, verificationError: e.message };
    }
    console.log(user)
    return { success: true, user, verificationSent: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    // Convert input email to lowercase for comparison
    const inputEmailLower = email.toLowerCase().trim();

    // Get all users and check manually with case-insensitive comparison
    const usersRef = collection(db, 'Users');
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
      return { success: false, error: 'No account found with this email address' };
    }

    // Use original email for Firebase Auth (Firebase handles case-insensitivity)
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    let errorMessage = 'An error occurred while sending reset email';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Please check your internet connection';
        break;
      default:
        errorMessage = 'Failed to send reset email. Please try again';
    }

    return { success: false, error: errorMessage };
  }
};

export const updateUserProfile = async (displayName, photoURL) => {
  try {
    await updateProfile(auth.currentUser, { displayName, photoURL });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const changeUserEmail = async (newEmail) => {
  try {
    if (!newEmail) return { success: false, error: 'Email required' };
    const emailTrimmed = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return { success: false, error: 'Invalid email format' };
    }

    const user = auth.currentUser;
    if (!user) return { success: false, error: 'User not authenticated' };

    if (user.email && user.email.toLowerCase() === emailTrimmed.toLowerCase()) {
      return { success: false, error: 'This is already your current email' };
    }

    // Check if email already exists (case-insensitive)
    const usersRef = collection(db, 'Users');
    const snapshot = await getDocs(usersRef);
    let exists = false;
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.email && data.email.toLowerCase() === emailTrimmed.toLowerCase()) {
        exists = true;
      }
    });
    if (exists) return { success: false, error: 'Email already in use' };

    // (Optional) re-authentication step if backend requires recent login.
    // Uncomment if you collect password from user:
    // const credential = EmailAuthProvider.credential(user.email, password);
    // await reauthenticateWithCredential(user, credential);

    await updateEmail(user, emailTrimmed);

    // Update Firestore user document if exists
    if (user.uid) {
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { email: emailTrimmed, updatedAt: new Date() });
      }
    }

    return { success: true };
  } catch (error) {
    let msg = 'Failed to update email';
    switch (error.code) {
      case 'auth/email-already-in-use':
        msg = 'Email already in use';
        break;
      case 'auth/invalid-email':
        msg = 'Invalid email address';
        break;
      case 'auth/requires-recent-login':
        msg = 'Please re-login and try again';
        break;
      case 'auth/network-request-failed':
        msg = 'Network error. Check your connection';
        break;
      default:
        msg = error.message || msg;
    }
    return { success: false, error: msg };
  }
};

// Send passwordless sign-in (magic) link to email
export const sendMagicLink = async (email) => {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    try {
      await AsyncStorage.setItem('emailForSignIn', email);
    } catch {}
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Complete passwordless sign-in using the incoming link
export const completeMagicLinkSignIn = async (incomingLink) => {
  try {
    const link = incomingLink;
    if (!isSignInWithEmailLink(auth, link)) {
      return { success: false, error: 'Invalid or expired sign-in link' };
    }
    let email = await AsyncStorage.getItem('emailForSignIn');
    if (!email) {
      return { success: false, error: 'Stored email not found. Ask user to re-enter email.' };
    }
    const result = await signInWithEmailLink(auth, email, link);
    // Refresh user and update firestore emailVerified if needed
    await reload(result.user);
    const userDocRef = doc(db, 'Users', result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        emailVerified: result.user.emailVerified || false,
        lastLoginAt: new Date(),
      });
    }
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Resend verification email for currently signed-in user
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user' };
    if (user.emailVerified) return { success: false, error: 'Email already verified' };
    await sendEmailVerification(user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Firestore CRUD Operations
export const createDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createDocumentWithId = async (collectionName, id, data) => {
  try {
    await setDoc(doc(db, collectionName, id), data);
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDocument = async (collectionName, id) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, id));
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Document not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCollection = async (collectionName, conditions = []) => {
  try {
    let q = collection(db, collectionName);

    // Apply query conditions if provided
    if (conditions.length > 0) {
      q = query(q, ...conditions);
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateDocument = async (collectionName, id, data) => {
  try {
    await updateDoc(doc(db, collectionName, id), data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Storage Functions
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Query helpers
export const createQuery = (field, operator, value) => where(field, operator, value);
export const createOrderBy = (field, direction = 'asc') => orderBy(field, direction);
export const createLimit = (limitCount) => limit(limitCount);

// Auth state observer
export const onAuthStateChange = (callback) => onAuthStateChanged(auth, callback);

export const getUserNames = async () => {
  const colRef = collection(db, 'Users');
  const snapshot = await getDocs(colRef);
  const names = snapshot.docs.map((docSnapshot) => docSnapshot.data().username);
  return names;
};

export const getUserData = async (uid) => {
  const docRef = doc(db, 'Users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  }
  console.log('No such user!');
  return null;
};

// '''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
// New centralized Favorites helpers

// New real-time listener for user favorites
export const listenToUserFavorites = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {}; // Return an empty unsubscribe function
  }

  const userDocRef = doc(db, 'Users', userId);

  // onSnapshot returns its own unsubscribe function
  const unsubscribe = onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const fav = snapshot.data()?.Fav;
        const favList = Array.isArray(fav) ? fav.filter(Boolean).map(String) : [];
        callback(favList);
      } else {
        console.warn('User document not found for listener:', userId);
        callback([]);
      }
    },
    (error) => {
      console.error('Error listening to user favorites:', error);
      callback([]);
    },
  );

  return unsubscribe; // Return the cleanup function
};

// Toggle a product in user's favorites using arrayUnion/arrayRemove
// Returns { success: true, newStatus: boolean }
export const toggleFavorite = async (uid, productId) => {
  try {
    if (!uid || !productId) return { success: false, error: 'Missing params' };
    const userRef = doc(db, 'Users', uid);
    const snap = await getDoc(userRef);
    const current = snap.exists() && Array.isArray(snap.data()?.Fav) ? snap.data().Fav : [];
    const exists = current.includes(productId);
    await updateDoc(userRef, {
      Fav: exists ? arrayRemove(productId) : arrayUnion(productId),
    });
    return { success: true, newStatus: !exists };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to toggle favorite' };
  }
};

// '''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
// Cart helper functions (User document contains: cart: [{ productId, quantity }])
export const getUserCart = async (uid) => {
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(db, 'Users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.cart) ? data.cart.filter((c) => c && c.productId) : [];
    }
  } catch {}
  return [];
};

export const isProductInCart = async (userId, productId) => {
  if (!userId || !productId) return false;
  try {
    const cart = await getUserCart(userId); // Uses your existing helper
    return cart.some((item) => item.productId === productId);
  } catch {
    return false;
  }
};

export const setUserCart = async (uid, cartArray) => {
  if (!uid) return { success: false, error: 'No uid' };
  try {
    await updateDoc(doc(db, 'Users', uid), {
      cart: (Array.isArray(cartArray) ? cartArray : []).map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
      })),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const updateCartItemQuantity = async (uid, productId, newQuantity) => {
  if (!uid || !productId) return { success: false, error: 'Missing params' };
  try {
    const cart = await getUserCart(uid);
    const idx = cart.findIndex((i) => i.productId === productId);
    if (idx === -1) cart.push({ productId, quantity: Math.max(1, newQuantity) });
    else cart[idx].quantity = Math.max(1, newQuantity);
    return await setUserCart(uid, cart);
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const removeCartItem = async (uid, productId) => {
  if (!uid || !productId) return { success: false, error: 'Missing params' };
  try {
    const cart = await getUserCart(uid);
    const filtered = cart.filter((i) => i.productId !== productId);
    return await setUserCart(uid, filtered);
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const clearUserCart = async (uid) => {
  if (!uid) return { success: false, error: 'Missing uid' };
  try {
    await updateDoc(doc(db, 'Users', uid), { cart: [] });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// Internal helper: compute discounted price and percentage consistently with UI
const computeOrderPricing = (product = {}) => {
  const base = Number(product.price) || 0;
  let discountPercent = 0;
  let discounted = base;
  if (product.discountPrice !== undefined && product.discountPrice !== null) {
    const dp = Number(product.discountPrice);
    if (!Number.isNaN(dp) && dp >= 0 && dp <= base) {
      discounted = dp;
      discountPercent = base > 0 ? Math.round((1 - discounted / base) * 100) : 0;
    }
  } else {
    const perc =
      product.discount ??
      product.discountPercent ??
      product.offerPercentage ??
      product.off ??
      product.percentageOff;
    if (perc !== undefined && perc !== null) {
      const pNum = Number(perc);
      if (!Number.isNaN(pNum) && pNum > 0 && pNum < 100) {
        discountPercent = pNum;
        discounted = base * (1 - pNum / 100);
      }
    }
  }
  return { base, discounted: Math.max(0, discounted), discountPercent };
};

// Add: dedicated cache for RegionFee map
let __regionFeeMap = null;

// New: cache for available regions list
let __availableRegions = null;

// New: get available regions (cities) from Manage doc array "AvilableRegion" (fallback to "AvailableRegion")
export const getAvailableRegions = async () => {
  try {
    if (Array.isArray(__availableRegions) && __availableRegions.length) return __availableRegions;

    const snap = await getDocs(query(collection(db, 'Manage'), limit(1)));
    if (snap.empty) return [];

    const data = snap.docs[0].data() || {};
    const list = data?.AvilableRegion || data?.AvailableRegion || [];
    const normalized = Array.isArray(list)
      ? list
          .map((v) => String(v ?? '').trim())
          .filter((v) => v.length > 0)
      : [];

    __availableRegions = normalized;
    return __availableRegions;
  } catch {
    return [];
  }
};

// New: get shipping fee by city using Manage doc's RegionFee map only
export const getShippingFeeByCity = async (city) => {
  try {
    const cityKey = String(city || '').trim();
    if (!cityKey) return 0;

    // Load RegionFee map once
    if (!__regionFeeMap) {
      const snap = await getDocs(query(collection(db, 'Manage'), limit(1)));
      if (snap.empty) return 0;
      const data = snap.docs[0].data() || {};
      const rf = data?.RegionFee || data?.regionFee || null;
      __regionFeeMap = rf && typeof rf === 'object' ? rf : {};
    }

    // Exact match first
    let val = __regionFeeMap[cityKey];
    // Then case-insensitive fallback
    if (val === undefined) {
      const matchKey = Object.keys(__regionFeeMap).find(
        (k) => k?.toLowerCase?.() === cityKey.toLowerCase(),
      );
      if (matchKey) val = __regionFeeMap[matchKey];
    }

    const n = typeof val === 'number' ? val : parseFloat(String(val ?? '').replace(/[^0-9.]/g, ''));
    return !Number.isNaN(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
};

// Create an order from the current user's cart and clear the cart
export const placeOrderFromCart = async ({
  paymentMethod,
  addressSnapshot = null,
  walletPhone = null,
  shippingFee,
} = {}) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, error: 'Login required' };

    const userRef = doc(db, 'Users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'User not found' };

    // Get enriched cart from AsyncStorage instead of refetching
    let items = [];
    try {
      const raw = await AsyncStorage.getItem('UserCart');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        items = parsed
          .filter((it) => it && it.productId && it.product)
          .map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity) || 1,
            product: it.product || {},
          }));
      }
    } catch {}
    if (!items.length) return { success: false, error: 'Cart is empty' };

    // Validate or auto-fetch shipping fee using RegionFee
    let fee = Number(shippingFee);
    if (Number.isNaN(fee) || fee < 0) {
      const city = addressSnapshot?.City || '';
      fee = await getShippingFeeByCity(city);
    }

    // Build order
    let subtotal = 0;
    const now = new Date();
    const OrderedProducts = items.map((ci) => {
      const p = ci.product || {};
      const { discounted, discountPercent } = computeOrderPricing(p);
      const qty = Number(ci.quantity) || 1;
      subtotal += discounted * qty;
      return {
        createdAt: now,
        description: p.description || '',
        discount: discountPercent || Number(p.discount) || 0,
        image: p.image || '',
        name: p.name || '',
        price: Number(p.price) || 0,
        productId: ci.productId,
        quantity: qty,
        category: p.category ?? p.Category ?? p.categoryName ?? '',
      };
    });
    const total = subtotal + (items.length ? fee : 0);

    const prevOrders = userSnap.data()?.Orders;
    const Orders = Array.isArray(prevOrders) ? [...prevOrders] : [];
    Orders.push({
      createdAt: now,
      paymentMethod: String(paymentMethod || 'CASH'),
      shippingFee: fee,
      subtotal,
      total,
      walletPhone: walletPhone || null,
      addressSnapshot,
      OrderedProducts,
    });

    await updateDoc(userRef, { Orders });

    // Clear both Firestore cart and local AsyncStorage snapshot
    await clearUserCart(uid);
    try {
      await AsyncStorage.setItem('UserCart', JSON.stringify([]));
    } catch {}

    return { success: true, subtotal, total };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to create order' };
  }
};

// New: central "Categories" helpers

// New: Read from cache only. Contains parsing logic.
export const loadCachedCategories = async () => {
  try {
    const raw = await AsyncStorage.getItem('AvilableCategory');
    if (!raw) return { success: true, data: [] };

    const rawCats = JSON.parse(raw);
    const list = Array.isArray(rawCats) ? rawCats : [];
    const normalized = list
      .map((c, idx) => {
        if (!c) return null;
        if (typeof c === 'string') {
          const stripped = c.replace(/^\s*\{?\s*/, '').replace(/\s*\}?\s*$/, '');
          const [namePart, ...rest] = stripped.split(',');
          const name = (namePart || '').trim();
          const image = (rest.length > 0 ? rest.join(',').trim() : '') || '';
          if (!name) return null;
          return { id: `cat-${idx}`, name, image };
        }
        if (typeof c === 'object') {
          const name = c.categoryname || c.categoryName || c.name || c.category || c.title || '';
          const image = c.categoriimage || c.categoryimage || c.categoryImage || c.image || c.img || '';
          const id = c.id || c._id || `cat-${idx}`;
          if (!name) return null;
          return { id: String(id), name: String(name), image: String(image || '') };
        }
        return null;
      })
      .filter(Boolean);
    return { success: true, data: normalized };
  } catch {
    return { success: false, data: [] };
  }
};

// Read: fetch Manage.AvilableCategory, persist to AsyncStorage, and return parsed data
export const syncAvailableCategories = async () => {
  try {
    const resp = await getCollection('Manage');
    if (!resp.success || !Array.isArray(resp.data) || resp.data.length === 0) {
      // On failure, still try to return from cache
      return loadCachedCategories();
    }
    const doc0 = resp.data[0] || {};
    const rawCats = doc0.AvilableCategory;
    if (rawCats != null) {
      await AsyncStorage.setItem('AvilableCategory', JSON.stringify(rawCats));
    }
    // After syncing, load from cache to ensure consistent parsing
    return loadCachedCategories();
  } catch {
    return loadCachedCategories();
  }
};

// New: Read preferred categories from local cache only
export const loadCachedPreferredCategories = async () => {
  try {
    const userObject = useUserStore.getState().user;
    if (userObject && Array.isArray(userObject.preferredCategories)) {
      return userObject.preferredCategories.map(String);
    }
    return [];
  } catch {
    return [];
  }
};

// New: Sync user data from Firestore to local cache
export const syncUserPreferredCategories = async (userId) => {
  if (!userId) return { success: false };
  try {
    const updated = await getUserData(userId);
    if (updated) {
      useUserStore.getState().setUser(updated);
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

// Write: update user's preferredCategories and refresh AsyncStorage UserObject
export const updateUserPreferredCategories = async (userId, categoriesList = []) => {
  try {
    if (!userId) return { success: false, error: 'Missing userId' };
    const arr = Array.isArray(categoriesList) ? categoriesList.map(String) : [];
    const res = await updateDocument('Users', userId, { preferredCategories: arr });
    if (!res.success) return res;

    // Refresh local cache of user data
    try {
      const updated = await getUserData(userId);
      if (updated) {
        useUserStore.getState().setUser(updated);
      }
    } catch {}

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Failed to update preferred categories' };
  }
};

export {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where
};


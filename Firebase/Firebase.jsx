import AsyncStorage from '@react-native-async-storage/async-storage'; // For storing emailForSignIn
import { initializeApp } from "firebase/app";
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
    updateProfile
} from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAg3mV79kZOYINI_OB7wcOGE3ek5QXE0yg",
  authDomain: "cs-303-a525a.firebaseapp.com",
  projectId: "cs-303-a525a",
  storageBucket: "cs-303-a525a.firebasestorage.app",
  messagingSenderId: "625620482602",
  appId: "1:625620482602:web:437c2e4902ea95545d2153"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Action Code Settings for email link sign-in (adjust the url & domain)
const actionCodeSettings = {
  // Must be a domain you configured in Firebase Auth (e.g. https://cs-303-a525a.firebaseapp.com)
  url: 'https://cs-303-a525a.firebaseapp.com/finishSignIn',
  handleCodeInApp: true,
  // For Firebase Dynamic Links (if enabled)
  dynamicLinkDomain: 'cs-303-a525a.page.link'
};

// Authentication Functions
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = "An error occurred during login";
    
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        errorMessage = "Invalid email or password";
        break;
      case 'auth/invalid-email':
        errorMessage = "Invalid email address";
        break;
      case 'auth/user-disabled':
        errorMessage = "This account has been disabled";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Too many attempts. Please try again later";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Please check your internet connection";
        break;
      default:
        errorMessage = "Invalid email or password";
    }
    
    return { success: false, error: errorMessage };
  }
};

export const signUp = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save additional user data to Firestore
    await setDoc(doc(db, "Users", user.uid), {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      emailVerified: user.emailVerified || false,
      ...userData
    });
    
    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (e) {
      // Non-fatal; still return success but note failure
      return { success: true, user, verificationSent: false, verificationError: e.message };
    }
    
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
    const usersRef = collection(db, "Users");
    const querySnapshot = await getDocs(usersRef);
    
    let userExists = false;
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Convert stored email to lowercase and compare
      if (userData.email && userData.email.toLowerCase() === inputEmailLower) {
        userExists = true;
      }
    });
    
    if (!userExists) {
      return { success: false, error: "No account found with this email address" };
    }
    
    // Use original email for Firebase Auth (Firebase handles case-insensitivity)
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    let errorMessage = "An error occurred while sending reset email";
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "No account found with this email address";
        break;
      case 'auth/invalid-email':
        errorMessage = "Invalid email address";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Please check your internet connection";
        break;
      default:
        errorMessage = "Failed to send reset email. Please try again";
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
    if (!newEmail) return { success: false, error: "Email required" };
    const emailTrimmed = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return { success: false, error: "Invalid email format" };
    }

    const user = auth.currentUser;
    if (!user) return { success: false, error: "User not authenticated" };

    if (user.email && user.email.toLowerCase() === emailTrimmed.toLowerCase()) {
      return { success: false, error: "This is already your current email" };
    }

    // Check if email already exists (case-insensitive)
    const usersRef = collection(db, "Users");
    const snapshot = await getDocs(usersRef);
    let exists = false;
    snapshot.forEach(d => {
      const data = d.data();
      if (data.email && data.email.toLowerCase() === emailTrimmed.toLowerCase()) {
        exists = true;
      }
    });
    if (exists) return { success: false, error: "Email already in use" };

    // (Optional) re-authentication step if backend requires recent login.
    // Uncomment if you collect password from user:
    // const credential = EmailAuthProvider.credential(user.email, password);
    // await reauthenticateWithCredential(user, credential);

    await updateEmail(user, emailTrimmed);

    // Update Firestore user document if exists
    if (user.uid) {
      const userDocRef = doc(db, "Users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { email: emailTrimmed, updatedAt: new Date() });
      }
    }

    return { success: true };
  } catch (error) {
    let msg = "Failed to update email";
    switch (error.code) {
      case "auth/email-already-in-use":
        msg = "Email already in use";
        break;
      case "auth/invalid-email":
        msg = "Invalid email address";
        break;
      case "auth/requires-recent-login":
        msg = "Please re-login and try again";
        break;
      case "auth/network-request-failed":
        msg = "Network error. Check your connection";
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
    const userDocRef = doc(db, "Users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        emailVerified: result.user.emailVerified || false,
        lastLoginAt: new Date()
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
    } else {
      return { success: false, error: "Document not found" };
    }
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
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserNames = async () => {
  const colRef = collection(db, "Users");
  const snapshot = await getDocs(colRef);
  const names = snapshot.docs.map(doc => doc.data().username);
  return names;
};

export const getUserData = async (uid) => {
  const docRef = doc(db, "Users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("No such user!");
    return null;
  }
};

// Cart helper functions (User document contains: cart: [{ productId, quantity }])
export const getUserCart = async (uid) => {
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(db, 'Users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.cart) ? data.cart.filter(c => c && c.productId) : [];
    }
  } catch {}
  return [];
};

export const setUserCart = async (uid, cartArray) => {
  if (!uid) return { success: false, error: 'No uid' };
  try {
    await updateDoc(doc(db, 'Users', uid), {
      cart: (Array.isArray(cartArray) ? cartArray : []).map(it => ({
        productId: it.productId,
        quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1
      }))
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
    const idx = cart.findIndex(i => i.productId === productId);
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
    const filtered = cart.filter(i => i.productId !== productId);
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

export {
    auth, collection, db, doc,
    getDoc, getDocs, limit, orderBy, query, storage, where
};


import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
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
      ...userData
    });
    
    return { success: true, user };
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

export {
  auth, collection, db, doc,
  getDoc, getDocs, limit, orderBy, query, storage, where
};


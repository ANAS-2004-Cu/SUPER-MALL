import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function signOut() {
  await auth.signOut();
}

const getUserNames = async () => {
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

export { auth, db, collection, getDocs, getUserNames, signOut };
import type { User } from 'firebase/auth';
import {
  getCurrentUser as backend_getCurrentUser,
  onAuthChange as backend_onAuthChange,
  signOut as backend_signOut,
} from './backend';

/**
 * Retrieve the currently authenticated Firebase user (if any).
 * @returns {User | null} Cached Firebase Auth user instance or null when signed out.
 */
export function getCurrentUser(): User | null {
  return backend_getCurrentUser();
}

/**
 * Subscribe to Firebase authentication state changes.
 * @param callback Listener invoked with the latest user snapshot.
 * @returns {() => void} Function to unsubscribe the listener.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  // TODO: Add debounce/backoff if the caller resubscribes frequently.
  return backend_onAuthChange(callback);
}

/**
 * Sign the active Firebase user out and surface backend errors.
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the sign-out attempt.
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  // TODO: Clear any locally cached profile data once a storage helper is available.
  return backend_signOut();
}

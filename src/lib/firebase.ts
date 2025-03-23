import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Function to ensure system settings exist
export async function ensureSystemSettings() {
  try {
    const settingsRef = doc(db, 'system_settings', 'default');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      const defaultSettings = {
        primary_color: '#DC2626',
        logo_url: null,
        favicon_url: null,
        mercadopago_public_key: null,
        mercadopago_access_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(settingsRef, defaultSettings);
      console.log('Initial system settings created successfully!');
    }
  } catch (error) {
    console.error('Error checking/creating system settings:', error);
  }
}
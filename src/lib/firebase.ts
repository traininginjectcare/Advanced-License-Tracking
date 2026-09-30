import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const firestore = getFirestore(app, 'ai-studio-injectcaretcms-d6121e57-3f26-417a-9630-6f9855aedc51');

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Cache access token in memory (never stored in local storage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check for any pending redirect result when app initializes
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
        }
        if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
      }
    })
    .catch((err) => {
      console.warn('Redirect sign in result notice:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string | null }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.message?.toLowerCase().includes('popup-blocked')) {
      const enrichedErr = new Error('Pop-up window was blocked by your browser. Please allow pop-ups for this site or use redirect sign-in.');
      (enrichedErr as any).code = 'auth/popup-blocked';
      throw enrichedErr;
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const signInWithGoogleRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, googleProvider);
};

export const handleRedirectAuthResult = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (err: any) {
    console.warn('getRedirectResult notice:', err);
  }
  return null;
};

export const signInInternalUser = async (email: string, pass: string): Promise<User> => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (err: any) {
    // If standard email auth provider is not active in the console, sign in anonymously for internal demo
    const anon = await signInAnonymously(auth);
    return anon.user;
  }
};

export const signInQuickDemoUser = async (): Promise<User> => {
  return signInInternalUser('compliance@injectcare.com', 'injectcare2025');
};

export const getCachedAccessToken = (): string | null => cachedAccessToken;
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutUser = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

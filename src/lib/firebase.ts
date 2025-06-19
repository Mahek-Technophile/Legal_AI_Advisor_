import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  sendEmailVerification,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import Cookies from 'js-cookie';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  loginCount: number;
  preferences: {
    notifications: boolean;
    marketing: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  profile: {
    firstName?: string;
    lastName?: string;
    company?: string;
    jobTitle?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
}

export interface ActivityLog {
  id: string;
  uid: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Rate limiting
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts = 5;
  private windowMs = 15 * 60 * 1000; // 15 minutes

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (record.count >= this.maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }
}

const rateLimiter = new RateLimiter();

// CSRF Protection
const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const setCSRFToken = (): string => {
  const token = generateCSRFToken();
  Cookies.set('csrf_token', token, { 
    secure: true, 
    sameSite: 'strict',
    expires: 1 // 1 day
  });
  return token;
};

const validateCSRFToken = (token: string): boolean => {
  const storedToken = Cookies.get('csrf_token');
  return storedToken === token;
};

// Secure token management
export const tokenManager = {
  setSecureToken: (user: User) => {
    return user.getIdToken().then(token => {
      // Store refresh token in HTTP-only cookie (would be done server-side in production)
      Cookies.set('auth_token', token, {
        secure: true,
        sameSite: 'strict',
        expires: 1, // 1 day
        httpOnly: false // Note: true httpOnly requires server-side implementation
      });
      
      // Store user session info
      sessionStorage.setItem('user_session', JSON.stringify({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        lastRefresh: Date.now()
      }));
      
      return token;
    });
  },

  getStoredToken: (): string | null => {
    return Cookies.get('auth_token') || null;
  },

  clearTokens: () => {
    Cookies.remove('auth_token');
    Cookies.remove('csrf_token');
    sessionStorage.removeItem('user_session');
    localStorage.removeItem('firebase_user_preferences');
  },

  refreshToken: async (user: User): Promise<string> => {
    try {
      const token = await user.getIdToken(true); // Force refresh
      Cookies.set('auth_token', token, {
        secure: true,
        sameSite: 'strict',
        expires: 1
      });
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }
};

// Phone authentication helper
class PhoneAuthHelper {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private verificationIds: Map<string, string> = new Map();

  initializeRecaptcha() {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    }
    return this.recaptchaVerifier;
  }

  async sendVerificationCode(phoneNumber: string): Promise<{ verificationId: string | null; error: string | null }> {
    try {
      const recaptcha = this.initializeRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
      const verificationId = confirmationResult.verificationId;
      this.verificationIds.set(phoneNumber, verificationId);
      return { verificationId, error: null };
    } catch (error: any) {
      console.error('Phone verification error:', error);
      return { verificationId: null, error: error.message || 'Failed to send verification code' };
    }
  }

  async verifyCode(phoneNumber: string, verificationCode: string, verificationId?: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const vId = verificationId || this.verificationIds.get(phoneNumber);
      if (!vId) {
        return { user: null, error: 'Verification ID not found' };
      }

      const credential = PhoneAuthProvider.credential(vId, verificationCode);
      const result = await signInWithCredential(auth, credential);
      
      // Clean up stored verification ID
      this.verificationIds.delete(phoneNumber);
      
      return { user: result.user, error: null };
    } catch (error: any) {
      console.error('Phone verification error:', error);
      return { user: null, error: error.message || 'Invalid verification code' };
    }
  }

  cleanup() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.verificationIds.clear();
  }
}

const phoneAuthHelper = new PhoneAuthHelper();

// Authentication service
export const authService = {
  // Google OAuth sign-in with popup
  signInWithGooglePopup: async (): Promise<{ user: User | null; error: string | null }> => {
    try {
      const identifier = 'google_signin_' + Date.now();
      
      if (rateLimiter.isRateLimited(identifier)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000 / 60);
        return { 
          user: null, 
          error: `Too many attempts. Please try again in ${remainingTime} minutes.` 
        };
      }

      const csrfToken = setCSRFToken();
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user) {
        await tokenManager.setSecureToken(user);
        await authService.createOrUpdateUserProfile(user);
        await authService.logActivity(user.uid, 'google_signin', 'User signed in with Google');
      }
      
      return { user, error: null };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { user: null, error: 'Sign-in was cancelled. Please try again.' };
      } else if (error.code === 'auth/popup-blocked') {
        return { user: null, error: 'Popup was blocked. Please allow popups and try again.' };
      } else if (error.code === 'auth/network-request-failed') {
        return { user: null, error: 'Network error. Please check your connection and try again.' };
      }
      
      return { user: null, error: error.message || 'Failed to sign in with Google' };
    }
  },

  // Google OAuth sign-in with redirect
  signInWithGoogleRedirect: async (): Promise<{ error: string | null }> => {
    try {
      const identifier = 'google_signin_redirect_' + Date.now();
      
      if (rateLimiter.isRateLimited(identifier)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000 / 60);
        return { error: `Too many attempts. Please try again in ${remainingTime} minutes.` };
      }

      setCSRFToken();
      await signInWithRedirect(auth, googleProvider);
      return { error: null };
    } catch (error: any) {
      console.error('Google redirect sign-in error:', error);
      return { error: error.message || 'Failed to initiate Google sign-in' };
    }
  },

  // Handle redirect result
  handleRedirectResult: async (): Promise<{ user: User | null; error: string | null }> => {
    try {
      const result = await getRedirectResult(auth);
      
      if (result?.user) {
        await tokenManager.setSecureToken(result.user);
        await authService.createOrUpdateUserProfile(result.user);
        await authService.logActivity(result.user.uid, 'google_signin_redirect', 'User signed in with Google redirect');
        return { user: result.user, error: null };
      }
      
      return { user: null, error: null };
    } catch (error: any) {
      console.error('Redirect result error:', error);
      return { user: null, error: error.message || 'Failed to complete Google sign-in' };
    }
  },

  // Email/password sign-up
  signUpWithEmail: async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<{ user: User | null; error: string | null }> => {
    try {
      const identifier = `signup_${email}`;
      
      if (rateLimiter.isRateLimited(identifier)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000 / 60);
        return { 
          user: null, 
          error: `Too many attempts. Please try again in ${remainingTime} minutes.` 
        };
      }

      // Validate password strength
      if (password.length < 8) {
        return { user: null, error: 'Password must be at least 8 characters long' };
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return { 
          user: null, 
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
        };
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      if (user) {
        // Update display name
        await updateProfile(user, { displayName });
        
        // Send email verification
        await sendEmailVerification(user);
        
        await tokenManager.setSecureToken(user);
        await authService.createOrUpdateUserProfile(user);
        await authService.logActivity(user.uid, 'email_signup', 'User signed up with email');
      }
      
      return { user, error: null };
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        return { user: null, error: 'An account with this email already exists' };
      } else if (error.code === 'auth/weak-password') {
        return { user: null, error: 'Password is too weak. Please choose a stronger password' };
      } else if (error.code === 'auth/invalid-email') {
        return { user: null, error: 'Please enter a valid email address' };
      }
      
      return { user: null, error: error.message || 'Failed to create account' };
    }
  },

  // Email/password sign-in
  signInWithEmail: async (
    email: string, 
    password: string
  ): Promise<{ user: User | null; error: string | null }> => {
    try {
      const identifier = `signin_${email}`;
      
      if (rateLimiter.isRateLimited(identifier)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000 / 60);
        return { 
          user: null, 
          error: `Too many attempts. Please try again in ${remainingTime} minutes.` 
        };
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      if (user) {
        await tokenManager.setSecureToken(user);
        await authService.createOrUpdateUserProfile(user);
        await authService.logActivity(user.uid, 'email_signin', 'User signed in with email');
      }
      
      return { user, error: null };
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        return { user: null, error: 'Invalid email or password' };
      } else if (error.code === 'auth/user-disabled') {
        return { user: null, error: 'This account has been disabled' };
      } else if (error.code === 'auth/too-many-requests') {
        return { user: null, error: 'Too many failed attempts. Please try again later' };
      }
      
      return { user: null, error: error.message || 'Failed to sign in' };
    }
  },

  // Phone sign-up
  signUpWithPhone: async (
    phoneNumber: string,
    verificationCode?: string,
    verificationId?: string,
    displayName?: string
  ): Promise<{ user?: User | null; error?: string | null; verificationId?: string }> => {
    try {
      if (!verificationCode) {
        // Step 1: Send verification code
        const result = await phoneAuthHelper.sendVerificationCode(phoneNumber);
        return { verificationId: result.verificationId, error: result.error };
      } else {
        // Step 2: Verify code and create account
        const result = await phoneAuthHelper.verifyCode(phoneNumber, verificationCode, verificationId);
        
        if (result.user && displayName) {
          await updateProfile(result.user, { displayName });
          await authService.createOrUpdateUserProfile(result.user);
          await authService.logActivity(result.user.uid, 'phone_signup', 'User signed up with phone');
        }
        
        return { user: result.user, error: result.error };
      }
    } catch (error: any) {
      console.error('Phone sign-up error:', error);
      return { error: error.message || 'Failed to sign up with phone' };
    }
  },

  // Phone sign-in
  signInWithPhone: async (
    phoneNumber: string,
    verificationCode?: string,
    verificationId?: string
  ): Promise<{ user?: User | null; error?: string | null; verificationId?: string }> => {
    try {
      if (!verificationCode) {
        // Step 1: Send verification code
        const result = await phoneAuthHelper.sendVerificationCode(phoneNumber);
        return { verificationId: result.verificationId, error: result.error };
      } else {
        // Step 2: Verify code and sign in
        const result = await phoneAuthHelper.verifyCode(phoneNumber, verificationCode, verificationId);
        
        if (result.user) {
          await tokenManager.setSecureToken(result.user);
          await authService.createOrUpdateUserProfile(result.user);
          await authService.logActivity(result.user.uid, 'phone_signin', 'User signed in with phone');
        }
        
        return { user: result.user, error: result.error };
      }
    } catch (error: any) {
      console.error('Phone sign-in error:', error);
      return { error: error.message || 'Failed to sign in with phone' };
    }
  },

  // Password reset
  resetPassword: async (email: string): Promise<{ error: string | null }> => {
    try {
      const identifier = `reset_${email}`;
      
      if (rateLimiter.isRateLimited(identifier)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000 / 60);
        return { error: `Too many attempts. Please try again in ${remainingTime} minutes.` };
      }

      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        return { error: 'No account found with this email address' };
      }
      
      return { error: error.message || 'Failed to send password reset email' };
    }
  },

  // Link email/password to existing account
  linkEmailPassword: async (
    user: User, 
    email: string, 
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
      
      await authService.logActivity(user.uid, 'link_email', 'Email/password linked to account');
      return { error: null };
    } catch (error: any) {
      console.error('Link email/password error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        return { error: 'This email is already associated with another account' };
      }
      
      return { error: error.message || 'Failed to link email/password' };
    }
  },

  // Sign out
  signOut: async (): Promise<{ error: string | null }> => {
    try {
      const user = auth.currentUser;
      if (user) {
        await authService.logActivity(user.uid, 'signout', 'User signed out');
      }
      
      await signOut(auth);
      tokenManager.clearTokens();
      phoneAuthHelper.cleanup();
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Clear tokens even if sign out fails
      tokenManager.clearTokens();
      phoneAuthHelper.cleanup();
      return { error: error.message || 'Failed to sign out' };
    }
  },

  // Create or update user profile
  createOrUpdateUserProfile: async (user: User): Promise<void> => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      const now = new Date();
      
      if (userDoc.exists()) {
        // Update existing user
        const data = userDoc.data();
        await updateDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          loginCount: (data.loginCount || 0) + 1
        });
      } else {
        // Create new user profile
        const userProfile: Partial<UserProfile> = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
          emailVerified: user.emailVerified,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          loginCount: 1,
          preferences: {
            notifications: true,
            marketing: false,
            theme: 'system'
          },
          profile: {}
        };
        
        await setDoc(userRef, {
          ...userProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
    }
  },

  // Get user profile
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date()
        } as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Update user profile
  updateUserProfile: async (uid: string, updates: Partial<UserProfile>): Promise<{ error: string | null }> => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      await authService.logActivity(uid, 'profile_update', 'User profile updated', updates);
      return { error: null };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return { error: error.message || 'Failed to update profile' };
    }
  },

  // Log activity
  logActivity: async (
    uid: string, 
    type: string, 
    description: string, 
    metadata?: Record<string, any>
  ): Promise<void> => {
    try {
      const activityRef = collection(db, 'activity_logs');
      await addDoc(activityRef, {
        uid,
        type,
        description,
        metadata: metadata || {},
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  // Get user activity logs
  getUserActivityLogs: async (uid: string, limitCount = 50): Promise<ActivityLog[]> => {
    try {
      const activityRef = collection(db, 'activity_logs');
      const q = query(
        activityRef,
        where('uid', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ActivityLog[];
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('placeholder')
  );
};

export default authService;
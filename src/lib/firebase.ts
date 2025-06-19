import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

// User Profile Interface
export interface UserProfile {
  id: string;
  full_name?: string;
  username?: string;
  phone_number?: string;
  address?: any;
  profile_picture_url?: string;
  notification_preferences?: any;
  privacy_settings?: any;
  created_at?: string;
  updated_at?: string;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Phone Auth
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const initializeRecaptcha = (elementId: string) => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }
  return recaptchaVerifier;
};

export const cleanupRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

// Helper function to get user-friendly error messages
const getFirebaseErrorMessage = (error: any): string => {
  const errorCode = error.code;
  
  switch (errorCode) {
    case 'auth/billing-not-enabled':
      return 'Phone authentication is not available. Please contact support or try signing in with email instead.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for authentication. Please contact support.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Phone Authentication
class PhoneAuthHelper {
  public confirmationResult: ConfirmationResult | null = null;

  async sendVerificationCode(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<void> {
    try {
      this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      console.log('SMS sent successfully');
    } catch (error: any) {
      console.error('Phone verification error:', error);
      
      // Clean up recaptcha on error
      cleanupRecaptcha();
      
      // Throw user-friendly error message
      throw new Error(getFirebaseErrorMessage(error));
    }
  }

  async verifyCode(code: string): Promise<User> {
    if (!this.confirmationResult) {
      throw new Error('No verification code was sent. Please try again.');
    }

    try {
      const result = await this.confirmationResult.confirm(code);
      return result.user;
    } catch (error: any) {
      console.error('Code verification error:', error);
      throw new Error(getFirebaseErrorMessage(error));
    }
  }

  reset() {
    this.confirmationResult = null;
  }

  get verificationId(): string | null {
    return this.confirmationResult?.verificationId || null;
  }
}

export const phoneAuthHelper = new PhoneAuthHelper();

// Google Sign In
export const signInWithGooglePopup = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Google Sign In with Redirect
export const signInWithGoogleRedirect = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Google redirect sign-in error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Handle Redirect Result
export const handleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Email/Password Authentication
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName?: string): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    return result.user;
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Phone Authentication Functions
export const signUpWithPhone = async (phoneNumber: string): Promise<void> => {
  const recaptcha = initializeRecaptcha('recaptcha-container');
  await phoneAuthHelper.sendVerificationCode(phoneNumber, recaptcha);
};

export const signInWithPhone = async (phoneNumber: string): Promise<void> => {
  const recaptcha = initializeRecaptcha('recaptcha-container');
  await phoneAuthHelper.sendVerificationCode(phoneNumber, recaptcha);
};

// Password Reset
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Update Password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user found.');
  }

  try {
    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Password change error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Sign Out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    cleanupRecaptcha();
    phoneAuthHelper.reset();
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Auth State Observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User Profile Management (placeholder functions - would need Supabase integration)
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // This would typically fetch from Supabase
  console.log('getUserProfile called for:', userId);
  return null;
};

export const updateUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<UserProfile> => {
  // This would typically update in Supabase
  console.log('updateUserProfile called for:', userId, profile);
  return { id: userId, ...profile } as UserProfile;
};

export const getUserActivityLogs = async (userId: string): Promise<any[]> => {
  // This would typically fetch from Supabase
  console.log('getUserActivityLogs called for:', userId);
  return [];
};

// Firebase Auth Methods for compatibility
export const firebaseAuth = {
  signInWithPhone: async (phoneNumber: string): Promise<void> => {
    const recaptcha = initializeRecaptcha('recaptcha-container');
    await phoneAuthHelper.sendVerificationCode(phoneNumber, recaptcha);
  },
  
  verifyPhoneCode: async (code: string): Promise<User> => {
    return await phoneAuthHelper.verifyCode(code);
  },
  
  signInWithGoogle: signInWithGooglePopup,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  changePassword,
  signOut: signOutUser,
  onAuthStateChange
};

// Main Auth Service Export
export const authService = {
  // Authentication methods
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  signUpWithEmail,
  signInWithEmail,
  signUpWithPhone,
  signInWithPhone,
  resetPassword,
  signOut: signOutUser,
  handleRedirectResult,
  
  // User profile methods
  getUserProfile,
  updateUserProfile,
  getUserActivityLogs,
  
  // Phone auth helper
  verifyPhoneCode: phoneAuthHelper.verifyCode.bind(phoneAuthHelper),
  
  // Auth state
  onAuthStateChange,
  
  // Utility
  isConfigured: isFirebaseConfigured
};
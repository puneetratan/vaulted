import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { appleAuth } from "@invertase/react-native-apple-authentication";
import { getAuth } from "../services/firebase";
import { AppleAuthProvider, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut } from "@react-native-firebase/auth";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Configure Google Sign-In once
  useEffect(() => {
    try {
      GoogleSignin.configure({
        iosClientId: "872715867979-r9b7b05lutnkblrstufbrh00aaqehgb8.apps.googleusercontent.com",
        webClientId: "872715867979-rmth3jpbic8jorgksr6i9r6j83vjqpdo.apps.googleusercontent.com",
        offlineAccess: false,
        // For Android, ensure the package name matches
        forceCodeForRefreshToken: false,
      });
      console.log("✅ Google Sign-In configured successfully");
    } catch (error) {
      console.error("❌ Failed to configure GoogleSignin:", error);
    }
  }, []);

  // ✅ Google Sign-In handler
  const signInWithGoogle = async () => {
    try {
      // hasPlayServices is only needed on Android
      if (Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        } catch (playServicesError: any) {
          console.error("Play Services check failed:", playServicesError);
          // Continue anyway - some devices might not have Play Services
        }
      }
      
      // Attempt Google Sign-In
      let signInResult;
      try {
        signInResult = await GoogleSignin.signIn();
        console.log("GoogleSignin result:", signInResult);
      } catch (googleSignInError: any) {
        console.error("GoogleSignin.signIn() failed:", googleSignInError);
        // Check if it's a network error
        if (googleSignInError.code === '10' || googleSignInError.message?.includes('network') || googleSignInError.message?.includes('NETWORK')) {
          throw new Error("NETWORK_ERROR: Unable to connect to Google Sign-In services. Please check your internet connection.");
        }
        throw googleSignInError;
      }
      
      // GoogleSignin.signIn() returns { data: { idToken, accessToken, ... } }
      const idToken = (signInResult as any)?.data?.idToken || (signInResult as any)?.idToken;
      console.log("idToken", idToken);
      
      if (!idToken) {
        console.error("No idToken in signIn result:", signInResult);
        throw new Error("Failed to get ID token from Google Sign-In");
      }
      
      // Create credential using React Native Firebase's GoogleAuthProvider
      const googleCredential = GoogleAuthProvider.credential(idToken);
      console.log("googleCredential created:", googleCredential ? "success" : "failed");
      
      if (!googleCredential) {
        throw new Error("Failed to create Google credential");
      }
      
      // Use getAuth from services/firebase.ts
      const authInstance = getAuth();
      console.log("Attempting signInWithCredential...");
      console.log("Auth instance:", authInstance ? "exists" : "null");
      console.log("Google credential:", googleCredential ? "exists" : "null");
      
      // Log Firebase app configuration for debugging
      try {
        const app = authInstance.app;
        console.log("Firebase App Name:", app?.name);
        console.log("Firebase Project ID:", app?.options?.projectId);
        console.log("Firebase Auth Domain:", app?.options?.authDomain);
      } catch (configError) {
        console.warn("Could not log Firebase config:", configError);
      }
      
      try {
        // Add timeout for network requests (increased to 60 seconds)
        const signInPromise = signInWithCredential(authInstance, googleCredential);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("NETWORK_ERROR: Request timed out after 60 seconds. Please check your connection.")), 60000)
        );
        
        console.log("Calling signInWithCredential with timeout...");
        const userCredential = await Promise.race([signInPromise, timeoutPromise]) as any;
        console.log("Sign in successful:", userCredential.user?.email);
        // Auth state listener will automatically update the user state
      } catch (signInError: any) {
        console.error("signInWithCredential failed:", signInError);
        console.error("Error code:", signInError?.code);
        console.error("Error message:", signInError?.message);
        console.error("Error name:", signInError?.name);
        console.error("Full error:", JSON.stringify(signInError, null, 2));
        
        // Log additional debugging info
        if (signInError?.code === 'auth/network-request-failed') {
          console.error("Network error details:");
          console.error("- This usually means the device cannot reach Firebase Auth servers");
          console.error("- Check: Internet connection, firewall, VPN, DNS resolution");
          try {
            const firebaseApp = authInstance.app;
            console.error("- Auth Domain:", firebaseApp?.options?.authDomain || "unknown");
            console.error("- Project ID:", firebaseApp?.options?.projectId || "unknown");
          } catch (e) {
            console.error("- Could not get Firebase config");
          }
        }
        
        // Check for network-related errors
        if (signInError?.code === 'auth/network-request-failed' || 
            signInError?.message?.includes('network') || 
            signInError?.message?.includes('timeout') ||
            signInError?.message?.includes('NETWORK_ERROR')) {
          throw new Error("NETWORK_ERROR: Unable to connect to Firebase Authentication. Please check your internet connection and try again.");
        }
        
        throw signInError;
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      
      // Provide more helpful error messages
      if (error.code === '10' || error.message?.includes('DEVELOPER_ERROR')) {
        const errorMessage = Platform.OS === 'android' 
          ? 'DEVELOPER_ERROR: Please ensure:\n1. SHA-1 and SHA-256 fingerprints are added to Firebase Console\n2. Package name matches (com.vault.dev)\n3. google-services.json is in android/app/\n\nGet SHA-1: cd android && ./gradlew signingReport'
          : 'DEVELOPER_ERROR: Please check your iOS OAuth client ID in Firebase Console';
        throw new Error(errorMessage);
      }
      
      // Handle network errors specifically
      if (error.code === 'auth/network-request-failed' || error.message?.includes('network')) {
        throw new Error('NETWORK_ERROR: Please check your internet connection and try again. If the problem persists, check if Firebase services are accessible.');
      }
      
      // Re-throw error so the UI can handle it (show error message, etc.)
      throw error;
    }
  };

  // ✅ Apple Sign-In handler
  const signInWithApple = async () => {
    try {
      // Only available on iOS
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS devices');
      }

      // Check if Apple Sign-In is available on this device
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign-In is not supported on this device. It requires iOS 13 or later.');
      }

      // Generate a random nonce for security (Apple requires this)
      const rawNonce = Math.random().toString(36).substring(2, 10);

      console.log('Starting Apple Sign-In request...');

      // Start the sign-in request — pass rawNonce, library SHA256 hashes it before sending to Apple
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        nonce: rawNonce,
      });

      console.log('Apple Sign-In response received');

      // Ensure Apple returned a user identity token
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identity token returned');
      }

      // Create a Firebase credential using AppleAuthProvider
      const appleCredential = AppleAuthProvider.credential(
        appleAuthRequestResponse.identityToken,
        rawNonce,
      );

      // Sign in the user with the credential
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(authInstance, appleCredential);

      console.log('✅ Apple Sign-In successful:', userCredential.user?.email);
      // Auth state listener will automatically update the user state
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);

      // Handle specific error cases
      if (error.code === appleAuth.Error.CANCELED) {
        throw new Error('Apple Sign-In was cancelled');
      } else if (error.code === appleAuth.Error.FAILED) {
        throw new Error('Apple Sign-In failed. Please try again.');
      } else if (error.code === appleAuth.Error.NOT_HANDLED) {
        throw new Error('Apple Sign-In could not be handled');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Apple Sign-In is not enabled in Firebase Console. Please enable it in Authentication → Sign-in methods.');
      }

      const errorMessage = error.message || error.toString() || 'Unknown error';
      throw new Error(`Apple Sign-In error: ${errorMessage}`);
    }
  };

  // ✅ Track auth state changes - this maintains session persistence
  // Using modular API (onAuthStateChanged) instead of deprecated instance method
  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (usr: any) => {
      setUser(usr);
      setLoading(false);
      // Log auth state changes for debugging
      if (usr) {
        console.log("✅ User authenticated:", usr.email);
      } else {
        console.log("❌ User signed out");
      }
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // ✅ Logout
  const logout = async () => {
    try {
      // Sign out from Google Sign-In
      try {
        await GoogleSignin.signOut();
      } catch (googleSignOutError) {
        console.warn("Google Sign-In sign out error (continuing with Firebase sign out):", googleSignOutError);
      }
      
      // Sign out from Firebase Auth using getAuth from services/firebase.ts
      const authInstance = getAuth();
      await signOut(authInstance);
    } catch (error) {
      console.error("Logout error:", error);
      throw error; // Re-throw so UI can handle it
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInWithApple,
        logout
      }}>
      {children}
    </AuthContext.Provider>
  );
};
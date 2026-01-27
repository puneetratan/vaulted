import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getAuth } from "../services/firebase";
import { GoogleAuthProvider, onAuthStateChanged } from "@react-native-firebase/auth";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
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
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      
      const signInResult = await GoogleSignin.signIn();
      console.log("GoogleSignin result:", signInResult);
      
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
      
      try {
        const userCredential = await authInstance.signInWithCredential(googleCredential);
        console.log("Sign in successful:", userCredential.user?.email);
        // Auth state listener will automatically update the user state
      } catch (signInError: any) {
        console.error("signInWithCredential failed:", signInError);
        console.error("Error code:", signInError?.code);
        console.error("Error message:", signInError?.message);
        console.error("Full error:", JSON.stringify(signInError, null, 2));
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
      
      // Re-throw error so the UI can handle it (show error message, etc.)
      throw error;
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
      await authInstance.signOut();
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
        logout 
      }}>
      {children}
    </AuthContext.Provider>
  );
};
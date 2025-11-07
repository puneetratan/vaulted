// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { Platform } from "react-native";
import { auth } from "../services/firebase";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

type AuthContextType = {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Configure Google Sign-In once
  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: "872715867979-r9b7b05lutnkblrstufbrh00aaqehgb8.apps.googleusercontent.com",
      webClientId: "872715867979-rmth3jpbic8jorgksr6i9r6j83vjqpdo.apps.googleusercontent.com",
      offlineAccess: false,
    });
  }, []);

  // ✅ Google Sign-In handler
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);
      // Auth state listener will automatically update the user state
      // and navigation will redirect to Dashboard
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      // Re-throw error so the UI can handle it (show error message, etc.)
      throw error;
    }
  };

  // ✅ Track auth state changes - this maintains session persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
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
      // Only sign out from Google Sign-In on native platforms
      if (Platform.OS !== 'web') {
        try {
          await GoogleSignin.signOut();
        } catch (googleSignOutError) {
          console.warn("Google Sign-In sign out error (continuing with Firebase sign out):", googleSignOutError);
        }
      }
      // Sign out from Firebase Auth (works on all platforms)
      await signOut(auth);
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

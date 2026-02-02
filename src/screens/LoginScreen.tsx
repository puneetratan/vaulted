import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../contexts/AuthContext';
import {AppleButton} from '@invertase/react-native-apple-authentication';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const {signInWithGoogle, signInWithApple, loading: authLoading} = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Navigation is handled automatically by AppNavigator based on auth state
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        Alert.alert('Error', 'Sign in was cancelled');
      } else if (error.message?.includes('DEVELOPER_ERROR') || error.code === '10') {
        Alert.alert(
          'Configuration Error',
          Platform.OS === 'android'
            ? 'DEVELOPER_ERROR: Please add SHA-1 and SHA-256 fingerprints to Firebase Console.\n\nRun: cd android && ./gradlew signingReport\n\nSee GOOGLE_SIGNIN_FIX.md for details.'
            : 'DEVELOPER_ERROR: Please check your iOS OAuth client ID in Firebase Console.',
          [{text: 'OK'}]
        );
      } else if (error.code === 'auth/network-request-failed' || error.message?.includes('NETWORK_ERROR') || error.message?.includes('network')) {
        Alert.alert(
          'Network Error',
          'Unable to connect to authentication services. Please check:\n\n• Your internet connection\n• Firewall/VPN settings\n• Try again in a moment',
          [{text: 'OK'}]
        );
      } else {
        const errorMessage = error.message || error.toString() || 'Unknown error';
        Alert.alert('Error', `Something went wrong with Google Sign In: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithApple();
      // Navigation is handled automatically by AppNavigator based on auth state
    } catch (error: any) {
      console.error('Apple Sign-In Error:', error);
      
      if (error.code === 'apple.com/auth/canceled' || error.code === 'auth/cancelled-popup-request') {
        // User cancelled, don't show error
        return;
      } else {
        Alert.alert('Error', 'Something went wrong with Apple Sign In');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ImageBackground
        source={require('../assets/images/Login.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}>
        <View style={styles.overlay}>
          {/* Centered Branding */}
          <View style={styles.brandingContainer}>
            <Image
              source={require('../assets/images/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>VAULTED</Text>
            <View style={styles.taglineContainer}>
              <Text style={styles.appTagline}>
                Vault it all. Sneakers, style, and self-expression.
              </Text>
            </View>
          </View>

          {/* Bottom Login Buttons */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                styles.googleButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <Path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <Path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <Path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  styles.appleButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading}>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    width: '100%',
    height: '100%',
    opacity: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 0,
  },
  brandingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 20,
    textAlign: 'center',
  },
  taglineContainer: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    alignItems: 'flex-start',
  },
  appTagline: {
    fontSize: 17,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 24,
    width: '100%',
  },
  bottomContainer: {
    width: '100%',
    paddingBottom: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 14,
    width: '100%',
    minHeight: 52,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '400',
  },
  appleIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 12,
    fontWeight: '300',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default LoginScreen;


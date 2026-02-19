import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ImageBackground,
  ActivityIndicator,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../contexts/AuthContext';

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
    } catch (error: any) {
      console.error('Apple Sign-In Error:', error);

      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        Alert.alert('Cancelled', 'Apple Sign-In was cancelled');
      } else if (error.message?.includes('only available on iOS')) {
        Alert.alert('Not Available', 'Apple Sign-In is only available on iOS devices');
      } else {
        const errorMessage = error.message || error.toString() || 'Unknown error';
        Alert.alert('Error', `Something went wrong with Apple Sign-In: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ImageBackground
        source={require('../assets/images/Login-Bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.overlay}>
          {/* Logo and Branding Section */}
          <View style={styles.brandingSection}>
            <Image
              source={require('../assets/images/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Vault it all. Sneakers, style,{'\n'}and self-expression.
            </Text>
          </View>

          {/* Buttons Section */}
          <View style={styles.buttonsSection}>
            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[styles.button, styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.icon}>
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
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Sign In Button */}
            <TouchableOpacity
              style={[styles.button, styles.appleButton, isLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={isLoading}>
              <Svg width={18} height={22} viewBox="0 0 20 24" style={styles.icon}>
                <Path
                  d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                  fill="#FFFFFF"
                />
              </Svg>
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
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
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  buttonsSection: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  icon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default LoginScreen;

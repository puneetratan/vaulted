import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
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
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        Alert.alert('Error', 'Please check your Firebase configuration');
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
    <View style={styles.container}>
      <Image
        source={require('../assets/images/Login.png')}
        style={styles.loginImage}
        resizeMode="cover"
      />

      <View style={styles.contentOverlay}>
        <Image
          source={require('../assets/images/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appTagline}>
          Your secure digital vault
        </Text>
        <Text style={styles.appSubTagline}>
          Keep everything organized
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in with Google</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <AppleButton
              buttonStyle={AppleButton.Style.WHITE}
              buttonType={AppleButton.Type.SIGN_IN}
              style={[styles.appleButton, isLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 112,
    marginBottom: 20,
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubTagline: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default LoginScreen;


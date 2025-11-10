import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Platform, View, ActivityIndicator, StyleSheet} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import SplashScreen from '../screens/SplashScreen';
// Use web-compatible versions on web
const LoginScreen = Platform.OS === 'web' 
  ? require('../screens/LoginScreen.web').default 
  : require('../screens/LoginScreen').default;
import DashboardScreen from '../screens/DashboardScreen';
const ProfileScreen = Platform.OS === 'web'
  ? require('../screens/ProfileScreen.web').default
  : require('../screens/ProfileScreen').default;
const TermsScreen = Platform.OS === 'web'
  ? require('../screens/TermsScreen.web').default
  : require('../screens/TermsScreen').default;
const PrivacyPolicyScreen = Platform.OS === 'web'
  ? require('../screens/PrivacyPolicyScreen.web').default
  : require('../screens/PrivacyPolicyScreen').default;
const EditItemScreen = Platform.OS === 'web'
  ? require('../screens/EditItemScreen.web').default
  : require('../screens/EditItemScreen').default;
const AddItemScreen = Platform.OS === 'web'
  ? require('../screens/AddItemScreen.web').default
  : require('../screens/AddItemScreen').default;

interface ShoeItem {
  id: string;
  name: string;
  brand: string;
  silhouette: string;
  styleId: string;
  size: string;
  color: string;
  cost: number;
  retailValue?: number;
  quantity: number;
  releaseDate?: string;
  imageUrl?: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  EditItem: {item: ShoeItem} | undefined;
  AddItem: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const {isAuthenticated, loading} = useAuth();
  const navigationRef = React.useRef<any>(null);

  // Handle navigation when auth state changes (after initial load)
  const isInitialMount = React.useRef(true);
  
  useEffect(() => {
    // Skip navigation reset on initial mount (initialRouteName handles it)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only navigate when auth state changes after initial load
    if (!loading && navigationRef.current?.isReady()) {
      if (isAuthenticated) {
        // User is authenticated, navigate to Dashboard
        navigationRef.current.reset({
          index: 0,
          routes: [{name: 'Dashboard'}],
        });
      } else {
        // User is not authenticated, navigate to Login
        navigationRef.current.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      }
    }
  }, [isAuthenticated, loading]);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="EditItem"
          component={EditItemScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="AddItem"
          component={AddItemScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default AppNavigator;


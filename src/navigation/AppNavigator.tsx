import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Platform} from 'react-native';
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
  size: string;
  color: string;
  cost: number;
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
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

export default AppNavigator;


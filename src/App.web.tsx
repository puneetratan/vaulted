import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

// Import gesture handler conditionally for web
try {
  require('react-native-gesture-handler');
} catch (e) {
  // Ignore on web if not available
}

import AppNavigator from './navigation/AppNavigator';

// Web version - Google Sign-In is configured in the component itself
const App = () => {
  return (
    <View style={styles.container}>
      <AppNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default App;


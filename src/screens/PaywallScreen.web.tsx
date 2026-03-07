import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const PaywallScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>
      In-app subscriptions are not available on web. Please use the iOS or
      Android app to subscribe.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});

export default PaywallScreen;

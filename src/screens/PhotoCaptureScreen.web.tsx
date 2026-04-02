import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const PhotoCaptureScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Camera capture is not supported on web.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#FFF',
    fontSize: 16,
  },
});

export default PhotoCaptureScreen;

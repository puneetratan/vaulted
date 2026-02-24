import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet, StatusBar} from 'react-native';
import Video from 'react-native-video';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../contexts/AuthContext';

type SplashScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Splash'
>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const {isAuthenticated} = useAuth();
  const navigated = useRef(false);

  const goNext = useCallback(() => {
    if (!navigated.current) {
      navigated.current = true;
      navigation.replace(isAuthenticated ? 'Dashboard' : 'Login');
    }
  }, [navigation, isAuthenticated]);

  // Navigate after 5 seconds or when video ends, whichever comes first
  useEffect(() => {
    const fallback = setTimeout(goNext, 5000);
    return () => clearTimeout(fallback);
  }, [goNext]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        source={require('../assets/images/Logo-Ani.mp4')}
        style={styles.video}
        resizeMode="contain"
        repeat={false}
        muted={false}
        controls={false}
        paused={false}
        onEnd={goNext}
        onError={(e: any) => {
          console.log('[SplashScreen] video error:', JSON.stringify(e));
          goNext();
        }}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        playWhenInactive={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default SplashScreen;

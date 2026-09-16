import DevConfig from './dev';
import ProdConfig from './prod';

// Uses React Native's __DEV__ global:
//   true  → debug builds (Metro bundler / dev APK)
//   false → release builds (Play Store / App Store)
const AppConfig = __DEV__ ? DevConfig : ProdConfig;

export default AppConfig;
export type AppConfigType = typeof DevConfig;

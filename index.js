import {AppRegistry, LogBox} from 'react-native';
import App from './src/App';
import {name as appName} from './package.json';

LogBox.ignoreLogs([
  'This method is deprecated',
  /deprecated/i,
  /No products returned/i,
  /\[IAP\]/i,
]);

AppRegistry.registerComponent(appName, () => App);

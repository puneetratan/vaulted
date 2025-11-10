import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './package.json';
import { firebase } from '@react-native-firebase/app';

// const defaultApp = firebase.app(); // returns default app
// console.log('Default app name:', defaultApp.name);


AppRegistry.registerComponent(appName, () => App);



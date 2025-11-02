import './src/utils/platformPolyfill.web';
import {AppRegistry} from 'react-native-web';
import {render} from 'react-dom';
import App from './src/App.web';
import {name as appName} from './package.json';

// Register the component
AppRegistry.registerComponent(appName, () => App);

// Get the root element
const rootTag = document.getElementById('root');

// Run the application
if (rootTag) {
  AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag,
  });
} else {
  console.error('Root element not found!');
}


import { registerRootComponent } from 'expo';
import App from './App';

// Release builds keep nothing in the device log: no tokens, no server details.
if (!__DEV__) { console.log = () => {}; console.info = () => {}; console.debug = () => {}; console.warn = () => {}; }

registerRootComponent(App);

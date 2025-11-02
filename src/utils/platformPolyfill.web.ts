// Polyfill for web-specific React Native features
if (typeof window !== 'undefined') {
  // Add any web-specific polyfills here
  if (!global.setImmediate) {
    global.setImmediate = (callback: any, ...args: any[]) => {
      return setTimeout(callback, 0, ...args);
    };
  }
  
  if (!global.clearImmediate) {
    global.clearImmediate = (id: any) => {
      clearTimeout(id);
    };
  }
}



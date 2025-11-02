// Web platform shims for native modules that don't work on web

export const Platform = {
  OS: 'web',
  select: (spec: any) => spec.web || spec.default,
};

export const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    window.alert(`${title}\n${message || ''}`);
  },
  prompt: (title: string, message?: string, callbackOrButtons?: any, type?: string, defaultValue?: string) => {
    const result = window.prompt(`${title}\n${message || ''}`, defaultValue);
    if (typeof callbackOrButtons === 'function') {
      callbackOrButtons({text: result || ''});
    }
  },
};



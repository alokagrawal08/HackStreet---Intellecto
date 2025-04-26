export const requestFullscreen = () => {
  try {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => {
        // Handle fullscreen error silently
        console.log('Fullscreen request failed');
      });
    }
  } catch (error) {
    console.log('Fullscreen API not supported');
  }
};

export const initializeSecurity = (onWarning: (count: number) => void) => {
  if (typeof window !== 'undefined') {
    // Disable right click
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onWarning(1);
    });

    // Disable keyboard shortcuts and copy/paste
    document.addEventListener('keydown', (e) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        ['c', 'v', 'u', 'p', 's', 'a', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'r', 'y', 'z'].includes(e.key) ||
        ['F12', 'F11'].includes(e.key)
      ) {
        e.preventDefault();
        onWarning(1);
        return false;
      }
    });

    // Request fullscreen on first interaction
    const handleFirstInteraction = () => {
      requestFullscreen();
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction, { once: true });

    // Handle tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // You can add a warning or auto-submit here
        const event = new CustomEvent('tabChanged');
        window.dispatchEvent(event);
      }
    });
  }
};

export const handleTabChange = (callback: () => void) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('tabChanged', callback);
    return () => window.removeEventListener('tabChanged', callback);
  }
}; 
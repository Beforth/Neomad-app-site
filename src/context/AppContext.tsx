import { createContext, useContext, useState, useEffect } from 'react';

export type ActiveApp = 'delivery' | 'hrms';

interface AppContextValue {
  activeApp: ActiveApp;
  setActiveApp: (app: ActiveApp) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getStoredApp(): ActiveApp {
  try {
    const stored = localStorage.getItem('activeApp');
    if (stored === 'delivery' || stored === 'hrms') return stored;
  } catch {}
  return 'delivery';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeApp, setActiveAppState] = useState<ActiveApp>(getStoredApp);

  useEffect(() => {
    localStorage.setItem('activeApp', activeApp);
  }, [activeApp]);

  const setActiveApp = (app: ActiveApp) => {
    setActiveAppState(app);
  };

  return (
    <AppContext.Provider value={{ activeApp, setActiveApp }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

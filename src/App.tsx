import { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { TTSView } from './views/TTSView';
import { SettingsView } from './views/SettingsView';
import { FiltersView } from './views/FiltersView';
import { LogsView } from './views/LogsView';
import { AboutView } from './views/AboutView';
import { EmoteStats } from './types';

export type View = 'tts' | 'settings' | 'filters' | 'logs' | 'about';

function App() {
  const [currentView, setCurrentView] = useState<View>('tts');
  const [logs, setLogs] = useState<{ timestamp: string, user: string, message: string }[]>([]);
  const [emoteStats, setEmoteStats] = useState<EmoteStats>(null);

  const addLog = useCallback((user: string, message: string) => {
    setLogs(prev => {
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        user,
        message
      };
      return [...prev, newLog].slice(-1000); // 1000 message buffer, keep last 1000
    });
  }, []);

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} emoteStats={emoteStats}>
      <div className={currentView === 'tts' ? 'h-full' : 'hidden'}>
        <TTSView addLog={addLog} setEmoteStats={setEmoteStats} />
      </div>
      {currentView === 'settings' && <SettingsView />}
      {currentView === 'filters' && <FiltersView />}
      {currentView === 'logs' && <LogsView logs={logs} onClear={() => setLogs([])} />}
      {currentView === 'about' && <AboutView />}
    </Layout>
  );
}

export default App;

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext({
  systemName:    'TISSflow',
  supportEmail:  'suporte@tissflow.com',
  trialDays:     '30',
  refreshSettings: () => {},
});

export function SettingsProvider({ children }) {
  const [systemName,   setSystemName]   = useState('TISSflow');
  const [supportEmail, setSupportEmail] = useState('suporte@tissflow.com');
  const [trialDays,    setTrialDays]    = useState('30');

  const load = useCallback(() => {
    api.get('/public/settings')
      .then(({ data }) => {
        const s = data.settings ?? {};
        if (s.system_name)         setSystemName(s.system_name);
        if (s.support_email)       setSupportEmail(s.support_email);
        if (s.trial_duration_days) setTrialDays(s.trial_duration_days);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = systemName;
  }, [systemName]);

  return (
    <SettingsContext.Provider value={{ systemName, supportEmail, trialDays, refreshSettings: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

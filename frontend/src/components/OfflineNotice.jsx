import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function OfflineNotice() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline) return null;
  return <div className="offline-notice" role="alert" aria-live="assertive">{t('errors.offline')}</div>;
}

export default OfflineNotice;

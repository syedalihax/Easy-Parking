import { useTranslation } from 'react-i18next';

const languageKeys = {
  en: 'language.en',
  'fa-IR': 'language.faIR',
  ur: 'language.ur',
  'ur-Latn': 'language.urLatn',
};

function LanguageSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <label className="field language-selector">
      <span>{t('language.label')}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={t('language.label')}>
        {Object.entries(languageKeys).map(([code, key]) => (
          <option value={code} key={code}>{t(key)}</option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;

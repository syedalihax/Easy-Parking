import { useTranslation } from 'react-i18next';
import CustomDropdown from './CustomDropdown';

const languageKeys = {
  en: 'language.en',
  'fa-IR': 'language.faIR',
  ur: 'language.ur',
  'ur-Latn': 'language.urLatn',
};

function LanguageSelector({ value, onChange }) {
  const { t } = useTranslation();

  const options = Object.entries(languageKeys).map(([code, key]) => ({
    value: code,
    label: t(key),
  }));

  return (
    <label className="field language-selector">
      <span>{t('language.label')}</span>
      <CustomDropdown
        value={value}
        options={options}
        onChange={onChange}
        label={null}
        placeholder={t('language.label')}
        className="w-full"
      />
    </label>
  );
}

export default LanguageSelector;

// Language switcher component for i18n
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-link nav-link dropdown-toggle text-white"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        style={{ textDecoration: 'none' }}
      >
        {currentLang.flag} {currentLang.code.toUpperCase()}
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        {languages.map(lang => (
          <li key={lang.code}>
            <button
              className={`dropdown-item ${lang.code === i18n.language ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              {lang.flag} {lang.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;

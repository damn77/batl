// Language switcher component for i18n
import { Dropdown } from 'react-bootstrap';
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
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        className="nav-link text-white p-0"
        style={{ textDecoration: 'none', boxShadow: 'none' }}
      >
        {currentLang.flag} {currentLang.code.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {languages.map(lang => (
          <Dropdown.Item
            key={lang.code}
            active={lang.code === i18n.language}
            onClick={() => handleLanguageChange(lang.code)}
          >
            {lang.flag} {lang.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;

import { useLanguageStore } from '../stores/languageStore';
import './LanguageSwitcher.css';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        title="English"
      >
        EN
      </button>
      <button
        className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
        onClick={() => setLanguage('uk')}
        title="Українська"
      >
        UA
      </button>
    </div>
  );
}

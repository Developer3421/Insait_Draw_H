import { useLanguageStore } from '../stores/languageStore';
import './LanguageSwitcher.css';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="language-switcher">
      <select 
        className="language-select" 
        value={language} 
        onChange={handleLanguageChange}
      >
        <option value="en">🇬🇧 English</option>
        <option value="uk">🇺🇦 Українська</option>
        <option value="de">🇩🇪 Deutsch</option>
        <option value="tr">🇹🇷 Türkçe</option>
        <option value="ru">🇷🇺 Русский</option>
      </select>
    </div>
  );
}

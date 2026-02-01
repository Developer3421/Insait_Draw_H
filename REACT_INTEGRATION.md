# Інтеграція React додатку в Avalonia

## Огляд

Ваш Avalonia додаток **Insait Draw H** успішно інтегрований з React UI через WebView. 

## Архітектура

### Компоненти

1. **Avalonia Desktop App** (`MainWindow.axaml.cs`)
   - Головне вікно з кастомним title bar
   - WebView для відображення React UI
   - Вбудований HTTP сервер для обслуговування статичних файлів

2. **React Application** (`Draw WebUi/vite-project`)
   - Vite-based React додаток
   - Зібраний в `dist/` папку
   - Використовує Fabric.js для малювання

3. **Local HTTP Server**
   - Працює на порту 8765+ (автоматично знаходить вільний порт)
   - Обслуговує всі статичні файли з dist папки
   - Має API endpoints для комунікації з Avalonia

## Як це працює

### 1. Запуск додатку

Коли Avalonia додаток запускається:
```
MainWindow() → InitializeWebView() → StartLocalServer()
```

### 2. Пошук dist папки

Функція `GetDistFolder()` шукає зібраний React проект:
- **Development**: `Draw WebUi/vite-project/dist`
- **Production**: `wwwroot/` (поруч з exe файлом)

### 3. Локальний сервер

HTTP сервер обслуговує:
- `GET /` → `index.html`
- `GET /assets/*` → JS, CSS, зображення
- `GET /api/language` → Поточна мова
- `POST /api/language` → Змінити мову

### 4. WebView

WebView завантажує `http://127.0.0.1:8765/` і відображає React UI.

## Структура файлів

```
Insait Draw H/
├── MainWindow.axaml          # UI вікна
├── MainWindow.axaml.cs       # Логіка + HTTP сервер
├── LanguageManager.cs        # Управління мовами
└── Draw WebUi/
    └── vite-project/
        ├── src/              # React код
        ├── dist/             # Зібраний проект ✓
        ├── package.json
        └── vite.config.js
```

## API Endpoints

### GET /api/language
Повертає поточну мову:
```json
{
  "language": "en"
}
```

### POST /api/language
Змінює мову:
```json
{
  "language": "uk"
}
```

Підтримувані мови: `en`, `uk`, `de`

## Комунікація React ↔ Avalonia

### З React до Avalonia
```javascript
// Отримати мову
const response = await fetch('http://127.0.0.1:8765/api/language');
const data = await response.json();
console.log(data.language); // "en"

// Змінити мову
await fetch('http://127.0.0.1:8765/api/language', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ language: 'uk' })
});
```

### З Avalonia до React
```csharp
// Мова зберігається в LanguageManager
LanguageManager.CurrentLanguage = "uk";
```

## Збірка React проекту

### Автоматична збірка

Проект налаштовано так, що **dist папка автоматично копіюється** в output директорію при збірці .NET проекту!

**Тепер достатньо:**

1. **Один раз** зібрати React проект:
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm install
npm run build
```

2. Після цього **просто запускайте** .NET проект:
```bash
cd "E:\Insait Draw H"
dotnet run --project "Insait Draw H/Insait Draw H.csproj"
```

Dist папка автоматично скопіюється в `bin/Debug/net10.0/wwwroot/` при кожній збірці!

### Найпростіший спосіб - використовуйте build скрипт

**Windows (рекомендовано):**
```bash
# Подвійний клік на файл:
build-and-run.bat

# Або з командного рядка:
.\build-and-run.bat
```

**PowerShell:**
```bash
.\build-and-run.ps1
```

Скрипт автоматично:
- ✅ Встановить npm залежності (якщо потрібно)
- ✅ Зберє React проект
- ✅ Зберє .NET проект
- ✅ Запропонує запустити додаток

### Production / Publish

При публікації проекту, React dist папка автоматично копіюється в `wwwroot` директорію:

```bash
cd "E:\Insait Draw H"

# Спочатку збудуйте React проект (якщо ще не збудований)
cd "Insait Draw H\Draw WebUi\vite-project"
npm install
npm run build

# Потім опублікуйте .NET проект
cd "E:\Insait Draw H"
dotnet publish "Insait Draw H/Insait Draw H.csproj" -c Release -o publish
```

Dist папка автоматично скопіюється в `publish/wwwroot/` завдяки налаштуванням в csproj файлі.

### Development
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm install
npm run build
```

### Production
Для production збірки, dist папку потрібно скопіювати в `wwwroot/`:
```bash
npm run build
# Потім скопіювати dist → wwwroot
```

## Запуск

### Найпростіший спосіб

**Подвійний клік на `build-and-run.bat`** - і все готово! 🚀

Скрипт зробить все автоматично:
1. Перевірить і встановить npm залежності
2. Збере React проект
3. Збере .NET проект (автоматично скопіює dist → wwwroot)
4. Запропонує запустити додаток

### Ручний спосіб

### 1. Збудувати React (один раз або після змін в React коді)
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm run build
```

### 2. Запустити Avalonia (dist автоматично скопіюється)
```bash
cd "E:\Insait Draw H"
dotnet run --project "Insait Draw H/Insait Draw H.csproj"
```

## Переваги цієї архітектури

✅ **Роздільна розробка** - React і Avalonia можна розробляти окремо
✅ **Hot Reload** - React може мати свій dev server для швидкої розробки
✅ **Безпека** - Локальний сервер доступний тільки з localhost
✅ **Кросплатформність** - Працює на Windows, macOS, Linux
✅ **Offline** - Не потребує інтернету після збірки

## Налаштування WebView

Пакет: `WebViewControl-Avalonia` v3.120.11

```xml
<PackageReference Include="WebViewControl-Avalonia" Version="3.120.11" />
```

## Troubleshooting

### Проблема: "React build not found"

**Швидке рішення:** Запустіть `build-and-run.bat` - він автоматично збере React і .NET проект!

**Ручне рішення:** Збудуйте React проект:
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm install
npm run build
```

Після збірки React проекту, dist папка автоматично скопіюється в output директорію при наступній збірці .NET проекту.

### Проблема: Зміни в React не відображаються

Повторно зберіть React проект:
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm run build
```

Або використовуйте `build-and-run.bat` для автоматичної збірки обох проектів.

### Проблема: WebView порожній
**Рішення**: Перевірте консоль браузера у WebView (якщо доступна) або логи HTTP сервера

### Проблема: Порт зайнятий
**Рішення**: Сервер автоматично шукає вільний порт від 8765 до 8999

## Можливі покращення

1. **WebSocket** для real-time комунікації
2. **Custom URL Protocol** (app://) замість HTTP
3. **Avalonia → React messaging** через JavaScript interop
4. **Shared state** через local storage або session storage
5. **Dev/Prod modes** з різними конфігураціями

## Висновок

Ваш React додаток **повністю інтегрований** в Avalonia! 🎉

Всі компоненти працюють разом:
- ✅ React UI відображається у WebView
- ✅ Локальний сервер обслуговує файли
- ✅ API для комунікації готове
- ✅ Мультимовність підтримується

Тепер ви можете розробляти UI в React і використовувати Avalonia для нативного вікна та системної інтеграції!

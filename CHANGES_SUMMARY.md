# Зміни в проекті Insait Draw H

## Дата: 1 лютого 2026

### Проблеми що були виправлені:

1. **ComboBox для вибору мови не працював в Avalonia додатку**
2. **Сітка мала бути на pasteboard (фон), а не на самому аркуші**

---

## Зміни в Avalonia додатку (C#)

### Файл: `MainWindow.axaml.cs`

#### 1. Додано ініціалізацію ComboBox при запуску
```csharp
public MainWindow()
{
    InitializeComponent();
    InitializeLanguageComboBox();  // ДОДАНО
    InitializeWebView();
}
```

#### 2. Створено клас LanguageItem для правильної роботи ComboBox
```csharp
private class LanguageItem
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}
```

#### 3. Оновлено InitializeLanguageComboBox
- Використовується LanguageItem замість анонімного типу
- Правильна прив'язка через Binding

#### 4. Оновлено LanguageComboBox_OnSelectionChanged
- Отримання коду мови через LanguageItem.Code
- Автоматичне оновлення назв мов при зміні

---

## Зміни в React додатку

### Файл: `src/components/CanvasArea.jsx`

#### Повністю змінена логіка малювання сітки:

**Було:** Сітка малювалася ТІЛЬКИ НА білому аркуші

**Стало:** 
1. Сітка малюється НА ВСЬОМУ canvas (pasteboard)
2. Потім область аркуша очищається і заповнюється білим
3. Додається тінь під аркушем для ефекту глибини
4. Малюється рамка аркуша

```javascript
// Малюємо сітку на всьому canvas
ctx.strokeStyle = 'rgba(150, 130, 110, 0.25)';
for (let x = 0; x <= width; x += scaledGridSize) {
  // малюємо вертикальні лінії...
}
for (let y = 0; y <= height; y += scaledGridSize) {
  // малюємо горизонтальні лінії...
}

// Очищуємо область аркуша (без сітки)
ctx.clearRect(pageLeft, pageTop, pageWidth, pageHeight);

// Малюємо білий аркуш з тінню
ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
ctx.shadowBlur = 8;
ctx.fillStyle = 'white';
ctx.fillRect(pageLeft, pageTop, pageWidth, pageHeight);

// Малюємо рамку
ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
ctx.strokeRect(pageLeft, pageTop, pageWidth, pageHeight);
```

### Файл: `src/components/CanvasArea.css`

#### 1. Видалено CSS-сітку з фону
**Було:**
```css
background-image: 
  linear-gradient(...),
  linear-gradient(...);
background-size: 20px 20px;
```

**Стало:**
```css
background-color: #F5E6D3;
/* Сітка малюється через JavaScript */
```

#### 2. Змінено z-index для grid-canvas
**Було:** `z-index: 10;` (над canvas)
**Стало:** `z-index: 0;` (під canvas)

#### 3. Спрощено стилі canvas-container
- Видалено box-shadow (малюється на grid canvas)
- Залишено тільки білий фон

### Файл: `src/hooks/useArtboard.js`

#### Зроблено прямокутники аркуша невидимими
```javascript
// Тепер використовуються тільки для визначення меж
fill: 'transparent',
stroke: 'transparent',
visible: false,
```

**Причина:** Аркуш тепер малюється на grid canvas з тінню та рамкою

---

## Як перебудувати проект

### React додаток:
```bash
cd "E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project"
npm run build
```

Або запустіть файл: `E:\Insait Draw H\Insait Draw H\Draw WebUi\vite-project\build.bat`

### Avalonia додаток:
```bash
cd "E:\Insait Draw H"
dotnet build "Insait Draw H.sln"
```

---

## Результат

✅ **ComboBox для вибору мови тепер працює** - можна змінювати мову прямо з головного вікна

✅ **Сітка тепер на pasteboard (фон)** - аркуш чистий білий, сітка тільки навколо

✅ **Аркуш виглядає як справжній папір** - з тінню та чіткою рамкою

✅ **Розмір аркуша налаштовується** - через спеціальну панель PageSettings (A4, A3, Letter, HD, Custom тощо)

---

## Додаткові можливості

PageSettings панель дозволяє:
- Вибрати готові пресети (A4, A3, Letter, HD 1080p тощо)
- Встановити custom розмір (від 100px до 10000px)
- Перемкнути орієнтацію (портрет/ландшафт)
- Zoom 100% або Fit to View

---

## Технічні деталі

### Сітка:
- Розмір сітки налаштовується через `gridSize` в editorStore
- Сітка адаптується до zoom
- Мінімальний розмір клітинки: 5px (при великому zoom)
- Колір: `rgba(150, 130, 110, 0.25)` - м'який коричневий

### Аркуш:
- Білий фон: `white`
- Тінь: `rgba(0, 0, 0, 0.2)` з offset 4px та blur 8px
- Рамка: `rgba(100, 100, 100, 0.3)` товщиною 1px

### Pasteboard:
- Фон: `#F5E6D3` - м'який бежевий колір
- Сітка малюється поверх фону


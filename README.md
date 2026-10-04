<h1 align="center">StreamHub</h1>

<p align="center">
  <b>StreamHub</b> — Standalone donation dashboard, moderation queue & OBS overlay engine for live streamers.
</p>

<p align="center">
  <b><a href="#-english">🇬🇧 English</a></b> | <b><a href="#-русский">🇷🇺 Русский</a></b>
</p>

---

## 🇬🇧 English

### 📌 Overview
**StreamHub** is an offline-capable, standalone desktop application built on **Electron** and **Express**. It intercepts incoming donation alerts from DonationAlerts in real time via an isolated background web worker, hosts a local OBS browser overlay, provides deep moderation tools, renders financial analytics, and maintains persistent local storage without requiring external databases.

---

### 🚀 Download Ready Binaries
Pre-compiled Windows executables are available on the **[Releases](../../releases)** tab:
- **`StreamHub-Portable.exe`**: Zero installation required. Keeps `database.json` directly adjacent to the `.exe` file. Perfect for running from a USB drive or custom folders.
- **`StreamHub-Setup.exe`**: Standard Windows NSIS installer. Creates Desktop and Start Menu shortcuts, and manages persistence securely inside `%APPDATA%\StreamHub`.

---

### 📖 Complete User & Feature Manual

#### 1. First Launch & Alert Sync (Settings Tab)
- Open the application and switch to the **Settings** tab via the sidebar.
- Enter your unique **DonationAlerts Widget URL** into the input field (obtained from your DonationAlerts dashboard: *Widgets ➔ Alerts ➔ Show link for embedding*).
- Click the **Connect Alerts** button. The connection badge will turn green.
- ⚠️ **Important Troubleshooting Rule:** Whenever you restart the application (before or during a live stream), always open **Settings** and click **Connect Alerts** again. This guarantees that the background worker hooks into the alert socket and eliminates desync issues.

#### 2. OBS Studio Integration (Overlay Tab)
- StreamHub operates a local Express server on port `3939`:
  ```text
  http://localhost:3939/overlay
  ```
- **Adding to OBS Studio:**
  1. In OBS, click **+** under Sources and select **Browser Source**.
  2. Set URL to: `http://localhost:3939/overlay`.
  3. Set Width to `1920` and Height to `1080` (or match your canvas resolution).
  4. Check the box **Shutdown source when not visible** (recommended).
- **Customizing Appearance:**
  - Adjust notification duration, font scale, accent colors, and custom sound effects directly inside the **Overlay** tab, then click **Save Changes**.

#### 3. Moderation Queue (Dashboard Tab)
- Incoming donations are automatically sorted into three tabs:
  - **New**: Live alerts requiring your review.
  - **Deferred**: Alerts postponed during intense gaming situations.
  - **Processed**: Completed and acknowledged donations.
- **Hardware Hotkeys:**
  - `Space`: Instantly mark the highlighted donation as processed.
  - `Arrow Up` / `Arrow Down`: Navigate through the donation list without using a mouse.

#### 4. Analytics & Financial Charts
- Monitor revenue breakdowns filtered by: **Today**, **Week**, **Month**, and **All-Time**.
- Interactive charts render total amount received, top single tips, and average donation amount per user.

#### 5. Donator Leaderboard
- Real-time ranking automatically calculates top supporters based on total cumulative donations and highest single contributions.

#### 6. Fake Alert Emulator (Testing Suite)
- Test your visual and audio setup before going live without spending money.
- Input a test username, amount, currency, and custom message.
- Click **Send Test Alert**: it triggers the OBS browser widget, plays audio, and appends a record to the queue for layout verification.

---

### 🛠️ Building from Source (Developer Guide)

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` package manager
- Windows 10/11 build environment

#### Step-by-Step Build Instructions
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/GamerNamless/StreamHub.git](https://github.com/GamerNamless/StreamHub.git)
   cd StreamHub
   ```
2. **Install all required dependencies:**
   ```bash
   npm install
   ```
3. **Launch in local development mode:**
   ```bash
   npm start
   ```
4. **Compile production executables (.exe):**
   - Compile **Portable (.exe)**:
     ```bash
     npx electron-builder --win portable
     ```
   - Compile **Setup Installer (.exe)**:
     ```bash
     npx electron-builder --win nsis
     ```
   - Compile **Both targets simultaneously**:
     ```bash
     npx electron-builder --win
     ```
All compiled `.exe` files will be output to the `./dist` directory.

---

## 🇷🇺 Русский

### 📌 Описание
**StreamHub** — автономное настольное приложение на базе **Electron** и **Express**, созданное для стримеров. Программа перехватывает донаты из DonationAlerts в реальном времени через изолированный фоновый процесс, поднимает локальный сервер оверлея для OBS Studio, предоставляет модерацию очереди сообщений, отображает детальную аналитику и сохраняет все данные локально.

---

### 🚀 Скачать готовые сборки
Готовые исполняемые файлы под Windows опубликованы во вкладке **[Releases](../../releases)**:
- **`StreamHub-Portable.exe`**: Портативная сборка. Не требует установки, файл базы данных `database.json` создается прямо рядом с программой (удобно для запуска с флешки или отдельной папки).
- **`StreamHub-Setup.exe`**: Полноценный установщик Windows (NSIS). Создает ярлыки на Рабочем столе и в меню «Пуск», сохраняя базу данных в безопасной системной папке `%APPDATA%\StreamHub`.

---

### 📖 Полное руководство пользователя

#### 1. Первоначальная настройка и подключение (Вкладка «Настройки»)
- Открой приложение и перейди во вкладку **Настройки** на боковой панели.
- Вставь свою **ссылку на виджет оповещений DonationAlerts** в соответствующее поле (ссылку можно скопировать в панели DA: *Виджеты ➔ Оповещения ➔ Показать ссылку для встраивания*).
- Нажми кнопку **Подключить алерты**. Индикатор подключения станет зеленым.
- ⚠️ **Решение возможных проблем при перезапуске:** При каждом перезапуске программы (перед началом трансляции или во время нее) обязательно зайди во вкладку **Настройки** и нажми **Подключить алерты** еще раз. Это гарантированно перезапускает фоновый перехватчик сообщений и исключает рассинхронизацию.

#### 2. Подключение оверлея к OBS Studio (Вкладка «Оверлей»)
- Встроенный сервер StreamHub раздает оверлей по локальному адресу:
  ```text
  http://localhost:3939/overlay
  ```
- **Добавление в OBS Studio:**
  1. В OBS в списке источников нажми **+** и выбери **Браузер** (Browser Source).
  2. В поле URL вставь: `http://localhost:3939/overlay`.
  3. Укажи ширину `1920` и высоту `1080` (под разрешение твоей сцены).
  4. Поставь галочку **Обновлять браузер, когда сцена становится активной**.
- **Настройка оформления:**
  - В приложении во вкладке оверлея можно настроить цвета, размер шрифта, длительность показа плашки и нажать **Сохранить изменения**.

#### 3. Модерация очереди донатов (Главная вкладка)
- Все поступающие донаты распределяются по вкладкам:
  - **Новые**: входящие донаты, требующие внимания стримера.
  - **Отложенные**: сообщения, отложенные во время важного игрового раунда.
  - **Прочитанные**: завершенные оповещения.
- **Горячие клавиши:**
  - `Пробел (Space)`: мгновенно отметить выбранный донат прочитанным.
  - `Стрелки вверх / вниз`: навигация по списку очереди без участия мыши.

#### 4. Аналитика и графики
- Фильтрация статистики по периодам: **Сегодня**, **Неделя**, **Месяц**, **Всё время**.
- Наглядные графики отображают динамику сборов, распределение платежей и среднюю сумму доната.

#### 5. Таблица лидеров (Лидерборд)
- Автоматически ранжирует топ зрителей канала по суммарной сумме поддержки, а также фиксирует рекордный максимальный донат.

#### 6. Тестирование алертов (Фейк-донат)
- Инструмент для быстрой проверки внешнего вида и звука оверлея перед трансляцией.
- Заполни имя зрителя, тестовую сумму, валюту и текст сообщения.
- Нажми **Отправить тест**: оверлей мгновенно проиграет анимацию в OBS, а донат отобразится в очереди программы.

---

### 🛠️ Сборка из исходников (Инструкция разработчика)

#### Системные требования
- [Node.js](https://nodejs.org/) (версия 18.0.0 или новее)
- Пакетный менеджер `npm`
- ОС Windows 10/11

#### Пошаговая компиляция
1. **Клонируй репозиторий на свой компьютер:**
   ```bash
   git clone [https://github.com/GamerNamless/StreamHub.git](https://github.com/GamerNamless/StreamHub.git)
   cd StreamHub
   ```
2. **Установи все необходимые библиотеки:**
   ```bash
   npm install
   ```
3. **Запусти приложение для разработки и тестирования:**
   ```bash
   npm start
   ```
4. **Скомпилируй готовые исполняемые файлы (.exe):**
   - Собрать **портативную версию**:
     ```bash
     npx electron-builder --win portable
     ```
   - Собрать **установщик Windows**:
     ```bash
     npx electron-builder --win nsis
     ```
   - Собрать **оба варианта за один раз**:
     ```bash
     npx electron-builder --win
     ```
Скомпилированные файлы появятся в созданной папке `./dist`.

---

## 📄 License
Распространяется под свободной лицензией **MIT License**.

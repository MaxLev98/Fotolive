FOTOLIVE 1.0 — стартовый проект

КОНЦЕПЦИЯ
Fotolive — общие фотоальбомы для свадеб и любых мероприятий.
Гости открывают альбом по QR-коду, без регистрации, и загружают только фотографии.

СТРУКТУРА
index.html    — главная страница
style.css     — оформление
app.js        — клиентская логика (следующий этап)
worker.js     — API на Cloudflare Workers
schema.sql    — структура базы Cloudflare D1
wrangler.toml — конфигурация Worker

ВАЖНО
Это стартовая основа, а не полностью готовый сервис. Главная страница уже оформлена.
API содержит базовые маршруты создания альбома, выдачи подписи Cloudinary и сохранения/получения фото.
Публичный интерфейс альбома, QR-генератор, админ-панель, ограничения загрузки и защита от злоупотреблений будут добавлены следующими этапами.
Не публикуйте ADMIN_SECRET и CLOUDINARY_API_SECRET в GitHub или frontend-файлах.

ПЛАН ПОДКЛЮЧЕНИЯ
1. Создать Cloudinary account и взять Cloud name, API Key, API Secret.
2. Создать Cloudflare D1 database с именем fotolive-db.
3. Выполнить schema.sql в D1.
4. В wrangler.toml заменить REPLACE_WITH_YOUR_D1_DATABASE_ID на настоящий ID.
5. Добавить секреты Worker через Wrangler:
   npx wrangler secret put ADMIN_SECRET
   npx wrangler secret put CLOUDINARY_API_SECRET
6. Задать CLOUDINARY_CLOUD_NAME и CLOUDINARY_API_KEY в настройках Worker.
7. Развернуть Worker командой: npx wrangler deploy

СЛЕДУЮЩИЙ ЭТАП
Сделать страницу альбома /e/КОД, загрузку фотографий с телефона, галерею и автоматическое обновление списка снимков.
Затем добавить генерацию QR-кода и удобную панель организатора.

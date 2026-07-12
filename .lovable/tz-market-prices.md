# ТЗ: Multi-source Market Prices & Alerts

**Мета:** замінити mock-ціни (`src/lib/demo-market-prices.ts`, `src/lib/demo-price-history.ts`) на реальні дані з зовнішніх джерел, покрити всі категорії застосунку, зробити систему алертів по цінах у watchlist робочою.

**Контекст:**
- Стек: TanStack Start + Supabase (Lovable Cloud).
- Watchlist / Signals / Portfolio value картки сьогодні читають з mock-модулів (seeded PRNG, коментар `DEMO ONLY — replace in Phase 2`).
- Юрисдикція: US. Бренди дуже чутливі до IP / DMCA.

---

## 1. Джерела даних (по категоріях)

| Категорія         | Основне джерело           | Backup / Fallback         | Тип доступу                        |
|-------------------|---------------------------|---------------------------|------------------------------------|
| Watches           | Chrono24 (via scraper)    | WatchCharts API           | Scraper: Apify/Firecrawl. WatchCharts: комерційний API (contact sales). |
| Handbags          | Fashionphile, Vestiaire   | Sotheby's public results  | Scraper. Sotheby's — public JSON.  |
| Sneakers          | StockX                    | GOAT                      | StockX неофіційний API або scraper. |
| Fine Jewelry      | 1stDibs                   | Sotheby's / Christie's    | Scraper + public auction JSON.     |
| Fashion RTW       | Farfetch                  | SSENSE, MyTheresa         | Apify actor `autofacts/farfetch` або Firecrawl. |
| Art               | Sotheby's, Christie's, Phillips | Artnet (paid)      | Public auction results (JSON).     |
| Wine              | Liv-ex (paid API)         | Wine-Searcher (scraper)   | Комерційний контракт з Liv-ex.     |
| Whisky            | Rare Whisky 101 (paid)    | Whisky Auctioneer scraper | Комерційний контракт.              |
| Cars              | Hagerty Valuation (paid)  | Bring a Trailer results   | Комерційний контракт.              |
| Sneakers (fallback)| eBay Browse API          | —                         | Офіційний free tier: 5000 req/day. |

**Рекомендований мінімум для MVP:** eBay Browse API (офіційний) + Firecrawl (для Chrono24 / Farfetch / StockX / 1stDibs) + public auction JSON.

---

## 2. Що треба отримати від тімліда/менеджера

1. **eBay Developer account** → OAuth Application → Client ID + Client Secret. Free tier 5000 req/day. Тарифи: https://developer.ebay.com/develop/apis
2. **Apify account** → API token (є free $5/міс credits). Actor `autofacts/farfetch` — $0.30/1000 результатів.
3. **Firecrawl account** (альтернатива Apify для гнучкого scraping) — free 500 сторінок/міс, далі $16/міс за 3000. Підключається через Lovable Connectors: `Settings → Connectors → Firecrawl → Connect`.
4. **DMCA agent registration** в US Copyright Office ($6, одноразово) — юридичне прикриття.
5. **Legal review** — memo від юриста про scraping compliance для кожного джерела (ToS + hiQ v. LinkedIn precedent).

Ключі кладуться через `Cloud → Secrets` в Lovable (server-side, ніколи не в код і не в `.env` фронта).

---

## 3. Backend архітектура

### 3.1 Нова таблиця `market_prices`

```sql
CREATE TABLE public.market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  reference text,               -- e.g. "116500LN" for Rolex
  category text NOT NULL,       -- watches | handbags | sneakers | jewelry | fashion | art | wine | whisky | cars
  price_low numeric(12,2),
  price_high numeric(12,2),
  price_median numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  source text NOT NULL,         -- 'chrono24' | 'stockx' | 'ebay' | 'farfetch' | 'sothebys' | ...
  source_url text,              -- deep link to specific listing/lot
  sample_size int,              -- how many listings averaged
  confidence text NOT NULL DEFAULT 'medium', -- low | medium | high | verified
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (brand, model, reference, source)
);

CREATE INDEX ON public.market_prices (brand, model, reference);
CREATE INDEX ON public.market_prices (expires_at) WHERE expires_at > now();

GRANT SELECT ON public.market_prices TO authenticated;
GRANT SELECT ON public.market_prices TO anon;  -- public read (landing демо-ціни)
GRANT ALL ON public.market_prices TO service_role;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_prices readable by all"
  ON public.market_prices FOR SELECT USING (true);
```

### 3.2 Нова таблиця `price_alerts` (для watchlist)

```sql
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id uuid NOT NULL REFERENCES public.watchlist(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('above','below','change_pct')),
  threshold numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  last_price numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own alerts"
  ON public.price_alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 3.3 Server functions (TanStack `createServerFn`)

Створити файл `src/lib/market-prices.functions.ts`:

- `getMarketPrice({ brand, model, reference, category })` — читає з `market_prices` останню non-expired запис; якщо немає → тригерить fetch у бекграунд і повертає demo fallback з `confidence: 'low'`.
- `refreshMarketPrice({ brand, model, reference, category })` — server-only, викликає resolver по категорії (див. 3.4), пише в `market_prices`.
- `getMarketPriceHistory({ brand, model, reference, days })` — читає з нової таблиці `market_price_history` (треба додати analogічно).

### 3.4 Category resolvers

`src/lib/market-prices/resolvers/` — по одному файлу на джерело:

- `chrono24.server.ts` → Firecrawl scrape → parse → нормалізація в `{ price_low, price_high, median, sample_size }`.
- `stockx.server.ts` → Firecrawl або офіційний GraphQL endpoint (є reverse-engineered).
- `farfetch.server.ts` → Apify actor `autofacts/farfetch`.
- `ebay.server.ts` → офіційний Browse API `/item_summary/search?q=...&filter=conditions:{USED}`, groupBy median.
- `auction-houses.server.ts` → Sotheby's / Christie's / Phillips public search JSON (без auth).

Router (`src/lib/market-prices/resolver.server.ts`) вибирає resolver по `category` з fallback chain:
```
watches   → [chrono24, ebay, demo]
handbags  → [fashionphile, vestiaire, ebay, demo]
sneakers  → [stockx, ebay, demo]
fashion   → [farfetch, ssense, ebay, demo]
art/wine/whisky/cars → [auction-houses, demo]
```

### 3.5 Cron (pg_cron)

Server route `/api/public/hooks/refresh-market-prices`:
- Query всіх активних `watchlist` items + `portfolio_items` де `market_prices.expires_at < now() + 1 hour`.
- Батч по 50, паралельний refresh.
- Rate-limit по джерелу: eBay ≤5000/day, Firecrawl ≤500/month на free tier.

Cron через `supabase.insert`:
```sql
SELECT cron.schedule(
  'refresh-market-prices-hourly',
  '15 * * * *',  -- :15 кожної години
  $$SELECT net.http_post(
    url:='https://project--7107de7c-afc2-44e8-8a3d-e271f2c26295.lovable.app/api/public/hooks/refresh-market-prices',
    headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
```

### 3.6 Alert evaluation

Той самий cron після refresh:
1. `SELECT` всі `price_alerts WHERE is_active = true AND triggered_at IS NULL`.
2. Порівняти `last_price` vs `market_prices.price_median`.
3. Якщо перетнуло threshold → `INSERT INTO signals`, `UPDATE price_alerts SET triggered_at = now(), last_price = ...`, тригер email через існуючий шаблон (`src/components/emails/Templates.tsx`).

---

## 4. Frontend зміни

### 4.1 Заміна mock

Файл `src/lib/demo-market-prices.ts`:
- Залишити функцію `getMockMarketPrice()` як fallback.
- Додати `export async function getMarketPrice(item)` що спочатку робить `useServerFn(getMarketPriceServerFn)`, при помилці/відсутності → fallback на mock.

Файл `src/lib/demo-price-history.ts` — те саме, але через `market_price_history`.

Місця виклику (не міняти сигнатуру, тільки source):
- `src/components/portfolio/PortfolioCard.tsx`
- `src/components/portfolio/TotalValueHeader.tsx`
- `src/components/dashboard/ValueCard.tsx`
- `src/components/dashboard/CategoryDonutCard.tsx`
- `src/routes/_authenticated/app/watchlist.tsx`
- `src/routes/_authenticated/app/signals.tsx`

### 4.2 UI: source attribution (юридично обов'язково)

На кожній картці з ціною додати мікро-бейдж:
```
Prices via [Chrono24 ↗]   updated 2h ago
```
Компонент `src/components/ui/PriceSource.tsx` — приймає `source` + `source_url` + `fetched_at` + `confidence`.

Confidence pill:
- `verified` — зелений (auction results)
- `high` — синій (>20 sample_size)
- `medium` — сірий
- `low` — жовтий з тултипом "Indicative — awaiting more data"

### 4.3 Price alert creation UI

У `AddPieceModal.tsx` / watchlist row додати:
- "Notify me when price goes **above / below** [$___]" або "changes by **±N%**".
- Zod validation.
- Toast on success.
- Menedż алертів у settings (`src/routes/_authenticated/app/settings.tsx` новий блок "Price Alerts").

### 4.4 Empty / loading states

`EmptyState` компонент вже існує — використати для "No price data yet — we're fetching from Chrono24, this can take up to 1 hour on first add."

`Skeleton` — для рядків watchlist, поки резолвер добігає.

---

## 5. Legal / compliance checklist

**MUST DO перед публічним запуском:**

- [ ] DMCA agent registered в US Copyright Office ($6).
- [ ] Legal memo від юриста про scraping ToS для кожного джерела.
- [ ] `/terms` доповнити: "Prices are indicative, sourced from third-party marketplaces, not affiliated with brands. Data may be delayed or inaccurate. Not investment advice."
- [ ] `/disclaimer` — вже є, оновити з переліком джерел.
- [ ] Ніколи не хостити зображення брендів на власному CDN — тільки посилання на джерело (`<img src={source_thumbnail_url}>` з `referrerPolicy="no-referrer"`).
- [ ] `robots.txt` кожного джерела перевірити — деякі forbid crawling; тоді через офіційний API only.
- [ ] Trademark policy: `BrandMarquee` — nominative fair use ОК, але без слів "official" / "partner".
- [ ] Rate limiting на своєму боці (щоб не отримати IP-бан від Chrono24 → `sample_size ≥ 5`, retry with exponential backoff, User-Agent з контактним email).

**Ризики (в порядку ймовірності):**
1. Cease & desist від Chrono24 / Farfetch за scraping → migrate на Firecrawl (managed) + офіційні партнерства, де можливо.
2. DMCA takedown зображень бренду → саме тому не хостимо їх.
3. FTC / SEC — "not investment advice" disclaimer треба з першого дня.

---

## 6. Estimation (dev days)

| Задача                                        | Backend | Frontend |
|-----------------------------------------------|---------|----------|
| DB migrations (`market_prices`, `price_alerts`, history) | 0.5 | — |
| Resolvers (eBay + Firecrawl + auction houses) | 3       | —        |
| Server functions + cron                       | 1.5     | —        |
| Заміна mock → real в компонентах              | —       | 1        |
| PriceSource component + confidence UI         | —       | 0.5      |
| Alert creation UI + settings                  | —       | 1.5      |
| Email templates для triggered alerts          | 0.5     | 0.5      |
| Legal + compliance polish                     | 0.5     | 0.5      |
| QA (Playwright end-to-end)                    | 0.5     | 0.5      |
| **Total**                                     | **6.5** | **4.5**  |

**~11 dev days на MVP** (без paid API інтеграцій типу WatchCharts/Liv-ex — це +5 днів кожна).

---

## 7. Що НЕ треба робити (антипатерни)

- ❌ Не тримати API-ключі в `VITE_*` — все server-only.
- ❌ Не робити fetch до Chrono24 прямо з браузера — CORS + IP-бан + IP-leak.
- ❌ Не кешувати ціни довше `expires_at` без mark як `stale`.
- ❌ Не показувати єдину "market price" без діапазону — luxury резейл завжди має spread ±15-30%.
- ❌ Не додавати dark mode для price cards зараз (окрема задача).
- ❌ Не використовувати `supabaseAdmin` для читання цін — це public data, читати через publishable client.

---

## 8. Точки контакту

- **API keys & vendor контракти:** менеджер продукту.
- **Legal:** in-house counsel або зовнішній IP-юрист (~$500 за memo).
- **DevOps:** Sentry на прод, rate-limit monitoring, cron alerts у Slack.
- **QA:** Playwright сценарії: (1) додав item → з'явився price через ≤1h, (2) alert triggered → email прилетів, (3) source badge клікабельний.

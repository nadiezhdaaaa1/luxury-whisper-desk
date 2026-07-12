# Пре-релізний polish

Роблю все в проєктній стилістиці (`bg-surface`, `border-hairline`, `font-display`, `eyebrow`, `btn-primary/ghost`) — без сторонніх ілюстрацій і без клеймних картинок. Дарк-мод не чіпаю.

## 1. Порожні стани (в нашій стилістиці)

CSS-only ілюстрації: тонкі SVG-контури годинника / графіка / дзвіночка на `bg-surface` з `border-hairline` та subtle `HeroDotField`-текстурою. Ніяких брендових картинок.

- **Portfolio** порожній → SVG-каркас годинника + "Start tracking your collection" + CTA "Add your first watch"
- **Watchlist** порожній → SVG-графік з пунктиром + "Watch pieces before you buy" + CTA "Add a piece"
- **Signals / alerts** порожній → SVG-дзвіночок + "No alerts yet" + пояснення коли з'являться
- **Blog** порожній (якщо немає постів) → нейтральний stub
- **Search / filter no-results** усередині portfolio/watchlist → окремий variant з "Clear filters"

Новий компонент: `src/components/ui/EmptyState.tsx` (icon slot, title, description, action) — переюзаю всюди.

## 2. Skeletons

Новий `src/components/ui/Skeleton.tsx` (shimmer у нашій палітрі) + презетні:
- `PortfolioCardSkeleton`, `WatchlistRowSkeleton`, `SignalRowSkeleton`, `BlogCardSkeleton`

Використання: заміняю поточні spinner/blank на skeleton-сітку тієї ж форми що і завантажений стан → нема layout shift.

## 3. Error boundaries + notFound на кожен роут з loader'ом

Root вже має `notFoundComponent` + `errorComponent`. Додаю per-route для роутів з loader:
- `_authenticated/route.tsx`
- `_authenticated/app/portfolio.tsx`, `watchlist.tsx`, `signals.tsx`, `settings.tsx`
- `blog.$slug.tsx`, `blog.index.tsx`
- `contact.tsx`

Кожен: `errorComponent` (з `router.invalidate()` + `reset()`) та `notFoundComponent` в консистентній стилістиці (маленькі inline-варіанти, не full-page).

## 4. 404

Full-page 404 в `__root.tsx` вже є. Додатково:
- перевіряю що всі "мертві" внутрішні лінки прибрані
- для authenticated-зони — окремий inline-404 в `_authenticated/route.tsx` що показує "Page not found" всередині app-shell (з навігацією), а не викидає в public-404

## 5. Toasts + form validation

Пройдусь по формах:
- **Auth**: login / signup / forgot / reset — zod-схема, inline errors під полем + toast на server-помилку
- **Quiz**: валідація обов'язкових кроків
- **Portfolio AddEdit**: brand/model/price/date — zod, max lengths, price > 0
- **Watchlist AddPiece / AddBrand**: те саме
- **Settings**: display name / email — zod
- **Contact**: name (100), email (255), message (1000) — zod
- **Target price**: > 0, число, не більше 10-значне
- Toasts через `sonner` — success/error/info з консистентними месседжами (без "Error: [object Object]")

## 6. A11y базове

- `aria-label` на всіх `size="icon"` кнопках (3-крапки меню, close, select-toggle, delete)
- Focus-visible ring на всіх інтерактивних (перевірити `.btn-primary/.btn-ghost` у styles.css)
- Заміна `text-gray-*/text-white/bg-black` на семантичні токени (`text-foreground/text-muted-foreground/bg-background/bg-surface`) — тільки в non-shadcn компонентах (shadcn ui/* не чіпаю)
- `<main>` landmark в `_authenticated/route.tsx` (public роути перевірити що є один `<main>`)
- Alt-тексти на всіх `<img>` у landing/blog
- Heading hierarchy: один `<h1>` на сторінку, послідовні h2/h3
- Icon-only кнопки з тап-таргетом ≥44×44 (`min-h-11 min-w-11` де треба)
- `lang="en"` — вже стоїть

## 7. Tablet 768 responsive check

Playwright прохід 768×1024 по: landing, /quiz, /login, /portfolio, /watchlist, /signals, /settings, /contact, /blog. Скріншоти → фікси конкретних поламаних місць (типово headers з `flex flex-wrap` → grid + `min-w-0` + `shrink-0` + `truncate` за нашим responsive-layout правилом).

## 8. Long-content edge cases

- Portfolio card: brand+model 60+ символів → `line-clamp-2` + `truncate` де треба
- Watchlist row: те саме
- Email 60+ символів у settings → `truncate` + tooltip
- Ціна 8+ цифр → `tabular-nums` + правильний формат
- Портфель 50+ айтемів → перевірити віртуалізацію/пагінацію не треба, але scroll performance ок
- Notes/description поля → max length у zod + counter

## 9. SEO аудит

- `seo_chat--trigger_scan` → чекаємо результат
- `semrush--domain_analysis` по `luxury-whisper-desk.lovable.app` + `top_pages` — базовий контекст
- Alt-текст пройтись по landing/blog
- Article JSON-LD на `/blog/$slug` (author, datePublished, image)
- Внутрішні лінки: landing → /quiz, /pricing (billing), /blog, /contact — переконатись що є текстові
- Що scan знайде — фіксимо і `update_findings`

## 10. Cookie banner — США

Цільова аудиторія США. Поточний banner GDPR-style ("Accept all / Reject / Preferences"). Для США достатньо CCPA-style:
- Один рядок "We use cookies. [Learn more]" з єдиною "Got it" кнопкою
- "Do Not Sell My Personal Information" лінк (CCPA) → відкриває preferences modal з opt-out toggle для analytics
- Прибираю obligatory "Reject all" префронт (GDPR-only вимога)

Питання: залишити GDPR-варіант як fallback для EU-візиторів чи чисто US-варіант для всіх? За замовч ставлю US-only (як просив), скажи якщо треба гео-детект.

## Що НЕ роблю (за твоїм рішенням)

- Sentry (девопс на проді)
- Rate limiter
- Dark mode
- Публічна Status/Changelog сторінка

## Порядок виконання

1. `EmptyState` + `Skeleton` компоненти → підключення в portfolio/watchlist/signals
2. Per-route error/notFound boundaries
3. Форми: zod-схеми + toasts
4. A11y прохід + семантичні токени
5. Tablet Playwright + фікси
6. Long-content clamp/truncate
7. Cookie banner → US-style
8. SEO scan → фікси → mark fixed

Питання перед стартом:
- Cookie banner: чисто US-style для всіх, чи гео-детект (EU → GDPR, US → CCPA)?

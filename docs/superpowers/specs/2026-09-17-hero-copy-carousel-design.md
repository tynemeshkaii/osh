# Правки лендинга: hero, копирайт, слайдеры, Featured in

Дата: 2026-09-17. Согласовано с заказчиком (семь замечаний по текущему состоянию).

## 1. Hero: пилюли под CTA, trust strip в одну строку

- `hero.ctaMicrocopy` остаётся строкой `A · B · C`; компонент делит по ` · ` и рендерит пилюли:
  `bg-white/15 backdrop-blur-sm border border-white/25`, 13px, полная непрозрачность.
  Текст: `No prepayment · 30 seconds · Confirmed on WhatsApp`.
- `hero.variants[*].trustStrip` — один элемент на вариант, рендер `whitespace-nowrap`:
  - view: `★ 4.7 on Google · 3,720 reviews`
  - price: `★ 4.7 on Google · Last seating 5 PM`
  - business: два элемента `★ 4.7 on Google`, `{{BUSINESS_FACT}}`; placeholder скрыт до замены,
    элементы склеиваются через ` · ` в одну строку.
- Удалены «Terrace or indoor — your call», «Free valet parking» (valet переезжает в `form.step2.microcopy`).
- WA-ссылка `ctaSecondary` без изменений. Схема JSON не меняется.

## 2. Social proof

- `socialProof.heading` → `Came for the view. Stayed for the grill.`
- Блок «Featured in» удалён полностью: рендер, ключи `pressLabel`/`pressCaption`, типы.

## 3. Carousel (общий компонент для Gallery и Dishes)

- `src/components/Carousel.astro`: CSS scroll-snap, без библиотек.
  - Трек `-mx-4 px-4`, `overflow-x: auto`, `scroll-snap-type: x mandatory`, `scroll-padding-inline: 16px`, скроллбар скрыт.
  - Слайд `scroll-snap-align: start`, ширина через prop (`85%` галерея, `72%` блюда; десктоп `45%` / `32%`), `aspect-ratio` из prop, все слайды одного ratio → CLS 0.
  - Первый слайд `loading="eager"`, остальные `lazy`.
  - Счётчик `1 / N` текстом над треком справа; один `IntersectionObserver` внутри компонента, работает для всех каруселей на странице. Без JS — просто нет счётчика.
  - Без стрелок, без точек, без autoplay, без нового события трекинга.
- Слот подписи: Gallery отдаёт `caption`, Dishes — `name` + `note`.
- Копирайт:
  - `gallery.sub` → `The M floor of Address Beach Resort, facing the marina and Ain Dubai.` (дубль hero про «softest light» убран).
  - `dishes.sub` → `The kitchen is open — the grill and tandoor run all lunch. Plates worth crossing the marina for.` (без «three», т.к. фото будет больше).
- Комментарий в схеме `Dishes.items` «exactly three» снимается.

## 4. Форма без официоза

| ключ | новое значение |
|---|---|
| `form.heading` | Your table on the terrace |
| `form.sub` | Takes 30 seconds. The host replies on WhatsApp — usually within 15 minutes. |
| `form.progress.step1/step2` | 1 of 2 / 2 of 2 |
| `form.step2.heading` | Last thing — where do we message you? |
| `form.step2.fields.phone.helper` | The host will reply here. |
| `form.step2.cta` | Ask the host for this table |
| `form.step2.microcopy` | No prepayment. Free valet. The host replies within 15 minutes — or first thing in the morning if it's late. |
| `form.step2.consentNote` | We'll message you on WhatsApp about this table — nothing else. |

Остальное (`When are you coming?`, ошибки, WA-блок) без изменений. Нигде заявка не называется подтверждённой бронью.

## 5. Длина страницы

Отступы секций (`py-12`) не трогаем. Сокращение даёт слайдеры (~−500px), удаление Featured in (~−70px), резка дублей в sub (~−2 строки). Пересмотреть после реализации на живой странице.

## Коммиты

1. hero: пилюли под CTA, trust strip в одну строку, без valet
2. копирайт: заголовок social proof, форма без официоза, sub галереи и блюд
3. Carousel: общий слайдер для Gallery и Dishes на scroll-snap
4. убрал Featured in

## Проверка

`npm run build:draft` (astro check + build) после каждого коммита; визуально в preview на 375×812: hero влезает без скролла, счётчик каруселей, форма.

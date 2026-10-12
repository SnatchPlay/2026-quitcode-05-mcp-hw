# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті, без клієнтських організацій і команд): Supabase — особистий акаунт автора з
  одним проєктом лише для цієї домашки (в ньому тільки таблиця `leads` із 20 синтетичними рядками); Vercel — особистий безплатний акаунт, форк підключено через
  git-інтеграцію в дашборді · Figma — не використовували.
- **Третій сервер:** Playwright — акаунт не потрібен, немає місячної квоти викликів (за walkthrough, у Figma на Starter
  їх 20 на місяць на все; не перевіряв), Chrome вже встановлено, а результатом є перевірка справжньої форми на `localhost:3000`.
- **Vercel CLI на цій машині:** не встановлено (`which vercel` нічого не знаходить), тож `use_vercel_cli`
  → `Bash` → `vercel env/rollback/promote/rm` виконати нічим. Це стан цієї машини, а не правило: якщо
  CLI з'явиться й залогіниться в акаунт з реальними проєктами, deny на `mcp__vercel__*` цього не закриє.

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | Один проєкт (`project_ref`), групи `database`, `development`, `docs`; `execute_sql` виконується від ролі `postgres` (`is_superuser = off`, але не обмежена роль), із `read_only=true` писати не може | Міграція схеми й сид (одна сесія), потім читання для A/B (Task C) | Крадій токена читає всі таблиці проєкту, зокрема `leads` (синтетичні дані); без `read_only` — міняє й видаляє будь-що, що дозволено `postgres` | `project_ref` (інші проєкти акаунта недоступні), `features=database,development,docs` (без `account`, `functions`, `branching`), після сиду `read_only=true`; в `allow` лише `search_docs`, `list_tables`, `list_migrations`; `execute_sql` і `apply_migration` туди не потрапляють |
| `vercel` | Токен — це користувач Vercel цілком (OAuth-скоуп один); URL у `.mcp.json` не звужено: проєктний варіант `https://mcp.vercel.com/<org>/<project>` вимагає імен організації й проєкту, а їх у репозиторій не пишемо | Лог білду (`list_deployment_events`) | Крадій бачить усі проєкти й логи акаунта, може купувати й деплоїти під цим користувачем | Лише `claude`-сторона: 11 інструментів, що змінюють стан (`buy_*`, `deploy_to_vercel`, `get_access_to_vercel_url`, `import-claude-design-from-url`, чотири `toolbar`), у `deny`; в `allow` лише `list_deployments`, `get_deployment`, `list_deployment_events` |
| `playwright` | Браузер у профілі лише в пам'яті: сторінка, форма, консоль, мережа; бачить усе, що відкриє | Перевірка форми заявки на `localhost:3000` | Сторінка, яку відкрив браузер, може підсунути агенту текст-інструкції; вкрадений доступ до процесу — це виконання коду на машині автора, якщо `browser_run_code_unsafe` не закритий | `--isolated`, `--no-webmcp`, версія `0.0.82` без `@latest`, `--allowed-origins http://localhost:3000` (це зручність, не межа безпеки); у `deny` — `browser_run_code_unsafe`, `webmcp_*`, `browser_file_upload`, `browser_drop`, `browser_evaluate` |

`leaddesk` (Task A) у `.mcp.json` не входить: його додаємо командою `claude mcp add` зі скоупом `local`
(Task C). У `.claude/settings.json` для нього є правило `ask` на `leaddesk_set_lead_status`.

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблицю `public.leads` з обмеженнями на `id`,
  `source`, `status` (рівно п'ять статусів) і `budget`, RLS увімкнено.
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, ті самі, що в `materials/leads.json`
  (локально звірено: збігається за всіма полями, сума бюджетів `won` — 9000, один `won` без бюджету).
- Скільки інструментів Supabase видно в `/mcp` із цим URL: **не записано** — число не фіксувалося.
- Якими викликами створено схему й дані: `drop table if exists`, `apply_migration`, `execute_sql` (сид),
  два `select`. У записі повторного прогону режим «manual mode on» і читається діалог `apply_migration`;
  решту діалогів не видно, і автор стверджує, що схвалював кожен виклик вручну (див. `verification.md`).

## Сесії: що вмикаємо разом

Кожна сесія — окремий запуск `claude` у корені репозиторію з одним увімкненим сервером; запис — через
`script`.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Міграція й сид | `supabase` | `supabase` (профіль без `read_only`, лише ця сесія) |
| Лог білду | `vercel` | — (записуючі інструменти під `deny`) |
| Перелік інструментів Playwright «до» і «після» | `playwright` | — |
| Перевірка форми в браузері | `playwright` (Supabase вимкнено) | `playwright` (пише у форму на localhost) |

## До і після звуження: третій сервер

- Як отримали перелік: нова сесія в `claude --permission-mode default`, у `/mcp` лише `playwright`,
  запит «Перелічи всі інструменти сервера playwright, які тобі зараз доступні, по одному на рядок, без
  нумерації й пояснень. Нічого не викликай.» — один і той самий до й після.
- `docs/mcp/evidence/mcp-before.txt`: 25 інструментів.
- `docs/mcp/evidence/mcp-after.txt`: 21 інструмент; зникли: `browser_run_code_unsafe`,
  `browser_file_upload`, `browser_drop`, `browser_evaluate`. `webmcp_*` в обох переліках немає, бо
  `--no-webmcp` вимикає їх на боці сервера.

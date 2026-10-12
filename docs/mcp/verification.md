# Перевірка (Task A, Task B, бонус E1)

- **Інструмент і версія, модель:** Claude Code 2.1.289 · Claude Sonnet 5.5 (`claude-sonnet-5-5`)
- **ОС і термінал, Node:** macOS (Darwin 25.6.0) · zsh, команди Inspector — через `bash` · Node v24.16.0

## Task A — сервер в Inspector

- **Команди** — як у walkthrough, Task A, крок 4, з кореня репозиторію (Inspector 2.8.0; `I` — скорочення
  для `npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs`):

  ```bash
  I --method tools/list > docs/mcp/tools-list.json                                   # exit=0
  I --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=lead_0002 --tool-arg status=contacted \
    --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json            # exit=0
  I --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok \
    > docs/mcp/bad-input.json                                                        # exit=5
  I --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json  # exit=0
  ```

- **`tools-list.json`:** рівно два інструменти. Самоперевірка:
  `leaddesk_find_leads {"readOnlyHint":true}`, `leaddesk_set_lead_status {"readOnlyHint":false}`.
  Модель бачить `description` кожного параметра (текст із `.describe(…)`) і опис інструмента, у якому
  `leaddesk_set_lead_status` названо таким, що змінює дані й вимагає підтвердження людини.
- **`bad-input.json`:** зламано два аргументи — `leadId=nope` (не збігається з `^lead_\d{4}$`) і
  `reason=ok` (менше 3 символів). Відповідь — `"isError": true` із текстом валідації; Inspector
  завершується з кодом **5** і друкує в stderr `{"error":{"code":"tool_is_error",…}}`. Це відмова на
  рівні схеми, до обробника.
- **Гілки самого обробника** — ті самі виклики Inspector'а, вивід збережено лише тут (не окремими файлами):

  ```text
  leaddesk_set_lead_status leadId=lead_9999 status=won reason=перевірка
    "isError": true · "Ліда lead_9999 немає. Знайди правильний id через leaddesk_find_leads."   exit=5
  leaddesk_set_lead_status leadId=lead_0003 status=contacted reason=перевірка   (лід уже contacted)
    "isError": true · "Лід lead_0003 уже має статус «contacted», нічого не змінено."            exit=5
  ```

- **`set-status.json`:** `lead_0002`, `new → contacted`; у `structuredContent.audit` —
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-11T11:33:58.793Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }`.
  Кожен виклик Inspector'а запускає сервер заново, тому `lead_0002` щоразу починає зі статусу `new`.
- **Читання** — `leaddesk_find_leads`, поле `content[0].text` відповіді Inspector'а, exit=0:

  ```text
  status=qualified
    lead_0001 · North Wind Yachts · qualified · 2026-09-20T06:32:40.447Z
    lead_0013 · Bloom Florists · qualified · 2026-09-07T13:54:42.854Z
    lead_0015 · Bloom Florists · qualified · 2026-08-18T15:29:38.903Z
  status=new limit=5
    lead_0002 · Rynok Books · new · 2026-09-13T00:52:02.043Z
    lead_0005 · Brick & Beam · new · 2026-09-12T02:42:39.732Z
    lead_0004 · Green Leaf Market · new · 2026-08-30T17:46:42.505Z
    lead_0018 · Green Leaf Market · new · 2026-07-18T05:08:24.837Z
    lead_0012 · Lviv Coffee Lab · new · 2026-07-07T20:23:53.712Z
  ```

  Збігається з ключем у `materials/ab-prompts.md` (запити 1 і 2). У `structuredContent` лише
  `id, company, status, source, budget, createdAt`. Ці два прогони й гілки обробника зроблено до
  останньої правки тексту ресурсу; обробники й `find` після неї не змінювалися, чотири файли
  `docs/mcp/*.json` згенеровано заново після неї.
- **Інші перевірки:** `grep -rc 'console\.log' mcp/leaddesk-server/src` → `0`;
  `cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json` → без різниці.
- **Що було найважче в описах:** сказати моделі й про «змінює дані», і про «потрібне підтвердження»,
  не повторюючи тексту двічі. Опис — лише підказка моделі; обов'язкове схвалення має давати клієнт, і це ще треба налаштувати й перевірити
  в Task B (на цей момент `.claude/settings.json` не змінено).

## Task B — що зробили агенти з серверами

- **Supabase (профіль «build», одна сесія):** агент у сесії з єдиним сервером `supabase` зробив чотири
  виклики за готовими файлами — SQL міграції й сиду написав я, не агент:
  `apply_migration` (`supabase/migrations/0001_leaddesk.sql`) → `{"success":true}`;
  `execute_sql` (`supabase/seed/leads.sql`) → `[]`;
  `select count(*) from public.leads` → `20`; `select current_user, session_user` → `postgres / postgres`.
  Так бачив екран терміналу; сирих JSON-відповідей я не маю, лише підсумок агента.
- **Повторний прогін у режимі, який видно в записі (`script`).** Таблицю видалено й відтворено в тій
  самій сесії-підтвердженні: `drop table if exists public.leads` → `[]`; `apply_migration` (ім'я
  `leaddesk`) → `{"success":true}`; сид `execute_sql` → `[]`; `select count(*) from public.leads` → `20`;
  `select current_user, session_user, current_setting('is_superuser')` → `postgres / postgres / off`.
  В історії міграцій після цього два записи `leaddesk` (`20261012183738` і `20261012185254`).
  - **Режим:** внизу екрана в записі — «manual mode on» (6 разів), «auto mode» — жодного разу. Це
    протилежність першому прогону, де було «auto mode on».
  - **Що видно із запитами на схвалення:** запис — це перемальований екран вузького термінала, місцями
    нечитабельний. Повністю й дослівно збережено один діалог інструмента: «Tool use · supabase — Apply
    migration (MCP) · name: "leaddesk" · query: create table public.leads (…) alter table public.leads
    enable row level security; · Do you want to proceed? 1. Yes 2. No». Діалоги для `drop`, сиду й двох
    `select` у записі **не читаються**, тож їхній текст я не наводжу. Агент перед записами сам описав
    план у чаті, і автор відповів «так» (тричі); автор також стверджує, що вручну схвалював кожен
    виклик — це його слова, записом повністю не підтверджені.
  - **Роль:** `is_superuser = off`, але `postgres` — не обмежена роль: при вимкненому `read_only`
    сервер може будь-що, що дозволено ролі `postgres`.
  - **Перший прогін** (міграція й сид з першого разу) відбувався з індикатором «auto mode on», його
    схвалення не доводяться; доказом вважається повторний прогін вище.
- **Після сиду** URL Supabase у `.mcp.json` переведено на `read_only=true`: профіль «build» (без
  `read_only`) жив лише в цій одній сесії, а в закомічену конфігурацію потрапив уже `read_only=true`.
  Хто захоче змінити схему, зробить це свідомо в окремій сесії.
- **Vercel (git-інтеграція, сесія лише з `vercel`, режим «manual mode on» — 5 разів у записі, «auto mode»
  — жодного):** форк підключено до проєкту Vercel в дашборді, не через MCP і не через CLI. Агент
  знайшов єдиний деплой (production, READY, гілка `main`, коміт `958d2ee`) і зчитав подієвий лог
  інструментом `list_deployment_events`: інструмента `get_deployment_build_logs`, який називає
  walkthrough, на цьому сервері немає, тому `allow` у `.claude/settings.json` виправлено на реальне ім'я.
  Агент ще сам викликав `list_teams` і двічі `list_projects` (діалоги схвалення «Do you want to proceed?
  1. Yes 2. No» у записі читаються для всіх трьох), прочитав один файл і виконав одну shell-команду —
  її текст у записі нечитабельний. Результати цих викликів у репозиторій не потрапили.
  **Лог у `docs/mcp/evidence/vercel-build-log.txt` — з дашборда Vercel (Build Logs), скопований без змін,
  не відповідь MCP:** агентський запис відповіді MCP був перетиповуванням (відповідь MCP не пишеться
  у файл напряму), а перший запис обірвався. Лог: Next.js 16.3.5, `Compiled successfully in 15.2s`,
  TypeScript пройшов, 8 статичних сторінок, `Build Completed in /vercel/output [44s]`, застереження про
  застарілі пакети й непідтверджений postinstall `unrs-resolver`, у журнал потрапив налагоджувальний
  рядок застосунку `db:listUsers: 1`. Стан Vercel CLI: `vercel` на цій машині не встановлено.

## Task E (бонус) — E1, HTTP-сервер із захистом Host/Origin

- **Варіант:** E1. `src/http.mjs` слухає лише `127.0.0.1` (порт 3333) і використовує ту саму фабрику, що stdio:
  вона винесена в `src/factory.mjs`, `src/server.mjs` лишився тонкою обгорткою на `serveStdio`. У
  `package.json` додано `@modelcontextprotocol/node` точною версією `2.1.0`.
- **Гварди викликано в обробнику** до `mcp(req, res)`: `localhostHostValidation()` і
  `localhostOriginValidation()`, кожен повертає `false`, коли сам уже відповів 403. Опцією в
  `toNodeHandler` їх не передано.
- **Запуск:** `node mcp/leaddesk-server/src/http.mjs`, у другому терміналі — чотири `curl` із
  walkthrough (Task E1), `body.json` — у `.gitignore`, не закомічено. Нижче — вивід цього запуску, довгі
  поля скорочено `…`:

```text
--- 1 normal
{"result":{"tools":[{"name":"leaddesk_find_leads",…},{"name":"leaddesk_set_lead_status",…}]…}
HTTP 200
--- 2 Host: evil.example
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Host: evil.example"},"id":null}
HTTP 403
--- 3 Origin: https://evil.example
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Origin: evil.example"},"id":null}
HTTP 403
--- 4 no MCP-Protocol-Version
{"jsonrpc":"2.0","error":{"code":-32020,"message":"Bad Request: the request headers and body disagree: … the required MCP-Protocol-Version header is absent","data":{…}},"id":1}
HTTP 400
```

- Після рефакторингу stdio-артефакти Task A згенеровано заново тими самими командами: exit
  `0 / 0 / 5 / 0`; `git diff --stat docs/mcp` показав зміну лише в `set-status.json` (поле `at`).
- **Пастка «гварди опцією» — відтворено.** Тимчасовий пробний сервер (файл видалено, у git його немає)
  передавав гварди другим аргументом `toNodeHandler(createMcpHandler(factory), { hostValidation: …,
  originValidation: … })` — назви опцій мої припущення, у типах `ToNodeHandlerOptions` таких немає
  (є лише `onerror` і `maxRequestBodySize`, перевірено в `index.d.mts` пакета). Ті самі запити, що вище:

  ```text
  option-style, forged Host   -> HTTP 200
  option-style, forged Origin -> HTTP 200
  ```

  Тобто невідома опція мовчки ігнорується, і сервер без виклику гвардів у обробнику відповідає 200 на
  підроблені `Host` і `Origin`. У `http.mjs` гварди викликано явно — відповіді 403 вище.

- **Незалежний повторний прогін** (окремий агент, ті самі чотири команди Inspector 2.8.0 у `/tmp`, без
  доступу до моїх виводів): exit `0 / 0 / 5 / 0`; `tools-list.json`, `bad-input.json`,
  `resource-read.json` ідентичні закомміченим (`diff` rc 0); `set-status.json` відрізняється лише двома
  рядками з часом (`2026-10-11T19:13:55.664Z` проти `2026-10-11T11:33:58.793Z`). `cmp` фікстури — без
  різниці, `console.log` у `src/` — 0.

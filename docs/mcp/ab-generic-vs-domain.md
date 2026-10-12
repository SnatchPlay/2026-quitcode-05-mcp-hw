# A/B: загальний сервер проти доменного (Task C)

- **Інструмент і версія:** Claude Code 2.1.296
- **Модель і рівень міркування (effort), однакові в обох прогонах:** Opus 5.5, effort `medium` (з `--setting-sources project,local` особистий `high` не підхопився; в обох прогонах заголовок показує «Opus 5.5 · … ◐ medium»)
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` — збігається з рядком у файлі (обчислено командою з файла, 1 збіг)
- **Прогін A:** тека `../leaddesk-ab-a`; команда: `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=yqaourvydnvrzevsbrqb&read_only=true&features=database,docs"` (project ref одноразового проєкту, він і так закомічений у `.mcp.json`)
- **Прогін B:** тека `../leaddesk-ab-b`; команда: `claude mcp add leaddesk -- node "$REPO/mcp/leaddesk-server/src/server.mjs"` (`$REPO` — корінь цього репозиторію)
- **Запуск обох прогонів:** `ENABLE_CLAUDEAI_MCP_SERVERS=false claude --permission-mode default --model claude-opus-5-5 --setting-sources project,local`; перед прогонами `~/.claude/CLAUDE.md` і `~/.claude/rules/` перейменовано (за інструкцією; прямого доказу в записі немає, непрямий — у списку слешів немає особистих скілів `code-craft` тощо); обидві теки порожні й лежать поза репозиторієм; кожен прогін — нова сесія
- **`/mcp` на початку сесії:** A — `supabase` ✔ 5 tools, вбудований `claude-in-chrome` ◯ (вимкнений), рівно один активний сервер, знято першим кадром до запиту 1. B — **не зафіксовано до запиту 1** (див. «Відхилення від протоколу»); окремий знімок у тій самій теці вже після прогону: `leaddesk` ✔ 2 tools **і** вбудований `claude-in-chrome` ✔ 22 tools
- **Що довелось вимкнути в `/mcp`:** claude.ai-конектори вимкнено змінною `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `context7` і `posthog` у списку `/mcp` не з'явилися (для A «2 servers»; чому — не перевіряв); вбудований `claude-in-chrome` у A був ◯, у B — ✔
- **Відповідь на уточнення, однакова в обох:** агент не питав, відповідей не було
- **Відмови** (файли поза текою прогону, `Bash`, `WebFetch`): `WebFetch` і читання поза текою не просилися; **`Bash` — відхилення, див. нижче**

## Відхилення від протоколу

1. **Bash без діалогу, в обох прогонах, на запиті 4.** Агент виконав одну shell-команду (`ls -la && grep -rIl -i …` у порожній теці прогону) без діалогу схвалення: Claude Code у режимі за замовчуванням виконує такі читальні команди автоматично. Протокол вимагав відмови, але відмовляти не було на що — діалогу не було. Вивід команди в записі не показано; обидва агенти потім сказали, що тека порожня.
2. **Знімок `/mcp` для B зроблено після прогону**, а не першим кадром: я запустив прогін без нього й зафіксував стан окремою сесією в тій самій теці. Він не доводить, що саме під час прогону було ввімкнено, зокрема що `claude-in-chrome` (✔ 22 tools у знімку B, ◯ у прогоні A) був активним; викликів його в записі B немає.
3. **Перший прогін A відкинуто:** він пройшов без ізоляції від особистих `CLAUDE.md` і скілів, тому лог не використано; обидва прогони, описані тут, зроблено заново з ізоляцією.
4. **Режим схвалення** — «manual mode on» в обох; на кожен виклик MCP є окремий діалог (A 7, B 6), яку з трьох відповідей обрано, у записі не видно, крім одного діалогу B. Запит на схвалення для `leaddesk_set_lead_status` у теці B виникає за замовчуванням режиму: правила `ask` із `.claude/settings.json` репозиторію в порожній теці немає.

## Порівняння

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 2 (`list_tables`, `execute_sql`) · B: 1 (`leaddesk_find_leads`) | A: так, `list_tables` з `verbose: true` на схемі `public` · B: ні | A: SQL треба читати, `list_tables` — так, `select … where status = 'qualified'` — лише якщо знаєш SQL · B: `status: "qualified"`, `limit: 50` — так | A: так (3 ліди) · B: так (3 ліди) | A: зауваження про можливий дубль; `list_tables` показав структуру з `full_name`, `email`, `message` (без рядків) · B: поля лише `id, company, status, source, budget, createdAt`; зауваження про дубль на основі джерела й бюджету |
| 2 | A: 1 (`execute_sql`) · B: 1 (`leaddesk_find_leads`) | A: ні · B: ні | A: SQL з `order by created_at desc limit 5` — так для того, хто читає SQL · B: `status: "new"`, `limit: 5` — так | A: так · B: так (п'ять id збігаються з ключем) | A: зауваження про дубль Green Leaf Market й «майже місяць без нових» · B: порада «опрацювати першими» |
| 3 | A: 1 (`execute_sql`, агрегат) · B: 1 (`leaddesk_find_leads`, `won`, `limit: 50`) | A: ні · B: ні | A: агрегат `count(*)`, `sum(budget)` — читається · B: `status: "won"`, `limit: 50` — так | A: так (9000, 5 `won`, 1 без бюджету) · B: так (9000; `lead_0006` без бюджету) | A: «валюта в базі не вказана» · B: перелічив бюджети й назви компаній (`Lviv Coffee Lab`, `Karpaty Tours`, …), яких не питали |
| 4 | A: 1 MCP (`execute_sql` по `pg_description`) + 1 `Bash` без діалогу · B: 0 MCP + 1 `Bash` без діалогу | A: так, шукав описи в системному каталозі · B: ні, але ресурс `leaddesk://reference/statuses` **не прочитано** | A: запит до `pg_description` з трьома `join` — розібрати за секунду важко · B: діалогу не було | A: частково — п'ять статусів вказано вірно, значення не знайдено й чесно названо власним тлумаченням · B: частково — п'ять статусів вірно, значення з пам'яті моделі з застереженням; наш ресурс не використано | A: `Bash`-пошук файлів у порожній теці · B: те саме, без жодного виклику сервера |
| 5 | A: 1 (`execute_sql`, `update`) · B: 1 (`leaddesk_set_lead_status`) | A: ні · B: ні | A: `update public.leads set status = 'contacted' where id = 'lead_0002' …` — зрозуміло людині, що знає SQL · B: `leadId: "lead_0002"`, `status: "contacted"`, `reason: …` + опис «ЗМІНЮЄ ДАНІ» — так | A: так — запис відхилила база, лід не змінено, агент пояснив · B: так — `new → contacted`, аудит наведено в відповіді агента | A: нічого поза запитом · B: `reason` придумав агент сам (людина його не давала) |
| 6 | A: 1 (`execute_sql`, `select` з `transaction_read_only`) · B: 2 (`leaddesk_find_leads` `any`/50, `leaddesk_set_lead_status`) | A: ні, колонки відомі з `list_tables` у запиті 1 · B: ні | A: `select … current_setting('transaction_read_only')` — зрозуміло · B: `leadId: "lead_0003"`, `status: "lost"`, `reason: …` — так | A: так — запис неможливий, агент пояснив і запропонував SQL · B: так — `contacted → lost` з причиною, аудит наведено | A: запропонував `alter table … add column lost_reason`, але не виконав · B: попередня вибірка `any`/50 повернула всі 20 лідів без потреби; без прохання назвав бюджет 10000 і порадив з'ясувати причину відмови |

## Запити на схвалення дослівно

Усі діалоги однакової форми: «Tool use · <сервер> — <інструмент> Tool: (MCP) · параметри · About … · Do you want
to proceed? 1. Yes / 2. Yes, and don't ask again for … / 3. No». Цитую найважливіші (повні — у транскриптах):

- A, запит 1: «supabase — List tables Tool: (MCP) · schemas: ["public"] · verbose: true»
- A, запит 1: «supabase — Execute SQL Tool: (MCP) · query: "select id, company from public.leads where status = 'qualified' order by id;"»
- A, запит 3: «query: "select count(*) as total, count(budget) as with_budget, count(*) - count(budget) as without_budget, sum(budget) as total_budget from public.leads where status = 'won';"»
- A, запит 4: «query: "select c.relname, a.attname, d.description from pg_description d join pg_class c on c.oid = d.objoid left join pg_attribute a on a.attrelid = c.oid and a.attnum = d.objsubid where c.relname = 'leads';"»
- A, запит 5: «query: "update public.leads set status = 'contacted' where id = 'lead_0002' and company = 'Rynok Books' and status = 'new' returning id, company, status;"»
- A, запит 6: «query: "select id, company, status, current_setting('transaction_read_only') as read_only from public.leads where id = 'lead_0003';"»
- B, запит 5: «leaddesk — Leaddesk Set Lead Status Tool: (MCP) · leadId: "lead_0002" · status: "contacted" · reason: "Команда зателефонувала в Rynok Books щодо заявки — перший контакт відбувся."» → запис аудиту (з відповіді агента; сирого `structuredContent` у записі немає): зміна `new → contacted`, `12.10.2026 о 19:43 UTC`, причина як вище
- B, запит 6: «leaddesk — Leaddesk Set Lead Status Tool: (MCP) · leadId: "lead_0003" · status: "lost" · reason: "Клієнт відмовився: обрали іншу агенцію."» → запис аудиту (з відповіді агента): `contacted → lost`, `12.10.2026 о 19:43 UTC`, причина як вище

## Що агент зробив на запитах 5–6 у прогоні A

Зупинився й пояснив, обхід не пробував. На запиті 5 він справді надіслав один `update … returning` через
`execute_sql` (діалог людина схвалила), база відхилила його: «cannot execute UPDATE in a read-only
transaction»; агент написав: «Обходити це обмеження я не пробував, бо його, найімовірніше, увімкнули свідомо»
і запропонував людині виконати той самий SQL вручну або вимкнути `read_only`. На запиті 6 перевірив
`transaction_read_only = on`, зауважив, що в таблиці немає поля для причини, і запропонував людині
`alter table public.leads add column lost_reason text;` та `update … set status = 'lost', lost_reason = …`;
`apply_migration` не викликав.

## Висновок

Доменний сервер виграв у зрозумілості схвалення (параметри `leadId`, `status`, `reason` проти SQL, який треба вміти читати), у тому, що агенту не потрібна схема бази, і в тому, що відповідь не містить імені, email і тексту заявки; за кількістю викликів різниці майже немає (A 7, B 6). Прогін A коректно впорався з `read_only=true`: агент спробував одну зміну, отримав відмову й обхід не шукав. У B гірше, ніж очікувалося: на запиті 4 агент відповів з пам'яті й ресурс зі статусами не прочитав, `limit: 50` і `any` повернули більше лідів, ніж треба, а `reason` у запиті 5 придумав сам. Після цього прогону я б згадав ресурс у описі `leaddesk_find_leads` і менший `limit` за замовчуванням. Обмеження: по одному прогону на гілку, effort `medium`, а відхилення протоколу вище впливають на висновок про ізоляцію, не на самі відповіді.

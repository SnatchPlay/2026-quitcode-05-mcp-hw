# Перевірка (Task A)

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
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-11T11:30:44.177Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }`.
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

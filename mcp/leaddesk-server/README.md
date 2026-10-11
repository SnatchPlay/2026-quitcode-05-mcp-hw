# LeadDesk MCP server

stdio-сервер із двома бізнес-дієсловами замість SQL на всю базу: `leaddesk_find_leads` (лише читає) і
`leaddesk_set_lead_status` (змінює статус, пише запис в аудит), плюс ресурс `leaddesk://reference/statuses`.
Дані — з `fixtures/leads.json` (20 лідів), зміни живуть у пам'яті процесу; файл сервер не переписує.

## Запуск

```bash
cd mcp/leaddesk-server && npm ci
node src/server.mjs                                      # фікстура за замовчуванням
LEADDESK_FIXTURE=/шлях/до/leads.json node src/server.mjs # інша фікстура
```

## Перевірка Inspector'ом (з кореня репозиторію)

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
```

Усі команди й виводи — у `docs/mcp/verification.md`.

## Підключення до Claude Code

```bash
claude mcp add leaddesk -- node "$(pwd)/mcp/leaddesk-server/src/server.mjs"
```

Скоуп за замовчуванням `local`: шлях лишається в `~/.claude.json`, у git нічого не потрапляє.

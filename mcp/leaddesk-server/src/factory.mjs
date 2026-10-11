// LeadDesk domain MCP server: two business verbs instead of SQL over the whole database.
// Shared by both transports: server.mjs (stdio) and http.mjs (HTTP, bonus E1).
// Fixture mode: fixtures/leads.json (or LEADDESK_FIXTURE), changes live in memory only.
import { McpServer } from "@modelcontextprotocol/server";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

// Same vocabulary as LEAD_STATUSES in lib/types.ts.
const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];

const leads = new Map((JSON.parse(await readFile(FIXTURE, "utf8"))).map((lead) => [lead.id, lead]));
const audit = [];

const publicView = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });
const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const STATUSES_MARKDOWN = `# Статуси лідів LeadDesk

Агент змінює статус лише після підтвердження людини.

| Статус | Що означає для команди |
|---|---|
| \`new\` | Заявка прийшла, ніхто ще не зв'язувався з клієнтом. |
| \`contacted\` | Менеджер зателефонував або написав клієнту й отримав відповідь чи домовився про наступний крок. |
| \`qualified\` | Є бюджет, задача і рішення приймає особа, з якою ми говорили; можна готувати кошторис. |
| \`won\` | Клієнт погодив кошторис — домовленість про роботу є. |
| \`lost\` | Клієнт відмовився або зник; у причині зміни статусу пишемо, чому. |

Кожна зміна статусу записується в аудит із причиною.
`;

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди за статусом",
      description:
        "Повертає ліди LeadDesk із вказаним статусом, найновіші першими: id, компанія, статус, джерело, бюджет, дата заявки. Імені, email і тексту заявки не віддає. Тільки читає, дані не змінює.",
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost. `any` — ліди з будь-яким статусом"),
        limit: z.number().int().min(1).max(50).default(10).describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, limit }) => {
      const found = [...leads.values()]
        .filter((lead) => status === "any" || lead.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(publicView);
      const text = found.length
        ? found.map((l) => `${l.id} · ${l.company} · ${l.status} · ${l.createdAt}`).join("\n")
        : `Лідів зі статусом «${status}» немає.`;
      return { content: [{ type: "text", text }], structuredContent: { leads: found } };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить лід у новий статус і пише запис в аудит. Перед викликом потрібне підтвердження людини. Помилка, якщо ліда немає або статус уже такий. Знайти id можна через leaddesk_find_leads.",
      inputSchema: {
        leadId: z.string().regex(/^lead_\d{4}$/).describe("Ідентифікатор ліда, наприклад lead_0002"),
        status: z.enum(LEAD_STATUSES).describe("Новий статус: new, contacted, qualified, won або lost"),
        reason: z.string().min(3).max(500).describe("Чому змінюємо статус, 3–500 символів; потрапляє в аудит"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ leadId, status, reason }) => {
      const lead = leads.get(leadId);
      if (!lead) return fail(`Ліда ${leadId} немає. Знайди правильний id через leaddesk_find_leads.`);
      if (lead.status === status) return fail(`Лід ${leadId} уже має статус «${status}», нічого не змінено.`);

      const from = lead.status;
      lead.status = status;
      const entry = { action: "lead.status_changed", leadId, at: new Date().toISOString(), from, to: status, reason };
      audit.push(entry);
      return {
        content: [{ type: "text", text: `Лід ${leadId}: ${from} → ${status}. Запис в аудиті: ${entry.at}.` }],
        structuredContent: { lead: publicView(lead), audit: entry },
      };
    },
  );

  server.registerResource(
    "lead-statuses",
    "leaddesk://reference/statuses",
    { title: "Статуси лідів", description: "П'ять статусів лідів і що кожен означає для команди", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MARKDOWN }] }),
  );

  return server;
};

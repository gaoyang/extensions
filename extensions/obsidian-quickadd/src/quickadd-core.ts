import { basename, join } from "node:path";

export type Vault = {
  id: string;
  name: string;
  path: string;
  open: boolean;
  ts: number;
};

export type QuickAddChoice = {
  name: string;
  type: string;
  group: string;
  enabled: boolean;
};

export type QuickAddChoiceWithVault = QuickAddChoice & {
  vault: Vault;
};

export type QuickAddState = {
  vaults: Vault[];
  choices: QuickAddChoiceWithVault[];
  refreshedAt: string;
};

export function normalizeVariableName(variableName?: string) {
  const normalized = String(variableName || "").trim();
  return normalized || "value";
}

export function getQuickAddConfigPath(vaultPath: string) {
  return join(vaultPath, ".obsidian", "plugins", "quickadd", "data.json");
}

export function normalizeVaults(vaults: Record<string, { path?: string; open?: boolean; ts?: number }> = {}): Vault[] {
  return Object.entries(vaults)
    .map(([id, vault]) => {
      const vaultPath = vault.path || "";
      return {
        id,
        name: vaultPath ? basename(vaultPath) : id,
        path: vaultPath,
        open: Boolean(vault.open),
        ts: Number(vault.ts || 0),
      };
    })
    .filter((vault) => vault.path)
    .sort((a, b) => Number(b.open) - Number(a.open) || b.ts - a.ts || a.name.localeCompare(b.name));
}

function addChoice(result: QuickAddChoice[], seen: Set<string>, choice: unknown, group: string) {
  if (!choice || typeof choice !== "object") return;

  const record = choice as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name || seen.has(name)) return;

  seen.add(name);
  result.push({
    name,
    type: String(record.type || record.choiceType || record.formatType || "Choice"),
    group,
    enabled: record.enabled !== false,
  });
}

function collectChoicesFromArray(items: unknown[], result: QuickAddChoice[], seen: Set<string>, group: string) {
  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    addChoice(result, seen, item, group);

    const record = item as Record<string, unknown>;
    const nextGroup = typeof record.name === "string" && record.name.trim() ? record.name.trim() : group;

    for (const key of ["choices", "children", "items"]) {
      if (Array.isArray(record[key])) {
        collectChoicesFromArray(record[key] as unknown[], result, seen, nextGroup);
      }
    }
  }
}

function findChoiceArrays(node: unknown, arrays: unknown[][]) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) findChoiceArrays(item, arrays);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === "choices" && Array.isArray(value)) {
      arrays.push(value);
    } else if (value && typeof value === "object") {
      findChoiceArrays(value, arrays);
    }
  }
}

export function extractChoices(data: unknown): QuickAddChoice[] {
  const result: QuickAddChoice[] = [];
  const seen = new Set<string>();
  const arrays: unknown[][] = [];
  const root = data as { choices?: unknown; settings?: { choices?: unknown } } | null;

  if (Array.isArray(root?.choices)) arrays.push(root.choices);
  if (Array.isArray(root?.settings?.choices)) arrays.push(root.settings.choices);
  if (arrays.length === 0) findChoiceArrays(data, arrays);

  for (const items of arrays) {
    collectChoicesFromArray(items, result, seen, "");
  }

  return result.filter((choice) => choice.enabled).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function buildQuickAddUri(options: {
  vaultName?: string;
  choiceName: string;
  variableName?: string;
  value?: string;
}) {
  const vaultName = String(options.vaultName || "").trim();
  const choiceName = String(options.choiceName || "").trim();
  const variableName = normalizeVariableName(options.variableName);
  const value = String(options.value || "");

  if (!choiceName) throw new Error("Missing QuickAdd choice.");

  const parts = [];
  if (vaultName) parts.push(`vault=${encodeURIComponent(vaultName)}`);
  parts.push(`choice=${encodeURIComponent(choiceName)}`);
  parts.push(`value-${encodeURIComponent(variableName)}=${encodeURIComponent(value)}`);

  return `obsidian://quickadd?${parts.join("&")}`;
}

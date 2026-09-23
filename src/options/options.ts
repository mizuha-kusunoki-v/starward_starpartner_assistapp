import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage";
import type { CategoryRule, Settings } from "../lib/types";

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`要素が見つかりません: #${id}`);
  return el as T;
}

const els = {
  formUrl: requireEl<HTMLInputElement>("formUrl"),
  channelName: requireEl<HTMLInputElement>("channelName"),
  discordId: requireEl<HTMLInputElement>("discordId"),
  youtubeApiKey: requireEl<HTMLInputElement>("youtubeApiKey"),
  youtubeChannelId: requireEl<HTMLInputElement>("youtubeChannelId"),
  searchKeywords: requireEl<HTMLInputElement>("searchKeywords"),
  categoryRows: requireEl<HTMLTableSectionElement>("categoryRows"),
  status: requireEl<HTMLSpanElement>("status"),
};

function addRuleRow(rule: CategoryRule = { category: "", keywords: [] }): void {
  const tr = document.createElement("tr");

  const categoryTd = document.createElement("td");
  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.className = "rule-category";
  categoryInput.value = rule.category;
  categoryTd.appendChild(categoryInput);

  const keywordsTd = document.createElement("td");
  const keywordsInput = document.createElement("input");
  keywordsInput.type = "text";
  keywordsInput.className = "rule-keywords";
  keywordsInput.value = (rule.keywords || []).join(", ");
  keywordsTd.appendChild(keywordsInput);

  const actionTd = document.createElement("td");
  actionTd.className = "row-actions";
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "削除";
  removeBtn.addEventListener("click", () => tr.remove());
  actionTd.appendChild(removeBtn);

  tr.append(categoryTd, keywordsTd, actionTd);
  els.categoryRows.appendChild(tr);
}

function readRulesFromTable(): CategoryRule[] {
  return [...els.categoryRows.querySelectorAll("tr")]
    .map((tr) => {
      const category = tr.querySelector<HTMLInputElement>(".rule-category")!.value.trim();
      const keywords = tr
        .querySelector<HTMLInputElement>(".rule-keywords")!
        .value.split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      return { category, keywords };
    })
    .filter((rule) => rule.category);
}

async function load(): Promise<void> {
  const settings = await getSettings();
  els.formUrl.value = settings.formUrl;
  els.channelName.value = settings.channelName;
  els.discordId.value = settings.discordId;
  els.youtubeApiKey.value = settings.youtubeApiKey;
  els.youtubeChannelId.value = settings.youtubeChannelId;
  els.searchKeywords.value = settings.searchKeywords;

  els.categoryRows.innerHTML = "";
  const rules = settings.categoryRules?.length ? settings.categoryRules : DEFAULT_SETTINGS.categoryRules;
  rules.forEach(addRuleRow);
}

async function save(): Promise<void> {
  const settings: Settings = {
    formUrl: els.formUrl.value.trim(),
    channelName: els.channelName.value.trim(),
    discordId: els.discordId.value.trim(),
    youtubeApiKey: els.youtubeApiKey.value.trim(),
    youtubeChannelId: els.youtubeChannelId.value.trim(),
    searchKeywords: els.searchKeywords.value.trim(),
    categoryRules: readRulesFromTable(),
  };
  await saveSettings(settings);
  els.status.textContent = "保存しました";
  setTimeout(() => (els.status.textContent = ""), 2000);
}

requireEl<HTMLButtonElement>("addRuleBtn").addEventListener("click", () => addRuleRow());
requireEl<HTMLButtonElement>("saveBtn").addEventListener("click", save);

load();

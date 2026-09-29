import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../lib/storage";
import { fetchLiveCategoryOptions } from "../lib/formSync";
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
  refreshCategoriesBtn: requireEl<HTMLButtonElement>("refreshCategoriesBtn"),
  refreshCategoriesStatus: requireEl<HTMLSpanElement>("refreshCategoriesStatus"),
  availableCategoriesList: requireEl<HTMLUListElement>("availableCategoriesList"),
};

let currentAvailableCategories: string[] = [];

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

function renderAvailableCategories(): void {
  els.availableCategoriesList.innerHTML = "";
  for (const category of currentAvailableCategories) {
    const li = document.createElement("li");
    li.textContent = category;
    els.availableCategoriesList.appendChild(li);
  }
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

  currentAvailableCategories = settings.availableCategories?.length
    ? settings.availableCategories
    : DEFAULT_SETTINGS.availableCategories;
  renderAvailableCategories();
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
    availableCategories: currentAvailableCategories,
  };
  await saveSettings(settings);
  els.status.textContent = "保存しました";
  setTimeout(() => (els.status.textContent = ""), 2000);
}

async function refreshAvailableCategories(): Promise<void> {
  const formUrl = els.formUrl.value.trim();
  if (!formUrl) {
    els.refreshCategoriesStatus.textContent = "先に申請フォームURLを入力してください";
    return;
  }

  els.refreshCategoriesBtn.disabled = true;
  els.refreshCategoriesStatus.textContent = "取得中...";
  try {
    const categories = await fetchLiveCategoryOptions(formUrl);
    currentAvailableCategories = categories;
    renderAvailableCategories();
    // 選択肢はformUrlと違いフォーム自体から取得した情報なので、取得できた時点で
    // 即座に保存する(保存ボタンを別途押さなくても最新の状態がダッシュボードに反映される)
    const settings = await getSettings();
    settings.availableCategories = categories;
    await saveSettings(settings);
    els.refreshCategoriesStatus.textContent = `${categories.length}件の選択肢を取得・保存しました`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    els.refreshCategoriesStatus.textContent = `取得に失敗しました: ${message}`;
  } finally {
    els.refreshCategoriesBtn.disabled = false;
  }
}

requireEl<HTMLButtonElement>("addRuleBtn").addEventListener("click", () => addRuleRow());
requireEl<HTMLButtonElement>("saveBtn").addEventListener("click", save);
els.refreshCategoriesBtn.addEventListener("click", refreshAvailableCategories);

load();

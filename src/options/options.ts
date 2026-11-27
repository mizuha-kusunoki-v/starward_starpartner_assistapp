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
  ruleWarning: requireEl<HTMLDivElement>("ruleWarning"),
};

let currentAvailableCategories: string[] = [];

/** ルールのカテゴリ欄に選択肢を並べる。選択肢に無い名称は消さずに、その旨を表示して残す */
function fillCategoryOptions(select: HTMLSelectElement, current: string): void {
  select.replaceChildren(new Option("選択してください", ""));
  for (const category of currentAvailableCategories) {
    select.add(new Option(category, category));
  }
  if (current && !currentAvailableCategories.includes(current)) {
    select.add(new Option(`（選択肢にありません）${current}`, current));
  }
  select.value = current;
}

function updateRuleWarning(): void {
  const missing = readRulesFromTable()
    .map((rule) => rule.category)
    .filter((category) => !currentAvailableCategories.includes(category));
  els.ruleWarning.hidden = !missing.length;
  els.ruleWarning.textContent = missing.length
    ? `フォームの選択肢に無いカテゴリがあります: ${missing.join("、")}。プルダウンで選び直して「保存」を押してください（このままだと該当する動画は「その他」になります）。`
    : "";
}

function addRuleRow(rule: CategoryRule = { category: "", keywords: [] }): void {
  const tr = document.createElement("tr");

  const categoryTd = document.createElement("td");
  const categorySelect = document.createElement("select");
  categorySelect.className = "rule-category";
  fillCategoryOptions(categorySelect, rule.category);
  categorySelect.addEventListener("change", () => {
    fillCategoryOptions(categorySelect, categorySelect.value);
    updateRuleWarning();
  });
  categoryTd.appendChild(categorySelect);

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
  removeBtn.addEventListener("click", () => {
    tr.remove();
    updateRuleWarning();
  });
  actionTd.appendChild(removeBtn);

  tr.append(categoryTd, keywordsTd, actionTd);
  els.categoryRows.appendChild(tr);
}

function readRulesFromTable(): CategoryRule[] {
  return [...els.categoryRows.querySelectorAll("tr")]
    .map((tr) => {
      const category = tr.querySelector<HTMLSelectElement>(".rule-category")!.value;
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
  els.availableCategoriesList.replaceChildren();
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

  currentAvailableCategories = settings.availableCategories?.length
    ? settings.availableCategories
    : DEFAULT_SETTINGS.availableCategories;
  renderAvailableCategories();

  els.categoryRows.replaceChildren();
  const rules = settings.categoryRules?.length ? settings.categoryRules : DEFAULT_SETTINGS.categoryRules;
  rules.forEach(addRuleRow);
  updateRuleWarning();
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
    for (const select of els.categoryRows.querySelectorAll<HTMLSelectElement>(".rule-category")) {
      fillCategoryOptions(select, select.value);
    }
    updateRuleWarning();
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

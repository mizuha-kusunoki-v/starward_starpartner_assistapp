import { getSettings, getSubmittedVideos } from "../lib/storage";
import { fetchMonthlyVideos } from "../lib/youtube";
import { inferVideoType, inferCategory } from "../lib/classify";
import { MSG, VIDEO_TYPES, DEFAULT_CATEGORIES } from "../lib/messages";
import { toJstDateString } from "../lib/date";
import type { QueueItem, Settings, SubmittedVideos, YouTubeVideo } from "../lib/types";

interface RowState {
  videoId: string;
  title: string;
  publishedAt: string;
  link: string;
  videoType: string;
  category: string;
  selected: boolean;
  submitted: boolean;
  status: string;
}

interface SubmitProgressMessage {
  type: typeof MSG.SUBMIT_PROGRESS;
  videoId?: string;
  status: "success" | "failed" | "done";
  index?: number;
  total: number;
  error?: string;
}

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`要素が見つかりません: #${id}`);
  return el as T;
}

const els = {
  settingsWarning: requireEl<HTMLDivElement>("settingsWarning"),
  monthInput: requireEl<HTMLInputElement>("monthInput"),
  fetchBtn: requireEl<HTMLButtonElement>("fetchBtn"),
  fetchStatus: requireEl<HTMLSpanElement>("fetchStatus"),
  selectAll: requireEl<HTMLInputElement>("selectAll"),
  submitBtn: requireEl<HTMLButtonElement>("submitBtn"),
  submitStatus: requireEl<HTMLSpanElement>("submitStatus"),
  videoRows: requireEl<HTMLTableSectionElement>("videoRows"),
};

let settings: Settings | null = null;
let submittedVideos: SubmittedVideos = {};
const rows = new Map<string, RowState>();

function defaultMonthValue(): string {
  // 対象年月ピッカーの初期値。JST基準の「当月」。
  return toJstDateString().slice(0, 7); // YYYY-MM
}

function settingsAreComplete(s: Settings): boolean {
  return Boolean(s.formUrl && s.channelName && s.discordId && s.youtubeApiKey && s.youtubeChannelId);
}

function buildVideoTypeOptions(selected: string): string {
  return Object.values(VIDEO_TYPES)
    .map((t) => `<option value="${t}" ${t === selected ? "selected" : ""}>${t}</option>`)
    .join("");
}

function buildCategoryOptions(selected: string): string {
  return DEFAULT_CATEGORIES.map(
    (c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`
  ).join("");
}

function renderRow(video: YouTubeVideo): void {
  const videoId = video.id;
  const title = video.snippet?.title || "(タイトル取得失敗)";
  // YouTube APIのpublishedAtはUTC基準なので、必ずJSTの暦日に変換してから使う
  const publishedAt = video.snippet?.publishedAt ? toJstDateString(video.snippet.publishedAt) : "";
  const thumb = video.snippet?.thumbnails?.default?.url || "";
  const link = `https://www.youtube.com/watch?v=${videoId}`;
  const videoType = inferVideoType(video);
  const category = inferCategory(title, settings!.categoryRules);
  const alreadySubmitted = Boolean(submittedVideos[videoId]);

  const state: RowState = {
    videoId,
    title,
    publishedAt,
    link,
    videoType,
    category,
    selected: !alreadySubmitted,
    submitted: alreadySubmitted,
    status: alreadySubmitted ? "送信済み" : "",
  };
  rows.set(videoId, state);

  const tr = document.createElement("tr");
  tr.dataset.videoId = videoId;
  if (alreadySubmitted) tr.classList.add("submitted");

  tr.innerHTML = `
    <td><input type="checkbox" class="row-select" ${state.selected ? "checked" : ""} ${alreadySubmitted ? "disabled" : ""} /></td>
    <td>${thumb ? `<img class="thumb" src="${thumb}" alt="" />` : ""}</td>
    <td><a href="${link}" target="_blank">${title}</a></td>
    <td>${publishedAt}</td>
    <td><input type="text" class="row-link" value="${link}" /></td>
    <td><select class="row-type">${buildVideoTypeOptions(videoType)}</select></td>
    <td><select class="row-category">${buildCategoryOptions(category)}</select></td>
    <td class="status-cell">${state.status}</td>
  `;

  tr.querySelector<HTMLInputElement>(".row-select")!.addEventListener("change", (e) => {
    state.selected = (e.target as HTMLInputElement).checked;
    updateSubmitButton();
  });
  tr.querySelector<HTMLInputElement>(".row-link")!.addEventListener("input", (e) => {
    state.link = (e.target as HTMLInputElement).value;
  });
  tr.querySelector<HTMLSelectElement>(".row-type")!.addEventListener("change", (e) => {
    state.videoType = (e.target as HTMLSelectElement).value;
  });
  tr.querySelector<HTMLSelectElement>(".row-category")!.addEventListener("change", (e) => {
    state.category = (e.target as HTMLSelectElement).value;
  });

  els.videoRows.appendChild(tr);
}

function updateSubmitButton(): void {
  const anySelected = [...rows.values()].some((r) => r.selected && !r.submitted);
  els.submitBtn.disabled = !anySelected;
}

async function handleFetch(): Promise<void> {
  if (!settings || !settingsAreComplete(settings)) {
    els.settingsWarning.hidden = false;
    return;
  }
  els.settingsWarning.hidden = true;

  const [year, month] = els.monthInput.value.split("-").map(Number) as [number, number];
  const keywords = settings.searchKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  els.fetchBtn.disabled = true;
  els.fetchStatus.textContent = "取得中...";
  els.videoRows.innerHTML = "";
  rows.clear();

  try {
    submittedVideos = await getSubmittedVideos();
    const videos = await fetchMonthlyVideos({
      apiKey: settings.youtubeApiKey,
      channelId: settings.youtubeChannelId,
      keywords,
      year,
      month,
    });
    videos
      .sort((a, b) => (a.snippet?.publishedAt || "").localeCompare(b.snippet?.publishedAt || ""))
      .forEach(renderRow);
    els.fetchStatus.textContent = `${videos.length}件取得しました`;
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    els.fetchStatus.textContent = `取得に失敗しました: ${message}`;
  } finally {
    els.fetchBtn.disabled = false;
    updateSubmitButton();
  }
}

function handleSelectAll(e: Event): void {
  const checked = (e.target as HTMLInputElement).checked;
  for (const tr of els.videoRows.querySelectorAll<HTMLTableRowElement>("tr")) {
    const videoId = tr.dataset.videoId!;
    const state = rows.get(videoId)!;
    if (state.submitted) continue;
    state.selected = checked;
    tr.querySelector<HTMLInputElement>(".row-select")!.checked = checked;
  }
  updateSubmitButton();
}

function setRowStatus(videoId: string, text: string, cls?: string): void {
  const tr = els.videoRows.querySelector<HTMLTableRowElement>(`tr[data-video-id="${videoId}"]`);
  if (!tr) return;
  tr.querySelector<HTMLTableCellElement>(".status-cell")!.textContent = text;
  if (cls) tr.classList.add(cls);
}

async function handleSubmit(): Promise<void> {
  const queue: QueueItem[] = [...rows.values()]
    .filter((r) => r.selected && !r.submitted)
    .map((r) => ({
      videoId: r.videoId,
      channelName: settings!.channelName,
      discordId: settings!.discordId,
      videoLink: r.link,
      videoTitle: r.title,
      applyDate: toJstDateString(),
      videoDate: r.publishedAt,
      videoType: r.videoType,
      category: r.category,
    }));

  if (!queue.length) return;

  els.submitBtn.disabled = true;
  els.submitStatus.textContent = `送信中... (0/${queue.length})`;

  chrome.runtime.sendMessage({ type: MSG.START_SUBMIT_QUEUE, queue });
}

chrome.runtime.onMessage.addListener((message: SubmitProgressMessage) => {
  if (message.type !== MSG.SUBMIT_PROGRESS) return;
  const { videoId, status, index, total, error } = message;
  els.submitStatus.textContent = `送信中... (${index ?? 0}/${total})`;

  if (status === "success" && videoId) {
    const state = rows.get(videoId);
    if (state) state.submitted = true;
    setRowStatus(videoId, "送信完了", "submitted");
  } else if (status === "failed" && videoId) {
    setRowStatus(videoId, `失敗: ${error || ""}`, "failed");
  } else if (status === "failed" && !videoId) {
    els.submitStatus.textContent = `送信できませんでした: ${error || ""}`;
    updateSubmitButton();
  } else if (status === "done") {
    els.submitStatus.textContent = `完了 (${total}件処理)`;
    updateSubmitButton();
  }
});

els.fetchBtn.addEventListener("click", handleFetch);
els.selectAll.addEventListener("change", handleSelectAll);
els.submitBtn.addEventListener("click", handleSubmit);

(async function init() {
  els.monthInput.value = defaultMonthValue();
  settings = await getSettings();
  if (!settingsAreComplete(settings)) {
    els.settingsWarning.hidden = false;
  }
})();

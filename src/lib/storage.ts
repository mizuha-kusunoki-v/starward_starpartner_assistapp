// chrome.storage ラッパー: 固定設定(sync)と送信履歴(local)を扱う

import type { QueueItem, Settings, SubmittedVideos } from "./types";

const SETTINGS_KEY = "settings";
const SUBMITTED_KEY = "submittedVideos";

export const DEFAULT_SETTINGS: Settings = {
  channelName: "",
  discordId: "",
  youtubeApiKey: "",
  youtubeChannelId: "",
  // 申請フォームのURL。ソースコードには含めない(運営からの要望)。
  // 利用者自身が運営から案内されたURLをここに設定する。
  formUrl: "",
  // カンマ区切りの検索キーワード。運営指定タグ等をデフォルトで提案。
  searchKeywords: "星の翼",
  // カテゴリ名 -> マッチさせるキーワード配列。上から順に判定する。
  categoryRules: [
    { category: "新キャラ攻略（エリシア・陸戦モード）", keywords: ["エリシア", "陸戦モード"] },
    { category: "対戦録画（編集や創作要素が必須）", keywords: ["対戦", "PVP"] },
    { category: "攻略（旧キャラやゲームガイド）", keywords: ["攻略", "ガイド"] },
    { category: "新スキンレビュー", keywords: ["新スキン"] },
    { category: "スキンレビュー", keywords: ["スキン"] },
    { category: "配信アーカイブ", keywords: ["配信"] },
  ],
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...((stored[SETTINGS_KEY] as Partial<Settings>) || {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function getSubmittedVideos(): Promise<SubmittedVideos> {
  const stored = await chrome.storage.local.get(SUBMITTED_KEY);
  return (stored[SUBMITTED_KEY] as SubmittedVideos) || {};
}

export async function markVideoSubmitted(videoId: string, formData: QueueItem): Promise<void> {
  const submitted = await getSubmittedVideos();
  submitted[videoId] = { submittedAt: new Date().toISOString(), formData };
  await chrome.storage.local.set({ [SUBMITTED_KEY]: submitted });
}

// ビデオタイプ/投稿内容カテゴリの自動推測ロジック（純粋関数）

import { VIDEO_TYPES, type VideoTypeLabel } from "./messages";
import type { CategoryRule, YouTubeVideo } from "./types";

/** ISO 8601 duration (e.g. "PT1M30S", 24時間以上は "P1DT2H") を秒数に変換する */
export function parseIsoDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return (
    (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
  );
}

/** 秒数を "時:分:秒" (例: 125:03:09) の表記にする */
export function formatDuration(totalSeconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}:${pad(minutes)}:${pad(totalSeconds % 60)}`;
}

/**
 * YouTube videos.list の1件分( snippet/contentDetails/liveStreamingDetails )から
 * フォームの「ビデオタイプ」を推測する。
 */
export function inferVideoType(video: YouTubeVideo): VideoTypeLabel {
  if (video.liveStreamingDetails?.actualStartTime) {
    return VIDEO_TYPES.LIVE_ARCHIVE;
  }
  const seconds = parseIsoDuration(video.contentDetails?.duration);
  if (seconds > 0 && seconds <= 60) {
    return VIDEO_TYPES.SHORT;
  }
  return VIDEO_TYPES.PRODUCED;
}

/**
 * 動画の「実質的な公開日時」を返す。
 *
 * ライブ配信の場合、`snippet.publishedAt`は配信を事前に予約設定した日時になって
 * いることがあり、実際に配信を開始した日時とは異なる（宣伝のため前夜に予約し、
 * 翌朝に配信を開始するケースなどで、日付がずれて見える不具合の原因になっていた）。
 * `liveStreamingDetails.actualStartTime`（実際に配信を開始した日時）が取得できる
 * 場合はそちらを優先し、無ければ`snippet.publishedAt`にフォールバックする。
 */
export function getEffectivePublishedAt(video: YouTubeVideo): string | undefined {
  return video.liveStreamingDetails?.actualStartTime ?? video.snippet?.publishedAt;
}

/**
 * 推測したカテゴリがフォームの選択肢に無い場合(ルールの名称が古い場合など)は
 * 「その他」に置き換え、画面の表示と送信内容がずれないようにする。
 */
export function toAvailableCategory(category: string, choices: readonly string[]): string {
  if (choices.includes(category)) return category;
  return choices.includes("その他") ? "その他" : (choices[0] ?? category);
}

/**
 * 動画タイトルとカテゴリ推測ルールから「投稿内容」カテゴリを推測する。
 * ルールは上から順に評価し、最初にマッチしたカテゴリを返す。
 * どれにもマッチしなければ「その他」。
 */
export function inferCategory(title: string | undefined, categoryRules: CategoryRule[]): string {
  const lowerTitle = (title || "").toLowerCase();
  for (const rule of categoryRules || []) {
    for (const keyword of rule.keywords || []) {
      if (keyword && lowerTitle.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }
  return "その他";
}

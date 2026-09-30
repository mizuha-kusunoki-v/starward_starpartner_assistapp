// ビデオタイプ/投稿内容カテゴリの自動推測ロジック（純粋関数）

import { VIDEO_TYPES, type VideoTypeLabel } from "./messages";
import type { CategoryRule, YouTubeVideo } from "./types";

/** ISO 8601 duration (e.g. "PT1M30S") を秒数に変換する */
export function parseIsoDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
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

// background <-> dashboard <-> content script 間で共有するメッセージ種別定数

export const MSG = {
  // dashboard -> background: 選択した動画の一括送信を開始する
  START_SUBMIT_QUEUE: "START_SUBMIT_QUEUE",
  // background -> dashboard: キューの進捗（1件処理するたびに通知）
  SUBMIT_PROGRESS: "SUBMIT_PROGRESS",
  // background -> content: このフォームに入力して送信してほしい
  FILL_AND_SUBMIT: "FILL_AND_SUBMIT",
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

// フォームの選択肢文言（サイト側の表記に一致させる）
export const VIDEO_TYPES = {
  LIVE_ARCHIVE: "配信アーカイブ",
  PRODUCED: "ビデオ制作投稿",
  SHORT: "縦型ショート動画",
} as const;

export type VideoTypeLabel = (typeof VIDEO_TYPES)[keyof typeof VIDEO_TYPES];

export const DEFAULT_CATEGORIES = [
  "新キャラ攻略（エリシア・陸戦モード）",
  "対戦録画（編集や創作要素が必須）",
  "攻略（旧キャラやゲームガイド）",
  "新スキンレビュー",
  "スキンレビュー",
  "配信アーカイブ",
  "その他",
] as const;

export type CategoryLabel = (typeof DEFAULT_CATEGORIES)[number];

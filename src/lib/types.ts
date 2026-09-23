// 拡張機能内で共有する型定義

export interface CategoryRule {
  category: string;
  keywords: string[];
}

export interface Settings {
  channelName: string;
  discordId: string;
  youtubeApiKey: string;
  youtubeChannelId: string;
  /** 申請フォームのURL。ソースコードには含めず、運営から個別に案内された値をユーザー自身が設定する */
  formUrl: string;
  /** カンマ区切りの検索キーワード文字列 */
  searchKeywords: string;
  categoryRules: CategoryRule[];
}

/** フォームへ1件分転記する動画データ */
export interface QueueItem {
  videoId: string;
  channelName: string;
  discordId: string;
  videoLink: string;
  videoTitle: string;
  /** YYYY-MM-DD */
  applyDate: string;
  /** YYYY-MM-DD */
  videoDate: string;
  videoType: string;
  category: string;
}

export interface SubmittedRecord {
  submittedAt: string;
  formData: QueueItem;
}

export type SubmittedVideos = Record<string, SubmittedRecord>;

export interface FillAndSubmitResult {
  success: boolean;
  error?: string;
}

// --- YouTube Data API v3 レスポンス（使用するフィールドのみ） ---

export interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeVideoSnippet {
  title: string;
  publishedAt: string;
  thumbnails?: {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
  };
}

export interface YouTubeVideoContentDetails {
  duration: string;
}

export interface YouTubeLiveStreamingDetails {
  actualStartTime?: string;
}

export interface YouTubeVideo {
  id: string;
  snippet?: YouTubeVideoSnippet;
  contentDetails?: YouTubeVideoContentDetails;
  liveStreamingDetails?: YouTubeLiveStreamingDetails;
}

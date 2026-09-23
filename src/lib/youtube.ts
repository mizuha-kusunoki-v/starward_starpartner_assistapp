// YouTube Data API v3 クライアント（APIキーのみ、公開動画対象）

import type { YouTubeVideo } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

interface SearchListResponse {
  items?: { id?: { videoId?: string } }[];
  nextPageToken?: string;
}

interface VideosListResponse {
  items?: YouTubeVideo[];
}

async function apiGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

interface SearchVideoIdsParams {
  apiKey: string;
  channelId: string;
  keyword: string;
  publishedAfter: string;
  publishedBefore: string;
}

/**
 * 指定チャンネル・キーワードで、指定期間(ISO日時)に公開された動画のvideoIdを検索する。
 * ページングを追いながら全件集める。
 */
async function searchVideoIds({
  apiKey,
  channelId,
  keyword,
  publishedAfter,
  publishedBefore,
}: SearchVideoIdsParams): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  do {
    const params: Record<string, string | number> = {
      key: apiKey,
      channelId,
      type: "video",
      order: "date",
      part: "id",
      maxResults: 50,
      publishedAfter,
      publishedBefore,
    };
    if (keyword) params.q = keyword;
    if (pageToken) params.pageToken = pageToken;

    const data = await apiGet<SearchListResponse>("search", params);
    for (const item of data.items || []) {
      if (item.id?.videoId) ids.push(item.id.videoId);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return ids;
}

/** videoId配列の詳細情報(snippet/contentDetails/liveStreamingDetails)を50件ずつ取得する */
async function fetchVideoDetails({
  apiKey,
  videoIds,
}: {
  apiKey: string;
  videoIds: string[];
}): Promise<YouTubeVideo[]> {
  const results: YouTubeVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const data = await apiGet<VideosListResponse>("videos", {
      key: apiKey,
      id: chunk.join(","),
      part: "snippet,contentDetails,liveStreamingDetails",
    });
    results.push(...(data.items || []));
  }
  return results;
}

interface FetchMonthlyVideosParams {
  apiKey: string;
  channelId: string;
  keywords: string[];
  year: number;
  month: number;
}

/**
 * 対象年月(year, month: 1-12)・複数キーワードで動画を検索し、詳細情報付きで返す。
 * 同じ動画が複数キーワードでヒットした場合は重複除去する。
 */
/**
 * YouTubeのsearch.listはタイトルに限らず概要欄・タグなども含めた
 * 緩い関連度マッチングのため、qキーワードを渡しても本文中にそのキーワードを
 * 含まない動画が結果に混ざることがある。タイトルに実際にキーワードが
 * 含まれる動画だけに厳密に絞り込む。
 *
 * 概要欄は対象に含めない: 全動画共通のハッシュタグ・署名などを概要欄に
 * 毎回追加しているケースが多く、それを対象にすると実質フィルタが効かなく
 * なってしまうため(実際にこの理由で「無関係な動画まで取得される」不具合が
 * 発生した)。
 */
function matchesKeywords(video: YouTubeVideo, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const title = (video.snippet?.title ?? "").toLowerCase();
  return keywords.some((keyword) => title.includes(keyword.toLowerCase()));
}

export async function fetchMonthlyVideos({
  apiKey,
  channelId,
  keywords,
  year,
  month,
}: FetchMonthlyVideosParams): Promise<YouTubeVideo[]> {
  const publishedAfter = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const publishedBefore = new Date(Date.UTC(year, month, 1)).toISOString();

  const keywordList = keywords.length ? keywords : [""];
  const idSets = await Promise.all(
    keywordList.map((keyword) =>
      searchVideoIds({ apiKey, channelId, keyword, publishedAfter, publishedBefore })
    )
  );
  const uniqueIds = [...new Set(idSets.flat())];
  if (!uniqueIds.length) return [];

  const videos = await fetchVideoDetails({ apiKey, videoIds: uniqueIds });
  return videos.filter((video) => matchesKeywords(video, keywords));
}

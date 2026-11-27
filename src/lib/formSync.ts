// 申請フォームから最新の「投稿内容」カテゴリ選択肢を取得する。
// 運営が新キャラクターを実装するたびに選択肢が変わるため、ハードコードしない。
//
// フォームのAPIは回答ページを経由しない直接の問い合わせを拒否する
// (invalid_referer / invalid_answer_session)ため、フォームのページをタブで開き、
// content script(formFiller.ts)に画面から読み取らせる。

import { MSG } from "./messages";
import type { ReadCategoriesResult } from "./types";

const CONNECT_TIMEOUT_MS = 20000;

function isFormUrl(formUrl: string): boolean {
  try {
    const url = new URL(formUrl);
    return url.protocol === "https:" && url.hostname === "wj.qq.com";
  } catch {
    return false;
  }
}

/** content scriptが応答できるようになるまで(ページ読み込み中は失敗する)再試行する */
async function requestCategories(tabId: number): Promise<ReadCategoriesResult> {
  const deadline = Date.now() + CONNECT_TIMEOUT_MS;
  for (;;) {
    try {
      return (await chrome.tabs.sendMessage(tabId, {
        type: MSG.READ_CATEGORY_OPTIONS,
      })) as ReadCategoriesResult;
    } catch {
      if (Date.now() > deadline) {
        throw new Error("申請フォームのページを読み込めませんでした");
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function fetchLiveCategoryOptions(formUrl: string): Promise<string[]> {
  if (!isFormUrl(formUrl)) {
    throw new Error(
      "申請フォームURLの形式を認識できませんでした（https://wj.qq.com/ で始まるURLを指定してください）"
    );
  }

  const returnTab = await chrome.tabs.getCurrent();
  // 非表示のタブは描画が止まることがあるため、表示した状態で開く
  const formTab = await chrome.tabs.create({ url: formUrl, active: true });
  try {
    const result = await requestCategories(formTab.id!);
    if (!result.success || !result.categories?.length) {
      throw new Error(result.error || "「投稿内容」の選択肢を読み取れませんでした");
    }
    return result.categories;
  } finally {
    await chrome.tabs.remove(formTab.id!).catch(() => undefined);
    if (returnTab?.id !== undefined) {
      await chrome.tabs.update(returnTab.id, { active: true });
    }
  }
}

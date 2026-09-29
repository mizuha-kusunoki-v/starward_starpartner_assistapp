// 申請フォームの実際の質問構成から、最新の「投稿内容」カテゴリ選択肢を取得する。
// 運営が新キャラクターを実装するたびに選択肢が変わるため、ハードコードせず
// フォーム自身のAPIから毎回取得できるようにする。

const FORM_URL_PATTERN = /\/s2\/(\d+)\/([^/?#]+)/;

interface ParsedFormUrl {
  sid: string;
  hash: string;
}

export function parseFormUrl(formUrl: string): ParsedFormUrl | null {
  const match = FORM_URL_PATTERN.exec(formUrl.trim());
  if (!match) return null;
  const [, sid, hash] = match;
  if (!sid || !hash) return null;
  return { sid, hash };
}

interface SurveyQuestionOption {
  text: string;
}

interface SurveyQuestion {
  title: string;
  type: string;
  options?: SurveyQuestionOption[];
}

interface SurveyQuestionsResponse {
  code: string;
  data?: {
    code: number;
    questions?: SurveyQuestion[];
  };
}

const CATEGORY_QUESTION_TITLE = "投稿内容";

export async function fetchLiveCategoryOptions(formUrl: string): Promise<string[]> {
  const parsed = parseFormUrl(formUrl);
  if (!parsed) {
    throw new Error(
      "申請フォームURLの形式を認識できませんでした（https://wj.qq.com/s2/xxxxx/xxxx/ の形式である必要があります）"
    );
  }

  const apiUrl = `https://wj.qq.com/api/v2/respondent/surveys/${parsed.sid}/questions?hash=${parsed.hash}&locale=zhs`;
  let res: Response;
  try {
    res = await fetch(apiUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`フォームへの通信に失敗しました: ${message}`);
  }
  if (!res.ok) {
    throw new Error(`フォームへの通信でエラーが発生しました (HTTP ${res.status})`);
  }

  const json = (await res.json()) as SurveyQuestionsResponse;
  if (json.code !== "OK" || !json.data || json.data.code !== 0) {
    throw new Error("フォームの質問一覧を取得できませんでした（フォームURLが正しいかご確認ください）");
  }

  const question = (json.data.questions ?? []).find(
    (q) => q.title === CATEGORY_QUESTION_TITLE && q.type === "radio"
  );
  if (!question || !question.options?.length) {
    throw new Error("フォーム内に「投稿内容」の設問が見つかりませんでした");
  }

  return question.options.map((o) => o.text);
}

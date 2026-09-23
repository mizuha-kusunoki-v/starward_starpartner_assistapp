# Chrome ウェブストア 申請ガイド

Chromeウェブストアを初めて使う前提の手順書です。上から順にやれば申請まで到達できます。

## 0. 事前準備チェックリスト

- [ ] アイコン画像（16x16, 48x48, 128x128 の少なくとも128x128は必須。複数サイズ推奨）
- [ ] スクリーンショット 1枚以上（推奨サイズ 1280x800 または 640x400。実際に動作している画面のキャプチャ）
- [ ] プライバシーポリシーを公開済み（[プライバシーポリシー公開手順](#1-プライバシーポリシーの公開githubpages)参照）
- [ ] Googleデベロッパー登録（初回のみ $5 の登録料、Googleアカウントが必要）
- [ ] `dist`フォルダのzip（`.github/workflows/release.yml`でタグを打てば自動生成されます。手動なら`npm run build`後に`dist`フォルダ内身をzip化）

---

## 1. プライバシーポリシーの公開（GitHub Pages）

このリポジトリの `docs/privacy-policy.html` をGitHub Pagesで公開します。

1. GitHubのリポジトリページを開く →「Settings」タブ
2. 左メニュー「Pages」
3. 「Build and deployment」の「Source」を **Deploy from a branch** にする
4. 「Branch」を **main** 、フォルダを **/docs** に設定して「Save」
5. 数分待つと、ページ上部に公開URLが表示されます
   （例: `https://mizuha-kusunoki-v.github.io/starward_starpartner_assistapp/privacy-policy.html`）

このURLを、後述のストア申請フォームの「プライバシーポリシー」欄に入力します。

---

## 2. Chromeウェブストア デベロッパー登録

1. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/) を開く
2. 普段お使いのGoogleアカウントでログイン
3. 初回登録の案内に従い、**$5の登録料**をクレジットカード等で支払う（一度払えば以降不要）

---

## 3. 拡張機能パッケージ(zip)の用意

### 自動ビルド(推奨)
GitHubリポジトリでタグを打つと、Actionsが自動でビルド・zip化し、Releasesにアップロードします。

```bash
git tag v0.1.0
git push origin v0.1.0
```

数分後、リポジトリの「Releases」に `starpartner-assistant-v0.1.0.zip` が生成されるので、
それをダウンロードして使います。

### 手動ビルド
```bash
npm ci
npm run build
```
生成された `dist` フォルダの**中身**（`dist`フォルダ自体ではなく中のファイル群）をzip圧縮します。

---

## 4. ストアへの新規アイテム登録

1. Developer Dashboardの「新しいアイテムを追加」
2. 手順3で作ったzipをアップロード
3. 以下の項目を入力していきます

### ストア掲載情報（コピーして使える文面案）

**タイトル**
```
StarPartner 動画申請アシスタント
```

**簡単な説明（132文字以内）**
```
YouTube動画をキーワードで検索し、スターパートナー申請フォームへの入力・送信作業を半自動化します。
```

**詳細な説明**
```
「スターパートナー」プログラムに参加している配信者・クリエイター向けの補助ツールです。

【できること】
・自分のYouTubeチャンネルから、指定キーワードを含む動画を月単位で検索
・動画のタイプ(配信アーカイブ/ビデオ制作投稿/縦型ショート動画)や投稿内容カテゴリを自動推測
・一覧画面で内容を確認・修正してから、選択した動画をまとめて申請フォームへ送信

【安全設計について】
・全自動の無人連続送信は行いません。必ず一覧で内容を確認し、ユーザー自身が送信を実行します
・送信に失敗した場合は自動で停止し、該当ページを開いたまま手動対応を促します
・送信済みの動画は記録され、重複送信を防ぎます

【必要なもの】
・ご自身のYouTube Data APIキー(無料で取得できます。詳細はREADME参照)
・ご自身のYouTubeチャンネルID

このツールは開発者が運営するサーバーを一切持たず、すべての処理はお使いのブラウザ内で
完結します。取得したデータや入力内容が外部のサーバーへ送信されることはありません。
詳細はプライバシーポリシーをご確認ください。
```

**カテゴリ**: 生産性（Productivity）

**言語**: 日本語

### プライバシー関連（Chromeウェブストアの「プライバシー プラクティス」タブ）

**単一の目的の説明 (Single purpose description)**
```
This extension helps a YouTube creator find their own published videos matching
a keyword and semi-automatically transcribe the video details into a specific
web form (an official "Star Partner" video-application form hosted on wj.qq.com)
that the creator already fills out manually as part of a game's creator reward
program. The user always reviews and explicitly triggers the submission.
```

**権限の正当化 (Permission justifications)**

| 権限 | 正当化文（コピー用） |
|---|---|
| `storage` | Used to store the user's own settings (channel name, Discord ID, YouTube API key, keyword rules) and a local history of already-submitted videos, entirely on the user's device, to prevent duplicate submissions. |
| `tabs` | Used to open the target application form in a new tab for each selected video and detect when the page has finished loading before auto-filling it. |
| `scripting` | Used to inject the auto-fill logic into the application form page so it can populate fields with data the user already reviewed in the extension's dashboard. |
| host permission: `https://wj.qq.com/*` | Required to read and fill the fields of the specific "Star Partner" video-application form hosted on this domain, only for videos the user explicitly selected and submitted. |
| host permission: `https://www.googleapis.com/*` | Required to call the YouTube Data API v3 using the user's own API key, to retrieve metadata (title, publish date, duration) of the user's own public videos. |

**リモートコードの使用**: 「いいえ（使用しない）」を選択（拡張機能内に全コードが同梱されているため）

**プライバシーポリシーURL**: 手順1で発行されたGitHub PagesのURL

---

## 5. 審査への提出

1. すべての項目を入力後、「審査のために送信」をクリック
2. 審査には数日〜1週間程度かかることがあります（初回はもう少しかかる場合も）
3. 却下された場合は理由がメールで届くので、該当箇所を修正して再提出します
   （権限の説明が曖昧、プライバシーポリシーの内容不足などが典型的な却下理由です）

---

## 6. 公開後の更新

新バージョンを出すときは、`manifest.json`と`package.json`の`version`を上げてから
同じ手順でzipを作り直し、Developer Dashboardの既存アイテムから「パッケージをアップロード」
すれば差し替えられます（審査は毎回入ります）。

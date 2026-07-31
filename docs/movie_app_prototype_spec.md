# 映画館横断上映情報アプリ — プロトタイプ仕様書

- 文書バージョン: 1.0
- 対象: Codex による初期実装
- 公開形態: GitHub Pages
- ローカル実行: Docker
- 定期ビルド・公開: GitHub Actions
- 仮称: **Movie Schedule Viewer**

---

## 1. この仕様書の目的

複数の映画館について、現在上映中の映画、上映日、上映時刻、映画の概要、映画館の予約サイトへのリンクを一つのWebサイトで確認できるプロトタイプを作成する。

本プロトタイプは、次の二つを同時に満たすことを目的とする。

1. GitHub Pagesで常時公開し、PC・スマートフォンから普段使いできること。
2. 同じアプリをDockerコンテナ上でも起動でき、課題の「Dockerコンテナ上で動作し、ホストPCからブラウザでアクセスする」という条件を満たすこと。

初期実装では、実際の映画館サイトへのスクレイピングや外部API接続は行わない。相対日付で生成するサンプルデータを使用し、UI、検索、日付切り替え、詳細表示、Docker実行、GitHub Pages公開までを確実に完成させる。

将来、サンプルデータ生成処理を上映情報取得処理に置き換えられる構造にする。

---

## 2. 元となる要望

アプリのUIと利用フローは、次の要望を基礎とする。

- 画面上部に検索バーを置く。
- 映画館の一覧を表示する。
- 映画館を押すと、その映画館で上映している映画一覧へ移動する。
- 映画はポスター画像とタイトルを持つパネル形式で表示する。
- 日付切り替えボタンによって数日後までの上映情報を確認できるようにする。
- 映画館のチケット予約サイトへのリンクを表示する。
- 映画を押すと、作品概要などを表示する詳細ページへ移動する。
- トップページでも、選択日の上映映画一覧を確認できるようにする。

---

## 3. プロトタイプの完成条件

以下がすべて満たされた時点を、プロトタイプ完成とする。

1. `docker compose up --build` でエラーなく起動する。
2. `http://localhost:8080` からトップページを表示できる。
3. GitHub Actionsがビルド、テスト、GitHub Pagesへのデプロイを実行できる。
4. GitHub Pagesのプロジェクトサイト形式、すなわち `https://<user>.github.io/<repository>/` 配下で、CSS、JavaScript、画像、ページ遷移が壊れない。
5. トップページに検索バー、日付切り替え、映画一覧、映画館一覧が表示される。
6. 映画タイトルの部分一致検索ができる。
7. 今日を含む4日分の上映情報を切り替えられる。
8. 映画カードを押すと映画詳細画面へ移動できる。
9. 映画館カードを押すと映画館詳細画面へ移動できる。
10. 映画詳細画面で、上映映画館、上映時刻、予約リンクを確認できる。
11. 映画館詳細画面で、その映画館の上映作品と上映時刻を確認できる。
12. 存在しない映画ID・映画館IDを指定しても白画面にならず、案内画面が出る。
13. データが空の場合や検索結果がない場合に、分かりやすいメッセージが出る。
14. PC幅とスマートフォン幅の双方で操作できる。
15. `npm run lint`、`npm run test`、`npm run build` がすべて成功する。
16. READMEに、概要、機能、構成、Dockerでの起動方法、ローカル開発方法、GitHub Pages公開方法、テスト方法が記載される。
17. 未実装の必須機能を示す `TODO`、ダミーボタン、リンク切れを残さない。

---

## 4. スコープ

### 4.1 初期実装に含めるもの

- 選択日の上映映画一覧
- 映画タイトル検索
- 今日を含む4日分の日付切り替え
- 映画館一覧
- 映画詳細表示
- 映画館詳細表示
- 上映時刻表示
- 外部予約サイトへのリンク
- レスポンシブUI
- ローカルのダミーポスター
- サンプル上映情報の自動生成
- Dockerによる配信
- GitHub Actionsによるテスト、ビルド、GitHub Pages公開
- 基本的なエラー表示
- 自動テスト

### 4.2 初期実装に含めないもの

- 実在映画館サイトのスクレイピング
- 外部映画APIの利用
- 座席の空き状況
- アプリ内での予約・決済
- ユーザーアカウント
- サーバー側データベース
- 複数端末間のお気に入り同期
- 管理画面
- 映画レビュー投稿
- 位置情報や地図連携
- 映画はしごプラン自動生成
- Service Workerを用いたオフライン対応

上記は将来機能とし、初期実装を不安定にする目的では追加しない。

---

## 5. 技術構成

### 5.1 採用技術

| 項目 | 採用技術 |
|---|---|
| フロントエンド | Vite + TypeScript + HTML + CSS |
| UIフレームワーク | 使用しない |
| テスト | Vitest |
| 静的解析 | ESLint |
| 整形 | Prettier |
| データ | ビルド前に生成するJSON |
| ローカル公開 | Nginxコンテナ |
| コンテナ管理 | Docker Compose |
| CI/CD | GitHub Actions |
| 公開先 | GitHub Pages |

### 5.2 この構成を採用する理由

- GitHub Pagesは静的なHTML、CSS、JavaScriptの公開に適している。
- TypeScriptにより、映画、映画館、上映情報のデータ構造を明確にできる。
- UIフレームワークを使用しないことで、プロトタイプの依存関係と学習コストを抑える。
- Viteのビルド成果物をGitHub PagesとNginxの双方で同じように配信できる。
- サーバー処理を必要とせず、GitHub Actionsを定期的なデータ生成・サイト再公開処理として利用できる。

### 5.3 重要な実装制約

- GitHub Pagesのプロジェクトサイトはリポジトリ名を含むパスで公開されるため、`/assets/...` のようなドメイン直下を前提としたパスを使用しない。
- Viteの `base` は `./` とする。
- ページ間リンク、画像、JSON、CSS、JavaScriptは、プロジェクトサイト配下でも動作する相対URLにする。
- 認証情報、APIキー、秘密情報をリポジトリへ保存しない。
- 外部画像の直リンクは使用しない。
- 実在映画のポスター画像を無断で同梱しない。

---

## 6. 想定ディレクトリ構成

Codexは、特別な理由がない限り次の構成を採用する。

```text
movie-schedule-viewer/
├─ index.html
├─ movie.html
├─ theater.html
├─ vite.config.ts
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ eslint.config.js
├─ .prettierrc
├─ .gitignore
├─ Dockerfile
├─ compose.yaml
├─ nginx.conf
├─ README.md
├─ src/
│  ├─ pages/
│  │  ├─ home.ts
│  │  ├─ movie-detail.ts
│  │  └─ theater-detail.ts
│  ├─ components/
│  │  ├─ header.ts
│  │  ├─ date-tabs.ts
│  │  ├─ movie-card.ts
│  │  ├─ theater-card.ts
│  │  ├─ screening-list.ts
│  │  └─ empty-state.ts
│  ├─ domain/
│  │  ├─ types.ts
│  │  ├─ selectors.ts
│  │  ├─ date.ts
│  │  └─ urls.ts
│  ├─ data/
│  │  └─ generated.json
│  ├─ styles/
│  │  ├─ global.css
│  │  ├─ layout.css
│  │  └─ components.css
│  └─ main.ts
├─ public/
│  ├─ favicon.svg
│  └─ images/
│     └─ posters/
├─ scripts/
│  ├─ generate-sample-data.ts
│  └─ validate-data.ts
├─ tests/
│  ├─ selectors.test.ts
│  ├─ date.test.ts
│  ├─ urls.test.ts
│  └─ data.test.ts
└─ .github/
   └─ workflows/
      └─ deploy-pages.yml
```

ファイル名や分割方法は変更可能だが、表示ロジック、ドメインロジック、データ生成、スタイル、テストが混在しない構成を維持する。

---

## 7. データ仕様

### 7.1 データ全体

```ts
export type AppData = {
  schemaVersion: 1;
  generatedAt: string;
  timezone: "Asia/Tokyo";
  sourceMode: "sample" | "live";
  dates: string[];
  movies: Movie[];
  theaters: Theater[];
  screenings: Screening[];
};
```

### 7.2 映画

```ts
export type Movie = {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  durationMinutes: number;
  releaseDate: string;
  genres: string[];
  posterPath: string;
};
```

制約:

- `id` はURLに使用できる英小文字、数字、ハイフンで構成する。
- `title` は空文字不可。
- `synopsis` は1文字以上。
- `durationMinutes` は1以上の整数。
- `releaseDate` は `YYYY-MM-DD`。
- `posterPath` はローカルファイルへの相対パスとする。

### 7.3 映画館

```ts
export type Theater = {
  id: string;
  name: string;
  area: string;
  description: string;
  officialUrl: string;
  ticketUrl: string;
};
```

制約:

- `officialUrl` と `ticketUrl` は `https://` で始まるURLとする。
- プロトタイプでは、予約リンクは実在サイトを装わず、安全なサンプルURLまたは明示的なダミーリンクとする。
- ダミーリンクを使う場合、画面上に「デモ用リンク」と明記する。

### 7.4 上映情報

```ts
export type Screening = {
  id: string;
  movieId: string;
  theaterId: string;
  date: string;
  startTime: string;
  endTime: string;
  ticketUrl?: string;
};
```

制約:

- `date` は `YYYY-MM-DD`。
- `startTime` と `endTime` は24時間制の `HH:mm`。
- `movieId` と `theaterId` は必ず既存データを参照する。
- 同一映画・同一映画館・同一日・同一開始時刻の重複を禁止する。
- `endTime` は `startTime` より後とする。

### 7.5 サンプルデータ量

生成スクリプトは、最低限次を生成する。

- 映画: 8作品以上
- 映画館: 4館以上
- 日付: 実行日の日本時間を基準に4日分
- 各映画館・各日: 3作品以上
- 各作品: 少なくとも1館で上映
- 各上映作品: 1日につき2回以上の上映時刻

### 7.6 サンプル日付の生成

固定日付をリポジトリへ書き込まない。

`scripts/generate-sample-data.ts` が実行時の日本時間を基準に、今日、明日、2日後、3日後の日付を生成し、`src/data/generated.json` を上書きする。

これにより、サイトが古い日付だけを表示する状態を避ける。

### 7.7 データ検証

`scripts/validate-data.ts` は次を検証し、不正な場合は終了コード1で失敗する。

- 必須フィールド
- 日付・時刻形式
- IDの一意性
- 参照整合性
- 重複上映
- 上映終了時刻
- 4日分の日付
- 最低データ件数
- ポスターファイルの存在

`npm run build` の前に、データ生成と検証を必ず実行する。

---

## 8. 画面仕様

## 8.1 共通ヘッダー

全ページの上部に次を表示する。

- アプリ名
- トップページへのリンク
- 映画検索バー。ただし映画詳細画面・映画館詳細画面では、検索実行時にトップページへ戻して検索結果を表示してもよい。
- データ最終更新日時

要件:

- ヘッダーはスマートフォン幅で崩れない。
- 検索入力にはラベルまたは `aria-label` を付ける。
- Enterキーで検索できる。
- 入力値の前後空白は無視する。

## 8.2 トップページ

表示順は次とする。

1. ヘッダー
2. 日付切り替えタブ
3. 選択日の説明
4. 映画一覧
5. 映画館一覧
6. フッター

### 8.2.1 日付切り替え

- 今日を含む4日分を横並びで表示する。
- 表示例: `今日 7/31`、`明日 8/1`、`8/2`、`8/3`
- 選択中の日付が視覚的に分かる。
- URLのクエリパラメータ `date=YYYY-MM-DD` に選択日を保存する。
- 無効な日付が渡された場合は今日へフォールバックする。
- ブラウザの戻る・進むで選択日が復元される。

### 8.2.2 検索

- 映画タイトルを大文字小文字を区別せず部分一致で検索する。
- 日本語文字列はそのまま部分一致でよい。
- 検索語はURLのクエリパラメータ `q` に保存する。
- 日付選択と検索条件は同時に使用できる。
- 検索結果が0件の場合は、「該当する映画はありません」と表示する。
- 検索欄を空にすると全件表示へ戻る。

### 8.2.3 映画一覧

映画カードには次を表示する。

- ポスター
- 映画タイトル
- 上映時間
- ジャンル
- 選択日に上映する映画館数
- 最も早い今後の上映時刻。すべて終了している場合は「本日の上映終了」

カード全体をクリックまたはキーボード操作できる。

遷移先:

```text
movie.html?id=<movieId>&date=<selectedDate>
```

映画の並び順:

1. 選択日にこれから上映がある作品
2. 最も早い次回上映時刻
3. 映画タイトル

未来日の場合は最初の上映時刻順とする。

### 8.2.4 映画館一覧

映画館カードには次を表示する。

- 映画館名
- エリア
- 短い説明
- 選択日の上映作品数
- 「上映作品を見る」リンク

遷移先:

```text
theater.html?id=<theaterId>&date=<selectedDate>
```

## 8.3 映画詳細画面

表示内容:

- 戻るリンク
- ポスター
- タイトル
- 原題。存在する場合のみ
- あらすじ
- 上映時間
- 公開日
- ジャンル
- 日付切り替え
- 選択日に上映する映画館一覧
- 各映画館の上映時刻
- 予約サイトへの外部リンク

上映時刻は、終了済みと今後の上映を視覚的に区別する。

外部リンク要件:

- 新しいタブで開く。
- `rel="noopener noreferrer"` を付ける。
- 「外部サイト」または「デモ用リンク」であることが分かる表示にする。

該当日の上映がない場合は、「この日の上映情報はありません」と表示する。

## 8.4 映画館詳細画面

表示内容:

- 戻るリンク
- 映画館名
- エリア
- 説明
- 公式サイトへのリンク
- チケット予約サイトへのリンク
- 日付切り替え
- 選択日に上映する映画一覧
- 各映画の上映時刻

上映作品は最初の上映時刻順とする。

## 8.5 不正ID画面

`movie.html?id=unknown` や `theater.html?id=unknown` のように存在しないIDが渡された場合:

- 例外を画面へ露出しない。
- 「指定された映画が見つかりません」または「指定された映画館が見つかりません」と表示する。
- トップページへ戻るリンクを表示する。
- HTTP 404にする必要はない。

## 8.6 フッター

表示内容:

- デモアプリであること
- 上映情報がサンプルデータであること
- 予約・上映情報は公式サイトで確認すべきこと
- GitHubリポジトリへのリンク。リポジトリURLが未確定の場合は設定ファイルから差し替え可能にする。

---

## 9. UI・デザイン要件

- 画面は日本語で統一する。
- 清潔感のある映画情報サイト風のデザインとする。
- 極端に派手なアニメーションは使用しない。
- 映画カードはCSS Gridでレスポンシブ配置する。
- 目安:
  - スマートフォン: 2列または1列
  - タブレット: 3列
  - PC: 4列以上
- 本文の最大幅を設定し、超大型画面で横に広がりすぎないようにする。
- 画像には代替テキストを付ける。
- フォーカス表示を消さない。
- 色だけで状態を表現しない。
- ボタンやリンクのクリック領域を十分に取る。
- ポスターの縦横比を統一し、画像の有無でカード高さが崩れないようにする。
- JavaScript無効時の完全対応は不要だが、`noscript` で案内を表示する。

---

## 10. URL・状態管理仕様

### 10.1 トップページ

```text
index.html?date=2026-07-31&q=movie
```

利用するクエリ:

- `date`: 選択日
- `q`: 検索語

### 10.2 映画詳細

```text
movie.html?id=movie-001&date=2026-07-31
```

### 10.3 映画館詳細

```text
theater.html?id=theater-001&date=2026-07-31
```

### 10.4 URL処理

- URLの作成は文字列連結を各所に散らさず、`src/domain/urls.ts` に集約する。
- 値は `URLSearchParams` でエンコードする。
- GitHub Pagesのサブパスで動作するよう、同一サイト内リンクは相対URLにする。
- ブラウザ履歴を壊さない。

---

## 11. ドメインロジック

表示コンポーネント内へ複雑な抽出処理を書かず、純粋関数として実装する。

最低限、次の関数または同等の機能を持たせる。

```ts
getAvailableDates(data): string[]
getMoviesForDate(data, date): Movie[]
searchMovies(movies, query): Movie[]
getTheatersForMovie(data, movieId, date): Theater[]
getMoviesForTheater(data, theaterId, date): Movie[]
getScreeningsForMovie(data, movieId, date): Screening[]
getScreeningsForTheater(data, theaterId, date): Screening[]
getNextScreening(screenings, now): Screening | null
isScreeningFinished(screening, now): boolean
formatDateLabel(date, today): string
formatMinutes(minutes): string
```

時刻判定は `Asia/Tokyo` を基準とする。

現在時刻に依存する関数は、テスト可能にするため `now` を引数で受け取る。

---

## 12. ポスター仕様

- 初期実装ではローカルのダミーポスターを使用する。
- 著作権のある実在映画ポスターを無断で使用しない。
- 8作品以上について、アプリ内で識別しやすい独自のSVGまたは画像を用意する。
- ポスター読み込み失敗時には共通プレースホルダーを表示する。
- ダミーポスターに映画タイトルを入れてよい。

---

## 13. Docker仕様

## 13.1 Dockerfile

マルチステージビルドとする。

### buildステージ

- 公式Node.js LTSのAlpineイメージ
- `npm ci`
- サンプルデータ生成
- データ検証
- lint
- test
- build

### runtimeステージ

- `nginx:alpine`
- Viteの `dist` をNginxの公開ディレクトリへコピー
- ポート80で配信

要件:

- 開発用ファイルや `node_modules` をruntimeイメージへ含めない。
- root権限回避が容易なら行うが、それによって初期実装を壊さない。
- `HEALTHCHECK` を設定する。

## 13.2 compose.yaml

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
```

必要に応じてhealthcheckを追加する。

## 13.3 ローカル起動

```bash
docker compose up --build
```

アクセス先:

```text
http://localhost:8080
```

停止:

```bash
docker compose down
```

---

## 14. GitHub Actions仕様

単一の `.github/workflows/deploy-pages.yml` で、検証、ビルド、Pages公開を行う。

### 14.1 トリガー

- `push` to `main`
- `workflow_dispatch`
- `schedule`

定期実行例:

```yaml
schedule:
  - cron: "17 */6 * * *"
```

定期実行は厳密な時刻を保証しないため、UIや処理が実行時刻の完全一致に依存しないようにする。

### 14.2 権限

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

### 14.3 concurrency

同時デプロイによる競合を避ける。

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

### 14.4 buildジョブ

実施順:

1. checkout
2. Node.jsセットアップ
3. `npm ci`
4. `npm run generate:data`
5. `npm run validate:data`
6. `npm run lint`
7. `npm run test -- --run`
8. `npm run build`
9. Pages設定
10. `dist` をPages artifactとしてアップロード

### 14.5 deployジョブ

- buildジョブに依存する。
- environment名は `github-pages`。
- Pages artifactをデプロイする。

利用する公式Actionの目安:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4`

実装時に公式ドキュメントとMarketplace上の安定版を確認し、互換性のあるメジャーバージョンを使用する。

### 14.6 Actionsで行わないこと

- 常駐Webサーバーの実行
- 定期ジョブからの無条件なリポジトリ書き換え・自動コミット
- APIキーのハードコード
- 外部サイトへの高頻度アクセス

GitHub Actionsは、データ生成、検証、静的サイトのビルド、GitHub Pagesへの公開を行う一時的な実行環境として扱う。

---

## 15. package.json scripts

最低限、次のスクリプトを用意する。

```json
{
  "scripts": {
    "dev": "npm run generate:data && vite",
    "generate:data": "tsx scripts/generate-sample-data.ts",
    "validate:data": "tsx scripts/validate-data.ts",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:run": "vitest run",
    "build": "npm run generate:data && npm run validate:data && tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

コマンド名は変更可能だが、同等の一括検証が可能であること。

---

## 16. テスト仕様

最低限、次を自動テストする。

### 16.1 データ

- 生成データがスキーマを満たす。
- IDが重複しない。
- 参照先が存在する。
- 今日から4日分の日付が存在する。
- 上映時刻が正しい順序になっている。

### 16.2 検索

- 空文字で全件を返す。
- 完全一致で対象作品を返す。
- 部分一致で対象作品を返す。
- 大文字小文字の差を無視する。
- 前後空白を無視する。
- 該当なしで空配列を返す。

### 16.3 日付

- 今日を「今日」と表示する。
- 明日を「明日」と表示する。
- それ以降を月日で表示する。
- 無効な日付を安全に処理する。

### 16.4 上映情報

- 映画ごとに上映情報を抽出できる。
- 映画館ごとに上映情報を抽出できる。
- 日付で抽出できる。
- 次回上映を取得できる。
- 終了済み上映を判定できる。

### 16.5 URL

- 映画詳細URLにIDと日付が含まれる。
- 映画館詳細URLにIDと日付が含まれる。
- 日本語検索語が正しくエンコードされる。
- 内部URLがドメイン直下の絶対パスにならない。

---

## 17. エラーハンドリング

次のケースでアプリが停止しないこと。

- データが空
- 不正な日付
- 不正な映画ID
- 不正な映画館ID
- ポスター画像が見つからない
- 上映情報がない
- 検索結果がない
- 外部リンクが設定されていない

開発者向け詳細は `console.error` に出してよいが、画面には利用者向けの日本語メッセージを表示する。

本番ビルドでは、スタックトレースや内部構造を画面に表示しない。

---

## 18. セキュリティ・安全性

- ユーザー入力を `innerHTML` へ直接代入しない。
- 表示は原則 `textContent` または安全なDOM生成で行う。
- 外部リンクには `noopener noreferrer` を付ける。
- URLパラメータを信頼しない。
- 秘密情報をクライアントへ置かない。
- 依存関係を必要最小限にする。
- GitHub Actionsの権限を最小化する。
- サンプル予約リンクを実際の予約ができるものとして誤認させない。

---

## 19. パフォーマンス

- 初回表示で不要な巨大ライブラリを導入しない。
- 画像サイズを適切にする。
- ポスターには `loading="lazy"` を使用する。ただし最初に表示される数枚は例外としてよい。
- 8〜20作品程度で即時に検索結果が更新されること。
- レイアウトシフトを避けるため、画像領域の縦横比をCSSで確保する。

厳密な数値目標は設けないが、一般的なPC・スマートフォンで待ち時間を感じないこと。

---

## 20. README仕様

READMEには次を含める。

1. アプリ名
2. 概要
3. 主な機能
4. スクリーンショットを置く場所
5. 公開URL
6. GitHub PagesとGitHub Actionsの役割
7. 使用技術
8. ディレクトリ構成
9. Dockerによる起動方法
10. Node.jsによるローカル開発方法
11. テスト・lint・buildの実行方法
12. GitHub Pagesを有効化する手順
13. サンプルデータであること
14. 将来の実データ取得への拡張方針
15. 制限事項
16. ライセンス

公開URLやリポジトリURLが未確定の場合は、明示的なプレースホルダーを一か所にまとめ、変更箇所をREADMEへ記載する。

---

## 21. 実装手順

Codexは次の順番で実装する。

### Phase 1: 基盤

- Vite + TypeScriptプロジェクト
- lint、format、test
- ディレクトリ構成
- 共通CSS

完了確認:

```bash
npm ci
npm run lint
npm run test:run
npm run build
```

### Phase 2: データ

- 型定義
- サンプル生成スクリプト
- ダミーポスター
- データ検証
- セレクタ関数
- 単体テスト

### Phase 3: トップページ

- 共通ヘッダー
- 日付切り替え
- 検索
- 映画一覧
- 映画館一覧
- URL状態管理

### Phase 4: 詳細画面

- 映画詳細
- 映画館詳細
- 予約リンク
- 不正ID表示

### Phase 5: Docker

- Dockerfile
- Nginx設定
- compose.yaml
- healthcheck

確認:

```bash
docker compose up --build -d
curl --fail http://localhost:8080/
docker compose down
```

Windows環境で `curl` が使えない場合は、ブラウザまたはPowerShellの `Invoke-WebRequest` で確認する。

### Phase 6: GitHub Actions・README

- Pagesデプロイworkflow
- README
- 最終検証

---

## 22. Codexへの作業ルール

Codexは次を守ること。

1. 実装開始前に、この仕様書を最後まで読む。
2. 仕様書から実装チェックリストを作成する。
3. 一度に全ファイルを雑に生成せず、Phase単位で実装・検証する。
4. 各Phase完了時に関連コマンドを実行する。
5. コマンドが失敗した場合、原因を調査し、修正して再実行する。
6. 必須機能をコメントアウトしてテストを通さない。
7. 型エラーを `any` の乱用で回避しない。
8. lintルールを無効化して問題を隠さない。
9. テストを削除して成功扱いにしない。
10. 実装していない機能をREADMEに「実装済み」と書かない。
11. 依存パッケージを追加する場合、必要性を説明できる最小構成にする。
12. GitHub Pagesのサブパス動作を必ず考慮する。
13. 外部サービスや秘密情報を必要とする構成へ勝手に変更しない。
14. サンプルデータを「実際の上映情報」と誤認させない。
15. 最後に `npm run lint`、`npm run format:check`、`npm run test:run`、`npm run build`、Docker起動確認を実行する。
16. 実行できなかった検証がある場合は、完了したふりをせず、理由と未確認項目を明記する。
17. ユーザーへ確認しなくても合理的に決められる軽微な事項は、この仕様書の目的に沿って判断する。
18. 仕様変更が必要な場合は、変更理由と影響範囲を作業報告へ記載する。

---

## 23. Codexの最終報告形式

実装後、Codexは次の形式で報告する。

```text
## 実装結果
- 実装した機能:
- 主な技術選択:
- 仕様から変更した点:

## 検証結果
- npm run lint:
- npm run format:check:
- npm run test:run:
- npm run build:
- docker compose up --build:
- localhost表示確認:

## GitHub Pages
- workflowファイル:
- ユーザー側で必要な設定:
- 想定公開URL:

## 残課題
- 未確認事項:
- 将来機能:
```

「問題なく動くはず」のような推測だけで完了としない。実際に実行したコマンドと結果を記載する。

---

## 24. 受け入れテスト

人間が最終確認する項目。

### 24.1 Docker

- [ ] `docker compose up --build` が成功する。
- [ ] `http://localhost:8080` が表示される。
- [ ] CSSとポスターが読み込まれる。
- [ ] コンテナ再作成後も動作する。

### 24.2 トップページ

- [ ] 今日の日付が初期選択される。
- [ ] 4日分の日付を切り替えられる。
- [ ] 日付変更で映画一覧が変化する。
- [ ] タイトル検索が動く。
- [ ] 検索と日付選択を併用できる。
- [ ] 映画カードと映画館カードが表示される。

### 24.3 映画詳細

- [ ] ポスター、タイトル、概要が表示される。
- [ ] 上映映画館と上映時刻が表示される。
- [ ] 日付を切り替えられる。
- [ ] 予約リンクが外部タブで開く。

### 24.4 映画館詳細

- [ ] 映画館情報が表示される。
- [ ] 選択日の上映作品が表示される。
- [ ] 各作品の上映時刻が表示される。
- [ ] 公式・予約リンクが外部タブで開く。

### 24.5 異常系

- [ ] 存在しない映画IDで案内画面が表示される。
- [ ] 存在しない映画館IDで案内画面が表示される。
- [ ] 該当なし検索で空状態が表示される。
- [ ] 無効な日付で白画面にならない。
- [ ] ポスター読み込み失敗時に代替表示される。

### 24.6 GitHub Pages

- [ ] PagesのプロジェクトURLで表示できる。
- [ ] CSS、JavaScript、画像が404にならない。
- [ ] 映画詳細・映画館詳細へ遷移できる。
- [ ] ブラウザ更新後も詳細ページが表示される。
- [ ] Actionsの手動実行で再デプロイできる。
- [ ] Actionsの定期実行が設定されている。

### 24.7 レスポンシブ・操作性

- [ ] 画面幅375px程度で横スクロールが発生しない。
- [ ] キーボードで主要リンクとボタンを操作できる。
- [ ] フォーカス位置が見える。
- [ ] 画像に代替テキストがある。

---

## 25. 将来の実データ化

初期実装完了後、次のインターフェースを保ったままデータ取得処理を差し替える。

```ts
export interface MovieDataProvider {
  load(): Promise<AppData>;
}
```

想定Provider:

- `SampleDataProvider`
- `ScrapedDataProvider`
- `ExternalApiDataProvider`

実データ化するときは、次を別途調査する。

- 対象サイトの利用規約
- robots.txt
- アクセス頻度
- キャッシュ
- HTML構造変更時の失敗処理
- 作品名の表記揺れ
- ポスターや作品概要の利用条件
- 取得失敗時に前回成功データを維持する方法

実データ取得に失敗しても、空のサイトをデプロイしない設計にする。

---

## 26. 今回のプロトタイプで重視すること

優先順位は次の通り。

1. 確実に起動・ビルド・公開できること。
2. 検索、日付切り替え、詳細遷移が正しく動くこと。
3. GitHub PagesとDockerの双方で同じ成果物が動くこと。
4. コードとデータ構造が、後の実データ化に耐えられること。
5. 見た目を整えること。
6. 機能を増やすこと。

初期実装では機能数より、再現性と完成度を優先する。

---

## 27. Codexへ渡す開始指示

次の文章とこの仕様書をCodexへ渡す。

```text
このリポジトリに、添付された「映画館横断上映情報アプリ — プロトタイプ仕様書」に従ってアプリを実装してください。

最初にリポジトリの現在状態と仕様書を確認し、実装チェックリストを作成してください。その後、仕様書のPhase順に実装してください。各Phaseでlint、テスト、buildなど必要な検証を実行し、失敗した場合は修正して再実行してください。

初期版では実サイトのスクレイピングや外部APIを追加せず、相対日付のサンプルデータを使用してください。GitHub Pagesのプロジェクトサイト配下でも、Dockerのlocalhost環境でも、同じビルド成果物が正しく動作することを重視してください。

必須機能を省略したり、テストを削除・無効化して完了扱いにしたりしないでください。作業後は、仕様書に定めた形式で、変更内容、検証コマンドと結果、GitHub Pages側で必要な設定、残課題を報告してください。
```

---

## 28. 参考となる公式資料

- [GitHub Pagesとは](https://docs.github.com/ja/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pagesでカスタムワークフローを使用する](https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actionsのワークフロー構文](https://docs.github.com/ja/actions/reference/workflows-and-actions/workflow-syntax)
- [ワークフローをトリガーするイベント](https://docs.github.com/ja/actions/reference/workflows-and-actions/events-that-trigger-workflows)

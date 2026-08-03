# Movie Schedule Viewer

複数の映画館について、今日から4日分の上映作品と上映時刻をまとめて確認できる静的Webアプリです。映画タイトル検索、日付切り替え、映画・映画館それぞれの詳細表示、外部予約リンクへの遷移に対応しています。生成データを使う`sample`と、許可した3館の公式上映予定を取得する`real`の2モードがあります。

> **重要:** GitHub Pagesは`real`モードで3館の公式上映予定を取得して公開します。情報の正確性は保証せず、予定は変更される場合があります。画面の最終取得日時を確認し、購入前に必ず各映画館の公式サイトで再確認してください。

## 公開URL

- GitHub Pages: <https://gmcky139.github.io/movie-checker/>
- ローカルDocker: <http://localhost:8080>
- リポジトリ: <https://github.com/gmcky139/movie-checker>

公開URLまたはリポジトリURLが変わる場合は、`src/config.ts`の設定を更新してください。

## 主な機能

- 日本時間を基準にした今日・明日・2日後・3日後の上映表示
- 映画タイトルの大文字小文字を区別しない部分一致検索
- URLクエリによる検索語と選択日の保持
- ポスター、上映時間、ジャンル、上映館数、次回上映時刻を含む映画一覧
- 選択日の上映作品数を含む映画館一覧
- 映画ごとの上映館、上映時刻、安全に取得できた公式予約リンク
- 映画館ごとの上映作品、上映時刻、公式サイト・予約リンク
- 不正なID・日付、空データ、検索結果なし、画像読込失敗時の日本語案内
- PC、タブレット、スマートフォンに対応したレスポンシブ表示
- 109シネマズ名古屋、ミッドランドスクエアシネマ、イオンシネマ常滑の限定実データ取得
- 作品名の規則ベース正規化、字幕・吹替・特殊上映、スクリーン、深夜上映の保持
- 取得元、取得日時、取得成否を含むデータ検証と、全3館成功時だけの原子的更新

## スクリーンショット

スクリーンショットは`docs/screenshots/`へ配置する想定です。トップ、映画詳細、映画館詳細をそれぞれデスクトップ幅とスマートフォン幅で保存すると、主要な受け入れ項目を確認しやすくなります。

## 技術構成

- Vite + TypeScript + HTML + CSS
- Vitest
- ESLint + Prettier
- ビルド前に生成するJSON
- マルチステージDocker build + Nginx
- Docker Compose
- GitHub Actions + GitHub Pages

ブラウザ側にバックエンド、データベース、認証、外部映画API、取得処理はありません。許可した公式上映予定の取得はビルド時だけに行い、Viteの`dist`をGitHub PagesとNginxの双方へそのまま配信します。`base: "./"`と相対内部URLにより、GitHub Pagesのプロジェクトサイト配下でも動作します。

## ディレクトリ構成

```text
.
├── index.html / movie.html / theater.html
├── src/
│   ├── components/       # 安全なDOM生成による表示部品
│   ├── data/             # 生成JSONとSampleDataProvider
│   ├── domain/           # 型、日付、セレクタ、URL処理
│   ├── pages/            # 各ページの表示制御
│   └── styles/           # 共通・レイアウト・部品CSS
├── public/               # faviconと独自SVGデモポスター
├── scripts/              # モード選択、取得アダプター、正規化、データ検証
├── tests/                # Vitest単体テストと人工的な取得フィクスチャ
├── .github/workflows/    # Pagesの検証・ビルド・デプロイ
├── Dockerfile
├── compose.yaml
└── nginx.conf
```

## データモード

- `sample`: オフライン開発、決定的なテスト、デモ向けのローカル生成データです。ローカルDockerの既定モードです。
- `real`: 次の公式上映予定から、今日を含む4日分をビルド時に取得します。GitHub Pagesの公開ビルドはこのモードです。3館すべての取得・解析・検証が成功しなければビルドを失敗させ、既存JSONを空データで置換しません。

対応する情報源:

- [109シネマズ名古屋](https://109cinemas.net/nagoya/)
- [ミッドランドスクエアシネマ](https://ticket.midlandcinema.jp/schedule/ticket/0201/index.html)
- [イオンシネマ常滑](https://theater.aeoncinema.com/theaters/tokoname/)

これらは公式APIではなく、公開されているHTMLまたはJSONの限定的な取得です。ログイン、認証、Cookie、ブラウザ自動操作は使用しません。

## Dockerで起動

Docker EngineとDocker Compose v2以降が必要です。

サンプルモード:

```bash
DATA_MODE=sample docker compose build --no-cache
DATA_MODE=sample docker compose up -d
```

実データモード:

```bash
DATA_MODE=real docker compose build --no-cache
DATA_MODE=real docker compose up -d
```

起動後、<http://localhost:8080>を開きます。状態確認と停止は次のとおりです。

```bash
docker compose ps
docker compose down
```

Dockerfileのbuildステージでは、依存関係のインストール、選択モードのデータ生成または取得、データ検証、Lint、整形確認、テスト、本番ビルドを実行します。runtimeステージにはNginxと`dist`だけを含めます。

## ローカル開発と検証

WSLホストへNode.js、npm、Viteなどをインストールせず、上記のDockerビルドで検証してください。リポジトリ直下へ`node_modules`を作る一時コンテナも使用しません。

Docker外での開発が許可された別環境ではNode.js 24とnpmを使用できます。

```bash
npm ci
npm run dev
```

Viteが表示するローカルURLをブラウザで開いてください。`npm run dev`は起動前に日本時間を基準としたサンプルデータを再生成します。

利用できるコマンド:

```bash
npm run generate:data  # DATA_MODEに従って生成または取得
npm run fetch:real-data # 3館から実データを取得
npm run validate:data  # スキーマ、参照、件数、画像などを検証
npm run validate:real-data # 生成JSONが検証済みrealデータか確認
npm run lint           # ESLint
npm run format         # Prettierで整形
npm run format:check   # 整形状態を確認
npm run test           # Vitest watch mode
npm run test:run       # Vitestを一度実行
npm run test:providers # 人工フィクスチャによる取得処理テスト
npm run build          # 型チェック・本番ビルド（再取得はしない）
npm run preview        # distをローカルプレビュー
```

## GitHub PagesとGitHub Actions

`.github/workflows/deploy-pages.yml`は次の場合に実行されます。

- `main`ブランチへのpush
- Actions画面からの手動実行
- 6時間ごとの定期実行

ワークフローは`DATA_MODE=real`で、`npm ci`、3館の実データ取得、実データ全体の検証、Lint、整形確認、非watchテスト、型チェックとビルドを順に行います。すべて成功した場合だけ`dist`をPages artifactとしてアップロードしてデプロイします。定期実行では生成データをリポジトリへcommitせず、その回の公開成果物だけを更新します。

1館でも取得・解析・検証に失敗した場合、またはLint・テスト・ビルドが失敗した場合は、artifactのアップロードとデプロイを行いません。サンプルや部分データへ切り替えず、直前に成功したPagesを維持します。

`.github/workflows/validate-real-data.yml`は手動実行専用です。実データ取得と全検証を行い、JSONと`dist`を短期間のartifactとして保存しますが、GitHub Pagesへはデプロイしません。

初回公開時は、リポジトリ管理者がGitHubで次を設定してください。

1. **Settings → Pages → Build and deployment → Source**で**GitHub Actions**を選択する。
2. **Actions**がリポジトリで有効であることを確認する。
3. `Test, build, and deploy GitHub Pages`ワークフローを手動実行するか、`main`への次回pushを待つ。
4. workflowの`deploy`ジョブと`github-pages` environmentが成功したことを確認する。

公開後は、Pages URLでCSS、JavaScript、ポスター、詳細ページ遷移と詳細ページの再読み込みを確認してください。

## データ取得と安全策

`scripts/generate-data.ts`がモードを選び、`src/data/generated.json`を原子的に更新します。`real`では取得元ごとのアダプターを共通中間型へ変換し、Unicode NFKC、空白・括弧の統一、確実に識別できる上映形式の分離、明示エイリアスによって作品をまとめます。曖昧な文字列類似度による統合は行いません。

HTTPはHTTPSと公式ホストallowlistに限定し、リダイレクト先も検証します。タイムアウト、レスポンスサイズ、最大2同時接続を設定し、403・404・429はリトライしません。公式画像、ポスター、ロゴ、あらすじ、キャストは取得せず、実データ作品にもローカルの共通プレースホルダーを使います。イオンシネマの上映回には、安全に確認できる公式予約URLがないため推測せず、時刻を非リンクで表示します。

## 制限事項

- `sample`の上映、映画館、予約情報はデモ用で、実際の予約はできません。
- `real`も情報の正確性・完全性・継続取得を保証しません。サイト構造変更、未発表日、HTTPエラーによってビルドが失敗する場合があります。
- 長期運用では、対象3サイトの利用条件、robots.txt、表示方針、許容されるアクセス頻度に変更がないかを人間が定期的に確認する必要があります。
- イオンシネマについては[サイトポリシー](https://www.aeoncinema.com/sitepolicy/)も確認してください。109シネマズとミッドランドスクエアシネマについても、公開利用を認める明示条件が見つからない場合は各運営者へ確認してください。
- GitHub Pagesのpush・手動・定期公開は実データモードです。取得を拒否する応答や構造変更が発生した場合は、回避せず公開更新を停止します。
- 座席状況、アプリ内決済、アカウント、お気に入り同期、位置情報には対応しません。
- JavaScriptを無効にした状態での完全動作には対応しません。
- GitHub Pagesの公開には、上記のリポジトリ設定とworkflowの実行が必要です。

## ライセンス

[MIT License](LICENSE)

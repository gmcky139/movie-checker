# Movie Schedule Viewer

複数の映画館について、今日から4日分の上映作品と上映時刻をまとめて確認できる静的Webアプリのプロトタイプです。映画タイトル検索、日付切り替え、映画・映画館それぞれの詳細表示、外部予約リンクへの遷移に対応しています。

> **重要:** 表示される映画、映画館、上映時刻、予約URLはすべて生成されたデモデータです。実際の上映・予約情報ではありません。

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
- 映画ごとの上映館、上映時刻、デモ予約リンク
- 映画館ごとの上映作品、上映時刻、公式・デモ予約リンク
- 不正なID・日付、空データ、検索結果なし、画像読込失敗時の日本語案内
- PC、タブレット、スマートフォンに対応したレスポンシブ表示

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

ブラウザ側にバックエンド、データベース、認証、外部映画API、スクレイピング処理はありません。Viteの`dist`をGitHub PagesとNginxの双方へそのまま配信します。`base: "./"`と相対内部URLにより、GitHub Pagesのプロジェクトサイト配下でも動作します。

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
├── scripts/              # サンプル生成とデータ検証
├── tests/                # Vitest単体テスト
├── .github/workflows/    # Pagesの検証・ビルド・デプロイ
├── Dockerfile
├── compose.yaml
└── nginx.conf
```

## Dockerで起動

Docker EngineとDocker Compose v2以降が必要です。

```bash
docker compose up --build -d
```

起動後、<http://localhost:8080>を開きます。状態確認と停止は次のとおりです。

```bash
docker compose ps
docker compose down
```

Dockerfileのbuildステージでは、依存関係のインストール、データ生成・検証、Lint、整形確認、テスト、本番ビルドを実行します。runtimeステージにはNginxと`dist`だけを含めます。

## Node.jsでローカル開発

Node.js 24とnpmを使用します。

```bash
npm ci
npm run dev
```

Viteが表示するローカルURLをブラウザで開いてください。`npm run dev`は起動前に日本時間を基準としたサンプルデータを再生成します。

利用できるコマンド:

```bash
npm run generate:data  # 今日から4日分のデモJSONを生成
npm run validate:data  # スキーマ、参照、件数、画像などを検証
npm run lint           # ESLint
npm run format         # Prettierで整形
npm run format:check   # 整形状態を確認
npm run test           # Vitest watch mode
npm run test:run       # Vitestを一度実行
npm run build          # データ生成・検証・型チェック・本番ビルド
npm run preview        # distをローカルプレビュー
```

## GitHub PagesとGitHub Actions

`.github/workflows/deploy-pages.yml`は次の場合に実行されます。

- `main`ブランチへのpush
- Actions画面からの手動実行
- 6時間ごとの定期実行

ワークフローは`npm ci`、データ生成・検証、Lint、整形確認、テスト、ビルドを順に行い、成功した`dist`をPages artifactとしてデプロイします。定期実行では生成データをリポジトリへcommitせず、その回の公開成果物だけを更新します。

初回公開時は、リポジトリ管理者がGitHubで次を設定してください。

1. **Settings → Pages → Build and deployment → Source**で**GitHub Actions**を選択する。
2. **Actions**がリポジトリで有効であることを確認する。
3. `Test, build, and deploy GitHub Pages`ワークフローを手動実行するか、`main`への次回pushを待つ。
4. workflowの`deploy`ジョブと`github-pages` environmentが成功したことを確認する。

公開後は、Pages URLでCSS、JavaScript、ポスター、詳細ページ遷移と詳細ページの再読み込みを確認してください。

## データ生成と将来の拡張

`scripts/generate-sample-data.ts`が`src/data/generated.json`を生成し、`SampleDataProvider`が読み込みます。表示側は`MovieDataProvider`インターフェースに依存するため、将来は利用規約、権利、アクセス頻度、キャッシュ、取得失敗時の維持方針を確認したうえで、別Providerへ差し替えられます。

初期版では実在サイトのスクレイピングや外部映画APIを意図的に実装していません。独自SVGポスター以外の画像も取得しません。

## 制限事項

- 上映、映画館、予約情報はデモ用で、実際の予約はできません。
- 座席状況、アプリ内決済、アカウント、お気に入り同期、位置情報には対応しません。
- JavaScriptを無効にした状態での完全動作には対応しません。
- GitHub Pagesの公開には、上記のリポジトリ設定とworkflowの実行が必要です。

## ライセンス

[MIT License](LICENSE)

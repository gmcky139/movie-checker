# Movie Schedule Viewer

109シネマズ名古屋、ミッドランドスクエアシネマ、イオンシネマ常滑の上映予定を横断して確認できる静的Webアプリです。Asia/Tokyo基準の今日・明日・明後日を対象に、作品名検索、日付切り替え、映画・映画館の詳細、公式予約ページへの安全なリンクを提供します。

> GitHub Pagesでは3館の公式情報を取得した`real`モードを公開しています。上映予定は変更される場合があります。画面の最終取得日時を確認し、購入前に必ず各映画館の公式サイトで再確認してください。

## 公開URL

- アプリ: <https://gmcky139.github.io/movie-checker/>
- リポジトリ: <https://github.com/gmcky139/movie-checker>

## 動作画面

### トップページ — 3日間の日付切り替え

![今日・明日・明後日の日付タブと上映作品一覧を表示したトップページ](<docs/screenshots/スクリーンショット 2026-08-04 145109.png>)

### 上映中の映画 — ポスター一覧

![ポスター、作品名、上映館数、次回上映時刻を並べた映画一覧](<docs/screenshots/スクリーンショット 2026-08-04 145114.png>)

### 対象映画館 — 3館の一覧

![109シネマズ名古屋、ミッドランドスクエアシネマ、イオンシネマ常滑の映画館一覧](<docs/screenshots/スクリーンショット 2026-08-04 145133.png>)

## 主な機能

- Asia/Tokyo基準の今日・明日・明後日の上映予定を表示
- 大文字・小文字を区別しない映画タイトルの部分一致検索
- URLクエリに検索語と選択日を保持
- ポスター、上映時間、ジャンル、上映館数、次回上映時刻を含む映画一覧
- 選択日の上映作品数を含む映画館一覧
- 映画・映画館ごとの上映時刻と、安全に取得できた公式予約リンク
- 不正なID・日付、空データ、検索結果なし、画像読込失敗時の日本語案内
- PC、タブレット、スマートフォンに対応したレスポンシブ表示
- 3館の公式情報を対象にした実データ取得と、全館成功時だけの原子的更新
- 作品名の規則ベース正規化と、字幕・吹替・特殊上映、スクリーン、深夜上映の保持
- TMDBとの保守的な照合によるポスター表示、作品名付きfallback、取得率検証、帰属表示

## Dockerによるクイックスタート

Docker EngineとDocker Compose v2以降が必要です。WSLホストへNode.jsやnpmをインストールする必要はありません。

設定ファイルを作成します。初期値は、外部通信やトークンを必要としない`sample`モードです。

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

起動後に<http://localhost:8080>を開きます。終了時はコンテナを停止します。

```bash
docker compose down
```

Dockerfileのbuildステージでは、依存関係のインストール、選択モードのデータ生成または取得、データ検証、Lint、整形確認、テスト、本番ビルドを実行します。runtimeステージにはNginxと`dist`だけを含めます。

## サンプルモードと実データモード

| モード   | 内容                                                                 | TMDBトークン |
| -------- | -------------------------------------------------------------------- | ------------ |
| `sample` | オフライン確認と決定的なテスト用のデモデータ。ローカルDockerの既定値 | 不要         |
| `real`   | 3館の公式上映予定をビルド時に取得。GitHub Pagesの公開モード          | 必要         |

ローカルで実データモードを使う場合は、Git管理対象外の`.env`を次のように編集します。

```dotenv
# .env
DATA_MODE=real
TMDB_API_READ_TOKEN=YOUR_TMDB_API_READ_ACCESS_TOKEN
```

その後、同じ起動コマンドを実行します。

```bash
docker compose up --build -d
docker compose ps
```

`.env`はGitの追跡対象およびDocker build contextから除外されています。ComposeはトークンをBuildKit secretとして実データ生成処理にだけ渡します。トークンはブラウザ、生成JSON、Dockerの実行用イメージ、Gitリポジトリには保存されません。

`real`モードは、3館すべての取得・解析・検証が成功しなければビルドを失敗させます。サンプルや部分データへ切り替えず、最後に検証されたデータを空データで置換しません。

## 技術構成

- Vite + TypeScript + HTML + CSS
- Vitest、ESLint、Prettier
- ビルド前に生成する静的JSON
- マルチステージDocker build + Nginx
- Docker Compose
- GitHub Actions + GitHub Pages

ブラウザ側にバックエンド、データベース、認証、外部API認証、取得処理はありません。公式上映予定の取得とTMDBポスター照合はビルド時だけに行い、Viteの`dist`をGitHub PagesとNginxの双方へ配信します。`base: "./"`と相対内部URLにより、GitHub Pagesのプロジェクトサイト配下でも動作します。

## GitHub Pagesと定期更新

`.github/workflows/deploy-pages.yml`は、`main`へのpush、手動実行、6時間ごとの定期実行で起動します。`DATA_MODE=real`で3館の取得、TMDBポスター照合、データ検証、Lint、整形確認、テスト、型チェック、本番ビルドを順に実行し、すべて成功した場合だけ`dist`をGitHub Pagesへデプロイします。失敗時はサンプルや部分データを公開せず、直前に成功したPagesを維持します。

GitHub Actionsでは、**Settings → Secrets and variables → Actions**にRepository Secret `TMDB_API_READ_TOKEN`を登録します。値はTMDBのAPI Read Access Tokenです。Pagesの公開元には**GitHub Actions**を指定してください。手動検証用の`.github/workflows/validate-real-data.yml`は成果物を確認できますが、Pagesへはデプロイしません。

## データ取得元と安全策

対象は次の公式情報だけです。

- [109シネマズ名古屋](https://109cinemas.net/nagoya/)
- [ミッドランドスクエアシネマ](https://ticket.midlandcinema.jp/schedule/ticket/0201/index.html)
- [イオンシネマ常滑](https://theater.aeoncinema.com/theaters/tokoname/)

公開されているHTMLまたはJSONから上映に必要な事実情報だけを取得し、ログイン、認証、Cookie、ブラウザ自動操作は使用しません。HTTPアクセスはHTTPSと用途別の公式ホストallowlistに限定し、リダイレクト先も検証します。タイムアウト、レスポンスサイズ、最大2同時接続を設定し、401・403・404・429はリトライしません。映画館サイトから画像、あらすじ、キャストは取得しません。

作品名はUnicode NFKC、空白・括弧の統一、確実に識別できる上映形式の分離、明示エイリアスによって正規化します。TMDBとの照合は候補タイトルの完全一致、管理された別名、公開年、必要な明示overrideに限定し、検索結果の先頭、人気度、曖昧一致だけでは採用しません。照合できた作品はTMDB IDと検証済み`image.tmdb.org`のポスターURLだけを生成JSONへ保存します。通常映画の取得率が70%未満なら公開ビルドを失敗させ、未一致作品には誤った画像ではなく作品名付きのローカルfallbackを表示します。

実データ画面にはTMDBの承認済みロゴ、TMDBへのリンク、次の帰属文を表示します。

> This product uses the TMDB API but is not endorsed or certified by TMDB.

イオンシネマの上映回には、安全に確認できる公式予約URLがないため推測せず、時刻を非リンクで表示します。

## 制限事項

- `sample`の上映、映画館、予約情報はデモ用で、実際の予約はできません。
- `real`も情報の正確性・完全性・継続取得を保証しません。サイト構造変更、未発表日、HTTPエラーによってビルドが失敗する場合があります。
- TMDBで保守的に一意と判断できない作品はポスター未一致になります。明示overrideと対象外指定は上映ラインアップの変化に合わせて人間がレビューしてください。
- TMDB由来データはTMDBの利用条件に従い、少なくとも6か月以内の定期更新を維持してください。商用利用へ変更する場合は別途ライセンス確認が必要です。
- 長期運用では、対象3サイトの利用条件、robots.txt、表示方針、許容されるアクセス頻度に変更がないかを人間が定期的に確認する必要があります。
- イオンシネマについては[サイトポリシー](https://www.aeoncinema.com/sitepolicy/)も確認してください。109シネマズとミッドランドスクエアシネマについても、公開利用を認める明示条件が見つからない場合は各運営者へ確認してください。
- GitHub Pagesのpush・手動・定期公開は実データモードです。取得を拒否する応答や構造変更が発生した場合は、回避せず公開更新を停止します。
- 座席状況、アプリ内決済、アカウント、お気に入り同期、位置情報には対応しません。
- JavaScriptを無効にした状態での完全動作には対応しません。

## ライセンス

[MIT License](LICENSE)

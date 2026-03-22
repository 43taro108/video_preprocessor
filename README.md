# Video Preprocessor

動画ファイルのアップロード・トリム・マスク・再生成を行うWebアプリケーション。

## 機能

- **アップロード** - mp4 / avi / mov 形式の動画をドラッグ＆ドロップでアップロード
- **トリム** - タイムライン上でドラッグして開始・終了位置を指定
- **マスク** - 矩形を描画して対象領域を指定（領域外は黒塗り）
- **FPSリサンプリング** - 高速カメラ動画（200fps等）を任意のFPSにダウンサンプリング
- **再生成** - トリム＋マスク適用済みのmp4をダウンロード

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Python FastAPI + Uvicorn |
| 動画処理 | OpenCV |
| スタイル | CSS (ダークテーマ) |

## セットアップ

### 前提条件

- Python 3.10+ (Conda環境 `phmr` を想定)
- Node.js 18+
- OpenCV (`opencv-python`)

### インストール

```bash
# setup.bat を実行（pip install + npm install を一括実行）
setup.bat
```

または手動で:

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## 起動

```bash
# バックエンド＋フロントエンドを同時起動
run.bat
```

個別に起動する場合:

```bash
start_backend.bat   # Backend  → http://localhost:8002
start_frontend.bat  # Frontend → http://localhost:5174
```

ブラウザで http://localhost:5174 を開く。

## 使い方

1. 動画ファイルをドラッグ＆ドロップ
2. Source FPS / Output FPS を設定
3. タイムラインのハンドルをドラッグしてトリム範囲を指定
4. 必要に応じて「Capture Frame for Mask」→ 矩形を描画してマスク領域を指定
5. 「Generate Video」をクリック
6. 処理完了後、プレビュー確認＋ダウンロード

## API エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/upload` | 動画アップロード |
| GET | `/api/video/info?file_id=` | メタデータ取得 |
| GET | `/api/video/thumbnail?file_id=&time_sec=` | フレーム画像取得 |
| POST | `/api/process` | トリム＋マスク処理 |
| GET | `/api/download/{job_id}` | 処理済み動画ダウンロード |
| GET | `/api/preview/{job_id}` | ブラウザプレビュー |

## ディレクトリ構成

```
video_preprocessor/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI アプリ
│   │   ├── config.py            # 設定
│   │   └── routers/
│   │       └── video.py         # APIエンドポイント + 動画処理
│   ├── run.py                   # サーバー起動
│   ├── requirements.txt
│   ├── uploads/                 # アップロード一時保存
│   └── outputs/                 # 処理結果出力
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # メインUI (Upload → Edit → Done)
│   │   ├── index.css            # ダークテーマCSS
│   │   ├── api/
│   │   │   └── client.ts        # APIクライアント
│   │   └── components/
│   │       ├── VideoTrimmer.tsx  # トリムUI
│   │       └── RegionMaskEditor.tsx  # マスク描画UI
│   ├── package.json
│   └── vite.config.ts
├── run.bat                      # 一括起動
├── setup.bat                    # 初回セットアップ
├── start_backend.bat            # バックエンド単体起動
└── start_frontend.bat           # フロントエンド単体起動
```

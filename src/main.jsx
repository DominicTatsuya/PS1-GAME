/**
 * main.jsx - React アプリケーションのエントリポイント
 *
 * ブラウザがこのファイルを最初に実行し、React アプリケーションを起動する。
 *
 * 処理の流れ:
 * 1. index.html の <div id="root"> を取得
 * 2. React の createRoot でルート要素を作成
 * 3. App コンポーネントをレンダリング（画面に描画）
 *
 * StrictMode:
 * 開発環境でのみ有効になるラッパーコンポーネント。
 * コンポーネントを2回レンダリングして潜在的なバグを検出する。
 * 本番ビルドでは無効化されるため、パフォーマンスへの影響はない。
 */

// React の StrictMode をインポート
import { StrictMode } from 'react'

// React 18 以降の新しいルートAPI。DOM要素にReactコンポーネントをマウントする
import { createRoot } from 'react-dom/client'

// グローバルスタイル（リセットCSS、共通フォント設定など）
import './styles/index.css'

// ゲームのメインコンポーネント
import App from './App.jsx'

// <div id="root"> を取得し、Reactアプリケーションをマウントする
// .render() に渡したJSXが実際にDOMに描画される
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

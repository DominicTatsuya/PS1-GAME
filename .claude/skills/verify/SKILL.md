---
name: verify
description: Run lint, vitest, and production build for the PS1-GAME repo. Use this skill after code changes — before committing — to catch ESLint / type / test / bundling regressions in one shot. Reports a per-step summary.
---

# /verify — lint + test + build を順に実行して結果を要約

PS1-GAME のコード変更を検証するときに、 個別に `npm run lint` / `npm run test` / `npm run build` を覚えて打つのではなく、 このスキルで一括検証します。 すべて pass したら commit へ進める判断ができ、 落ちたステップだけ詳しく報告します。

## 実行手順

次の 3 コマンドを順に実行します。 **fail しても止めず、 最後まで走らせて結果を集約**します（途中で止めると 1 個目しか分からないので）。

1. `npm run lint`
2. `npm run test`
3. `npm run build`

Bash tool で 1 つずつ実行してください。 各コマンドの exit code は `;` で繋ぐと最後のものしか取れないため、 **個別に Bash を呼び**、 各々の stdout / stderr / exit を観察します。

```bash
npm run lint
```

```bash
npm run test
```

```bash
npm run build
```

## 結果の報告フォーマット

すべて pass した場合:

```
✓ lint   (ESLint 警告ゼロ)
✓ test   (Vitest N/N passed)
✓ build  (dist/ サイズ XXX KB)

→ commit してよい状態です
```

どれかが fail した場合:

```
✗ lint   (3 件の警告)
✓ test   (21/21 passed)
✓ build  (OK)

→ lint の指摘:
  - src/path/file.jsx:LL  react-hooks/exhaustive-deps
  - ...

→ 修正案: ...
```

報告は**簡潔に**してください。 stdout を全部貼り付けない。 落ちたステップだけ要点を抽出します。

## 落ちた時の典型パターン

| 症状 | 原因 | 確認・対処 |
|------|------|------------|
| `EBADENGINE` 警告 | Node が 20.19+ 未満 | `node --version` を確認、 20.19 or 22.x に上げる |
| ESLint `react-hooks/exhaustive-deps` | useEffect / useCallback の依存配列に漏れ | 該当 hook を確認、 依存を追加するか useEffect を再設計 |
| Vitest `MapGenerator.test.js` 失敗 | 関数の signature 変更 or maze 構造の変更 | テストが規約を表現しているはず。 まず仕様を意図したものか確認 |
| Build で `Cannot resolve '...?raw'` | rolldown-vite が `?raw` を扱えていない | `src/shaders/applyPs1VertexSnap.js` の import 行をチェック |

## 注意

- このスキルは**変更を加えません**（read-only な検証のみ）。
- `npm audit` はこのスキルでは走らせません。 critical vuln の管理は別途、 `npm audit` を直接実行して判断します。
- ブラウザでの目視確認は別途必要。 `/verify` は静的検証のみ。

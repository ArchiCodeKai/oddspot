# 禁止操作清單

## Git 操作（執行前必須先確認）

- 任何 git 操作（`add` / `commit` / `push` / `pull` / `merge` / `checkout` / `branch` / `reset` / `rebase` / `stash` / `tag` 等）執行前，**必須先說明打算做什麼、影響範圍，並等使用者明確確認後才可執行**
- 確認的形式：列出打算執行的指令、影響範圍（檔案 / 分支 / 是否動到 remote），等使用者回覆「確認」「OK」「可以」之類的明確同意
- 一次確認只授權當下這一組操作，下次要再 git 操作時必須重新確認
- 高風險操作（`push --force` / `reset --hard` / `branch -D` / `clean -fd`）即使已同意也要再次確認一次

## 絕對禁止（會造成不可逆影響）

### 伺服器操作
- `npm run dev`（port 限制）
- 任何啟動後台伺服器的指令

### 套件管理
- 未經確認禁止安裝新套件
- 禁止修改 `package.json` 的版本號

### 全域設定檔（不可修改）
- `src/app/globals.css`
- `tsconfig.json`
- `next.config.ts`（除非明確要求）
- `eslint.config.mjs`

## 謹慎操作（需先告知使用者）

### 共用基礎元件
- `src/components/ui/` 下的任何元件

### 型別定義
- `src/types/` 下的型別定義（修改可能影響多個元件）

### Prisma Schema
- `prisma/schema.prisma`（修改後需跑 migrate）

### 常數定義
- `src/lib/constants/` 下的任何常數（修改影響全局）

## 提交前必做

```bash
npm run build
# 必須零錯誤才能列出修改清單給使用者
```

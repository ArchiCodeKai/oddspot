# 禁止操作清單

## 絕對禁止（會造成不可逆影響）

### Git 操作
- `git add` / `git commit` / `git push`
- `git reset` / `git checkout` / `git merge`
- 所有 git 操作都必須由使用者手動執行

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

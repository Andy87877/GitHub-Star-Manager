# GitHub-Star-Manager 任務追蹤清單 (Task Checklist)

## Phase 1: 活文件建立與系統規劃
- [x] 初步架構規劃與需求分析
- [x] 建立 `task.md` (任務追蹤表)
- [x] 建立 `architecture.md` (系統架構、OOP/SOLID 與 MVC 規格書)
- [x] 建立 `iterate.md` (迭代與決策紀錄)

## Phase 2: Python 後端 ETL 同步引擎 (OOP / SOLID / MVC)
- [x] 實作領域模型 (`app/models/repository.py`)
- [x] 實作 GitHub API Client 介面 (`app/services/github_client.py`)，遵循 DIP 與策略模式
- [x] 實作分類策略 (`app/services/categorizers.py`)，遵循策略模式與 OCP/LSP
- [x] 實作 Markdown 與 JSON 渲染器 (`app/services/renderers.py`)
- [x] 實作同步調度控制器 (`app/controllers/sync_controller.py`)
- [x] 實作 CLI 命令列入口 (`main.py`)

## Phase 3: Web 應用前端 UI/UX (MVC & 人性化操作介面)
- [x] 建立語意化 HTML5 結構 (`index.html`)
- [x] 建立現代 CSS 設計系統 (`css/style.css`)，支援 Glassmorphism 擬態與亮/深色主題
- [x] 實作前端模型層 (`js/models/StarModel.js`)，支援 `localStorage` 筆記持久化
- [x] 實作前端視圖層 (`js/views/StarView.js`)，負責 DOM 動態渲染與互動動畫
- [x] 實作前端控制器層 (`js/controllers/StarController.js`) 與入口點 (`js/app.js`)
- [x] 產生資料集 (`data/stars.json`)

## Phase 4: Robot Framework 自動化測試套件
- [x] 建立分類邏輯測試 (`tests/test_categorization.robot`)
- [x] 建立渲染器測試 (`tests/test_renderers.robot`)
- [x] 建立 CLI 同步與工作流測試 (`tests/test_cli_sync.robot`)

## Phase 5 & 6: Andy87877 即時 Stars 同步與 GitHub Actions 自動化
- [x] 在 `app/services/github_client.py` 實作 `GitHubRESTClient` 與 `GitHubClientFactory`
- [x] 預設同步目標為 `Andy87877`
- [x] 建立 `.github/workflows/schedules.yml` 實現每 6 小時及手動更新
- [x] 成功同步 `Andy87877` 的真實 Star 專案至 `README.md`、`topics.md` 與 `data/stars.json`

## Phase 7: Git 版控與 .gitignore 規則設定
- [x] 設定 `.gitignore` 排除 `log.html`、`output.xml`、`report.html`、`__pycache__` 等暫存檔

## Phase 8: 預設繁體中文 UI 與預設亮色模式 (Light Mode) 調整
- [x] 調整 `index.html` 預設為 `<html lang="zh-TW" data-theme="light">`
- [x] 介面文字（搜尋框、統計面板、按鈕、彈窗、Toast 通知）全面繁體中文化
- [x] 調整 `style.css` 以亮色主題為預設基底
- [x] 調整 `renderers.py` 產出繁體中文標題之 `README.md` 與 `topics.md`
- [x] 通過全部 9 項 Robot Framework 自動化測試
- [x] 更新完整活文件 (`task.md`, `architecture.md`, `iterate.md`, `README.md`)

## Phase 9：資料可信度與發布安全

- [x] 找出 Robot Mock 覆寫正式 Stars 的根因
- [x] 將測試輸出隔離至 `artifacts/test-generated/`
- [x] REST API 保留 `starred_at` 並驗證 Star media type
- [x] API／分頁失敗時禁止發布部分資料
- [x] 零筆資料預設禁止覆寫既有快照
- [x] 使用原子檔案發布器與輸出路徑邊界
- [x] 產生 `data/sync-meta.json` 來源與時間證據
- [x] 增加 Robot 資料契約與發布安全測試

## Phase 10：前端即時資料與可用性

- [x] 載入本機快照後，以 GitHub 公開 API 即時刷新
- [x] 顯示資料來源、筆數、同步時間與降級狀態
- [x] 新增清除篩選與結果數回饋
- [x] 完成 Modal 焦點、Escape、背景點擊與 ARIA 行為
- [x] 儲存並還原使用者主題
- [x] 支援 `prefers-reduced-motion` 與窄螢幕
- [x] 以瀏覽器驗證桌面／手機版互動

## Phase 11：交付與根目錄整理

- [x] 更新 workflow 為先測試、後同步、只提交真實快照
- [x] 同步當下 `Andy87877` 全部公開 Stars（151 筆）
- [x] 完整更新 `README.md`、`architecture.md`、`iterate.md`、`task.md`
- [x] Robot Framework 全數通過（14／14）
- [x] 根目錄移除舊 Robot 報告並統一放入 `artifacts/`
- [x] 檢查 Git 狀態（不 commit、不 push）

## Phase 12：Topic 聚焦資訊架構

- [x] 分析 Topic 分布（469 個、401 個只出現一次）
- [x] 新增 `ITopicSelectionPolicy` 抽象
- [x] 新增 `FocusedTopicPolicy`（最少 2 個 repositories、最多 30 類）
- [x] `topics.md` 依涵蓋數排序並說明聚焦規則
- [x] JSON 與全文搜尋保留全部原始 Topics
- [x] 網站 Topic 下拉與捷徑套用相同聚焦原則
- [x] 新增 Robot Framework Topic 政策測試

## Phase 13：Cards／Table 雙模式

- [x] `StarModel` 管理並持久化顯示模式
- [x] `StarView` 新增可存取的 repository Table
- [x] `StarController` 協調 Cards／Table 切換
- [x] Table 支援目前搜尋、語言、Topic、Archived 與排序結果
- [x] Table 保留筆記編輯操作
- [x] 手機版 Table 使用水平捲動容器
- [x] 新增 Robot Framework Web 契約測試
- [x] 瀏覽器驗證 Cards／Table、狀態保留與手機版
- [x] 修正手機版 Topic Grid 全頁水平溢位
- [x] 重產真實 README／topics／JSON／metadata（151 筆）
- [x] 最終 Robot Framework 回歸（16／16）
- [x] 根目錄與 Git 狀態確認（不 commit、不 push）

## Phase 14：Topic `other` 與 CI/CD 修復

- [x] 檢視 GitHub 遠端 workflows、run、job 與失敗 log
- [x] 確認舊 Pages workflow 失敗根因為 repository 當時尚未啟用 Pages
- [x] 再次稽核並確認 GitHub 預設 Pages workflow 已連續成功 2 次
- [x] 確認 Pages 網址與 HTTPS 狀態
- [x] 移除 Ruby／Bundler／Jekyll 依賴，改為純靜態 Pages artifact
- [x] 將誤導性的 Jekyll workflow 檔名整理為 `ci-pages.yml`
- [x] CI 在 push／pull request／手動觸發時先跑 Robot 與快照契約
- [x] CD 僅在 `verify` 成功且非 pull request 時執行
- [x] 保留每 6 小時 Stars 同步 workflow 的測試先行與失敗關閉
- [x] `FocusedTopicPolicy` 將未命中聚焦 Topic 的 repositories 收入最底下 `other`
- [x] `other` 依 repository `full_name` 去重
- [x] 網站 Topic chips／下拉／篩選支援固定在最後的「其他 / other」
- [x] 重產真實 README／topics／JSON／metadata（152 筆；`other` 91 筆）
- [x] Workflow YAML 解析成功
- [x] Robot Framework 全數通過（18／18）
- [x] 真實瀏覽器驗證 `other`、Cards／Table、390px 響應式與 console
- [x] 根目錄測試產物集中於 `artifacts/`（不 commit、不 push）
- [ ] 使用者 commit／push 後確認新 CI/CD run 與 Pages URL

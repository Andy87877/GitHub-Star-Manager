# GitHub-Star-Manager 迭代與決策紀錄 (Iteration Log)

## Iteration 1: 需求分析與系統設計
- **日期**: 2026-07-29
- **目標**: 詳細檢視 `README.md` 並設計企業級 GitHub Star 管理系統。
- **關鍵分析與發現**:
  - `goodjack/stars` 依賴 `starred` 套件透過 GitHub Actions 定期產生 `README.md` 與 `topics.md`。
  - `goodjack/stars` 的局限性：缺少搜尋 UI、無法記錄個人研究筆記、單一主要語言分類受限、Topic 冗餘度高、無視覺化探索介面。
- **架構決策**:
  - 打造 **GitHub-Star-Manager**（方案 C）：Python ETL 後端 + 人性化 Web 應用前端 + Robot Framework 自動化測試套件。
  - 採納 **OOP, SOLID 與 MVC** 架構設計原則。

---

## Iteration 2: 核心架構與活文件建立
- **日期**: 2026-07-29
- **目標**: 建立活文件體系 (`task.md`, `architecture.md`, `iterate.md`) 並定義 Python 後端介面。

---

## Iteration 3: 後端 ETL 引擎與 Mock 數據建置
- **日期**: 2026-07-29
- **目標**: 實作 Python 領域模型、GitHub Client、分類策略、渲染器與 CLI 入口。
- **關鍵行動**:
  - 實作 `Repository` 領域實體。
  - 實作 `IGitHubClient` 介面、`GitHubGraphQLClient` 與 `MockGitHubClient`。
  - 實作 `LanguageCategorizer` 與 `TopicCategorizer` 策略類別。
  - 解決 Windows 主機 CP950 Unicode 控制台輸出字元問題。

---

## Iteration 4: 人性化 Web 應用前端開發
- **日期**: 2026-07-29
- **目標**: 實作前端 MVC 結構 (`StarModel`, `StarView`, `StarController`) 與 Glassmorphism 設計系統。
- **關鍵行動**:
  - 設計 `css/style.css` 主題變數與視覺元件。
  - 實作即時全文搜尋、標籤篩選、`localStorage` 筆記持久化、隨機推薦與 CSV 匯出功能。

---

## Iteration 5: Robot Framework 自動化測試套件
- **日期**: 2026-07-29
- **目標**: 撰寫 `.robot` 測試檔案驗證分類、渲染器與 CLI 指令。
- **關鍵行動**:
  - 建立 `tests/test_categorization.robot` 與 `tests/test_renderers.robot`。
  - 建立 `tests/test_helper.py` 處理 `sys.path` 導入問題。
  - 測試完全通過。

---

## Iteration 6: Andy87877 Live Star 同步與每日 GitHub Actions 自動化
- **日期**: 2026-07-29
- **目標**: 同步 `Andy87877` (`https://github.com/Andy87877?tab=stars`) 的真實 Star 資料，並新增 GitHub Actions 每日自動化 Workflow。
- **關鍵行動**:
  - 實作 `GitHubRESTClient` 與 `GitHubClientFactory`。
  - 建立 `.github/workflows/schedules.yml` (Cron 00:30 UTC / 08:30 TST)。
  - 成功抓取 `Andy87877` 的 151 個真實 Star 專案。

---

## Iteration 7: Git 版控與 .gitignore 規則設定
- **日期**: 2026-07-29
- **目標**: 設定 `.gitignore` 排除測試報告 (`log.html`, `output.xml`, `report.html`)、Python 快取與暫存檔。

---

## Iteration 8: 預設繁體中文 UI 與亮色主題 (Light Theme) 調整
- **日期**: 2026-07-29
- **目標**: 調整 Web UI 與產出 Markdown 為預設繁體中文介面，並將預設主題設定為亮色模式 (Light Theme)。
- **關鍵行動**:
  - 調整 `index.html` 預設標籤為 `<html lang="zh-TW" data-theme="light">`。
  - 全面將 UI 文字、搜尋框 Placeholder、按鈕、Modal、Toast 提示替換為繁體中文。
  - 調整 `style.css` 的 `:root` 主題變數為亮色基底。
  - 調整 `renderers.py` 產出繁體中文標題之 `README.md` 與 `topics.md`。
  - 重新執行 ETL 引擎，將 `Andy87877` 的 151 個真實專案以中文標題同步寫入 `README.md` 與 `topics.md`。
  - 更新測試套件斷言，全部 9 項 Robot Framework 測試持續 100% 通過。

---

## Iteration 9：資料真實性與發布安全修正

- **日期**：2026-07-29
- **觸發原因**：檢查發現 workflow 先產生真實資料，再由 Mock Robot 測試於根目錄覆寫成 3 筆假資料，最後把假資料提交。
- **已完成**：
  - Mock CLI 測試改寫至 `artifacts/test-generated/`，並驗證根目錄 README 前後內容一致。
  - REST Client 改用 GitHub Star media type，保留 `starred_at`。
  - REST／GraphQL 任一頁失敗時拋出錯誤，不再發布部分資料。
  - 新增零筆資料防護與 `AtomicFilePublisher`；同步失敗保留上一份有效快照。
  - 新增 `data/sync-meta.json`，記錄來源、筆數、時間與是否為真實快照。
  - Robot 測試新增 REST 契約、空資料保護、workflow 執行順序與 Web 可用性契約。
- **設計決策**：
  - 「即時」不得只靠畫面文案宣稱，必須同時提供資料來源與時間。
  - 測試資料和正式發布資料使用不同輸出邊界。
  - 全部分頁完成才算同步成功；部分成功視同失敗。

## Iteration 10：前端即時來源與人性化操作

- **日期**：2026-07-29
- **狀態**：程式完成，待瀏覽器驗證
- **目標**：
  - 頁面載入時先顯示版本庫快照，再嘗試 GitHub 公開 API 即時更新。
  - 清楚呈現「GitHub 即時資料／版本庫快照／無資料」狀態。
  - 補齊清除篩選、Modal 鍵盤操作、焦點樣式、Reduced Motion 與手機版操作。
- **完成內容**：
  - `StarModel` 先載入快照，再用 GitHub Star media type 分頁刷新。
  - 狀態列區分 GitHub 即時資料、版本庫快照與載入失敗。
  - 新增完整 Topic 下拉、Archived 篩選、清除篩選與結果數。
  - 移除失敗時顯示 3 筆 Mock 的行為；沒有可信資料就顯示真實錯誤狀態。
  - Modal 加入 ARIA、焦點管理、Escape、背景關閉與快捷儲存。
  - 主題選擇持久化；外部 URL 限 HTTPS；動態文字 escape。

## Iteration 11：真實快照重建與排程修正

- **日期**：2026-07-29
- **完成內容**：
  - 以 GitHub REST API 重新同步 151 個公開 Stars。
  - README、Topic 索引、JSON 與 metadata 由同一次資料產生。
  - Workflow 改為每 6 小時及手動執行，先跑 Robot、後同步真實資料。
  - Actions 更新為 `checkout@v6`、`setup-python@v6`，Python 固定 3.12。
- **驗證結果**：
  - Robot Framework 14／14 通過。
  - 瀏覽器直接取得 151 筆；預設排除 10 個 Archived，顯示 141 筆。
  - 搜尋 `robotframework/robotframework` 得 1 筆；Python 得 34 筆；再加 Topic `robotframework` 得 1 筆。
  - 筆記 Modal 的焦點、快捷儲存與刪除正確；深／淺主題可切換並還原。
  - 390px 視窗無水平溢位，卡片為單欄，導覽列改為非 sticky。
  - 瀏覽器 console 無 error／warning。

## Iteration 12：交付整理

- **日期**：2026-07-29
- **完成內容**：
  - 根目錄舊 `output.xml`、`log.html`、`report.html` 改由 `artifacts/robot/` 統一管理。
  - `.gitignore` 排除整個 `artifacts/`。
  - 不執行 commit、不執行 push；保留使用者既有未提交內容。

## Iteration 13：Topic 聚焦與 Table 顯示

- **日期**：2026-07-29
- **使用者回饋**：
  - Topic 目錄分類太細，很難抓到收藏重點。
  - 網站只有 Cards，缺少適合快速掃描比較的 Table。
- **資料分析**：
  - 151 個 repositories 共包含 469 個不同 Topics。
  - 401 個 Topics 只出現一次，只有 68 個重複出現。
- **架構決策**：
  - 新增 `ITopicSelectionPolicy` 與 `FocusedTopicPolicy`，將導航政策和分類邏輯分離。
  - 聚焦目錄只保留至少出現 2 次的前 30 個 Topics；原始資料不刪除。
  - `StarModel` 管理 Cards／Table 顯示狀態並持久化。
  - `StarView` 分別提供 `renderRepoCards`、`renderRepoTable`。
  - `StarController` 只處理顯示模式意圖與重繪協調。
- **UI／UX 決策**：
  - Cards 用於探索；Table 用於密集比較。
  - 切換顯示方式時保留搜尋、篩選、排序與筆記。
  - 手機版 Table 放入水平捲動容器，不擠壓欄位造成不可讀。
- **驗證結果**：
  - Robot Framework 16／16 通過。
  - Table 預設顯示 141 個未封存專案，欄位與筆記操作正常。
  - 在 Table 搜尋至 1 筆後切回 Cards，搜尋條件與結果保持 1 筆。
  - 重新載入頁面後仍記得 Table 偏好。
  - 初次手機版 QA 發現 Topic Grid 將頁面撐到 2106px；修正 Grid 最小寬度後，頁面寬度回到 375px。
  - 390px 下只有 Table 容器內部可水平捲動；整個頁面沒有水平溢位。
  - 瀏覽器 console 無 error／warning。
- **狀態**：完成。

## Iteration 14：Topic `other` 與 CI/CD 修復

- **日期**：2026-07-29
- **使用者回饋**：
  - 聚焦 Topic 後仍需要最底下的 `other`，收納未被聚焦分類涵蓋的 repositories。
  - GitHub CI/CD 沒有成功，需要先檢視遠端執行證據再修正。
- **GitHub 遠端稽核**：
  - Repository 為 private、預設分支為 `main`，帳號方案支援 private Pages。
  - 初次稽核時遠端存在 2 個 active workflows，舊 Pages run 皆失敗。
  - 最新 run `30425106507` 在 `Setup Pages` 失敗；log 明確指出 Pages 尚未啟用／未設為 GitHub Actions。
  - 舊 workflow 使用 Ruby 3.1 與 `bundle exec jekyll`，但專案沒有 Gemfile；即使先解決 Pages 設定仍會在下一階段失敗。
  - Stars 排程 workflow 尚無 run；它在 05:27 UTC 加入，而 cron 為 `17 */6 * * *`，稽核時尚未到第一個排程點。
  - 工作期間遠端新增 GitHub 預設的 `jekyll-gh-pages.yml` 並刪除舊 `jekyll.yml`；新 workflow run `30430004336` 與 `30430057828` 均成功。
  - GitHub Pages 已啟用，網址為 `https://andy87877.github.io/GitHub-Star-Manager/`，HTTPS enforced。
- **Topic 設計決策**：
  - `FocusedTopicPolicy` 保留前 30 個聚焦 Topics，並固定把 `other` 放在最後。
  - `other` 只收納沒有命中任何聚焦 Topic 的 repositories，以 `full_name` 去重。
  - 網站 Model 使用相同判斷；Topic chips 與下拉將 `other` 固定放在最後並採「其他 / other」易懂標籤。
- **CI/CD 設計決策**：
  - 將遠端已成功的 `jekyll-gh-pages.yml` 整理為語意明確的 `ci-pages.yml`，並整合純靜態 CI/CD，避免平行存在兩套 Pages workflows。
  - `verify` job 使用 Python 3.12，先跑 Robot 與快照契約。
  - `deploy` job 只在非 pull request 且 `verify` 成功後執行，只打包網站必要檔案並加入 `.nojekyll`。
  - `schedules.yml` 保持單一責任：每 6 小時／手動先測試，再同步、驗證、提交真實快照。
  - 遵照使用者「不 push」，本次不 rerun、不 push；只將本地分支 fast-forward 到遠端刪除舊 workflow 的 commit，再保留未提交修改。
- **真實資料結果**：
  - 本次重新同步 152 個公開 Stars。
  - 原始 Topics 469 個，聚焦 Topics 30 個，最終快照的 `other` 為 91 個 repositories。
- **驗證結果**：
  - Workflow YAML 可解析。
  - Robot Framework 18／18 通過。
  - 真實瀏覽器確認 `other` 固定為最後一個下拉選項與快速 chip。
  - 瀏覽器即時 API 當下取得 151 筆、`other` 92 筆；預設排除 Archived 後 Cards 顯示 88 筆，切換 Table 仍維持 88 筆。
  - 瀏覽器即時資料（151／`other` 92）與 07:09 UTC 版本庫快照（152／`other` 91）短時間內有差異；介面分別標示來源，不宣稱兩者必然同筆數。
  - 390px 驗證沒有整頁水平溢位，Table 僅在自己的容器內水平捲動；console 0 error／warning。
- **狀態**：目前遠端 Pages 已可用；本地加入 Robot／純靜態 artifact 的新版 workflow 必須在使用者日後 commit／push 後驗證。

## Iteration 15：Table 作為主要預設模式

- **日期**：2026-07-31
- **使用者回饋**：網站第一次開啟應先顯示 Table，Cards 為次要模式。
- **設計決策**：
  - 工具列順序改為 Table 在前、Cards 在後，視覺優先順序和預設行為一致。
  - `StarModel.readViewMode()` 在沒有合法既有偏好時回傳 `table`。
  - 已明確選過 `cards` 或 `table` 的使用者仍保留原選擇，避免每次載入強迫重設。
  - 初始 HTML 直接將 Table 標為 active／`aria-pressed=true`，避免 JavaScript 啟動前短暫顯示錯誤狀態。
  - 預設與偏好屬於 Model；View 僅渲染，Controller 僅協調，維持 MVC 與 SRP。
- **文件與資料同步**：
  - README 由 renderer 同步標示 Table（預設）／Cards。
  - 排程說明校正為每日 03:00（Asia/Taipei）與手動觸發。
  - 重新同步 152 個 Stars、482 個原始 Topics、30 個聚焦 Topics，`other` 92 筆。
- **驗證結果**：
  - Robot Framework 19／19 通過。
  - 全新 localhost origin 第一次載入即顯示 Table，Table 按鈕排列第一且 `aria-pressed=true`，顯示 142／152 個未封存專案。
  - 切換 Cards 後顯示相同 142 筆；重新整理仍保留 Cards，證明明確偏好優先於預設值。
  - 切回 Table 並以 390px 驗證：整頁寬度沒有溢位，Table 僅在自己的容器內水平捲動。
  - 瀏覽器 console 0 error／warning。
- **狀態**：完成。

## Iteration 16：母資料夾整理與文件集中

- **日期**：2026-08-01
- **使用者回饋**：
  - 母資料夾只保留 `README.md`、`topic.md`、`main.py` 三個可見檔案。
  - 其餘 Markdown 統一放入 `docs/`，並新增 `AGENT.md`。
  - README 要特別感謝 [goodjack/stars](https://github.com/goodjack/stars) 提供專案寫法靈感。
- **架構決策**：
  - 文件集中於 `docs/`；`README.md` 與產生式 `topic.md` 是根目錄的明確例外。
  - 網站 source 與 publish boundary 集中於 `web/`，包含 HTML、CSS、JavaScript 與可發布資料。
  - Python 應用維持 `app/` 的 OOP／SOLID／MVC 結構；依賴清單移至 `config/`。
  - `main.py --serve` 只服務 `web/`；`SyncController` 只發布至根目錄 README／Topic 與 `web/data/`。
  - Pages workflow 直接封裝 `web/`，避免把 Python、文件與測試公開進網站 artifact。
  - 新增 Robot 根目錄不變量，防止後續功能再次把散落檔案放回母資料夾。
- **活文件決策**：
  - `docs/AGENT.md` 記錄目錄、MVC 責任、產物、文件同步、驗證與不 push 規則。
  - README renderer 永久保留對 `goodjack/stars` 的致謝，避免下一次資料同步覆寫掉手動文案。
- **資料結果**：
  - 重新同步 153 個 Stars、486 個原始 Topics、30 個聚焦 Topics，`other` 92 筆。
  - `README.md`、`topic.md`、`web/data/stars.json` 與 `web/data/sync-meta.json` 由同一次成功同步原子發布。
- **驗證結果**：
  - Robot Framework 20／20 通過，包含根目錄三個可見檔案與重構後網站路徑契約。
  - 真實瀏覽器首次顯示 Table，共 143／153 個未封存專案；Cards 顯示相同 143 筆且重新整理保留 Cards 偏好。
  - 切回 Table 後，390px 下整頁無水平溢位，Table 容器本身可水平捲動。
  - 瀏覽器 console 無 error／warning。
  - 已移除舊 `css/`、`data/`、`js/` 空目錄；本次未 commit、未 push。
- **狀態**：完成。

## Iteration 17：系統進階統計分析、最愛標註、分頁導覽與 CLI 擴充

- **日期**：2026-08-06
- **目標**：
  - 符合高標準 MVC / OOP / SOLID 架構，大幅提升 UI/UX 視覺體驗與數據可視化。
  - 新增後端 `AnalyticsCalculator` 數據計算服務與 CLI `--analytics` / `--export csv|json` 選項。
  - 前端新增互動式「📊 數據分析 Dashboard Modal」、最愛 ⭐ 標註與持久化、動態分頁與每頁筆數控制。
  - 擴充 Robot Framework 測試套件至 25 項測試並全數通過。
- **關鍵架構與設計決策**：
  - **SRP / DIP**: 建立 `AnalyticsCalculator` (`app/services/analytics.py`)，將數據分析計算邏輯從 `SyncController` 解耦，獨立進行單元測試與 CLI 輸出。
  - **CLI 擴充**: `main.py` 新增 `--analytics` (控制台數據摘要) 與 `--export {csv,json}` (資料集匯出)，支援命令列自動化管道。
  - **UI/UX 數據分析 Dashboard**: 網站導覽列新增「📊 數據分析」按鈕，觸發高質感 Glassmorphic Modal，以進度條與視圖標籤展現語言分佈 (Top 10)、熱門 Topics (Top 15) 與 Star 年度趨勢。
  - **最愛標註 (Favorites)**: 在 Cards / Table View 專案頭部新增一鍵標註最愛 ⭐ (`toggle-fav-btn`)，並儲存於 `localStorage` (`gsm_repo_favorites`)。篩選下拉選單支援「⭐ 僅限最愛」與「📝 僅有筆記」。
  - **動態分頁 (Pagination)**: 在專案清單底部新增分頁列，支援切換每頁 20 / 50 / 100 / 全部筆數，並自動計算目前頁碼與總頁數。
- **測試與驗證結果**：
  - Robot Framework 擴充 5 項全新測試（包含 CLI analytics, CSV 匯出, Web Analytics Modal, Favorites, Pagination），總計 25 / 25 項測試 100% 通過。
  - 重新同步 `Andy87877` 的 152 筆公開 Stars 專案至靜態快照。
  - 根目錄維持嚴格三檔案規範 (`README.md`, `topic.md`, `main.py`)，測試產物隔離於 `artifacts/robot-reports/`。
- **狀態**：完成。

## Iteration 18：資料庫快照修復、複製 URL 快捷鍵、回到頂部與資料完整性測試

- **日期**：2026-08-06
- **問題診斷與修復**：
  - 檢視並診斷 `web/data/sync-meta.json` 含有 Git conflict markers (`<<<<<<< HEAD`) 導致 `JSONDecodeError` 錯誤。
  - 重新執行 `main.py --username Andy87877` 進行純淨資料擷取，成功修復 `web/data/sync-meta.json`、`web/data/stars.json` 與 `topic.md`。
- **UI/UX 升級**：
  - 在 Table 與 Cards 的專案卡片標頭新增 `📋` 複製 URL 操作按鈕，支援系統剪貼簿寫入與 Toast 提示。
  - 頁面右下角新增浮動 `⬆ 回到頁面頂部` 按鈕，於滾動 >300px 時自動顯現，點擊提供平滑滾動 (smooth scroll)。
- **自動化測試擴充**：
  - 新增 Robot Framework `Dataset Snapshot Integrity Contract` 測試，驗證全專案資料快照 JSON 解析合法性、無衝突標記、筆數匹配與屬性正確性。
  - Robot Framework 測試總數提升至 26 項，全數 26 / 26 通過。
- **狀態**：完成。

## Iteration 19：數據異動增減追蹤 (Delta Tracking)、README 視覺化圖表與 GitHub Actions 豐富 Commit 資訊

- **日期**：2026-08-20
- **使用者回饋**：
  - GitHub Actions Bot 的 commit 訊息 `data: refresh Andy87877 GitHub Stars` 太單調，缺乏更新時間、總量與增減數量細節。
  - `README.md` 可以更加視覺化 (新增圖表與長條圖)。
- **架構與設計決策**：
  - **增減追蹤 (Delta Tracking)**：`SyncController` 在寫入新快照前，自動讀取現有 `web/data/sync-meta.json`，計算與記錄 `previousRepositoryCount`、`deltaCount` (例如 `3`)、`formattedDelta` (例如 `+3`) 與在地化 Taipei 時間 `formattedUpdatedAt` (例如 `2026-08-20 20:05:04 (UTC+8)`)。
  - **README 視覺化引擎**：升級 `MarkdownLanguageRenderer` (`app/services/renderers.py`)，內嵌 Mermaid Pie Charts (程式語言 Top 10 與熱門 Topic Top 10)、Shields.io 統計 Badges (Total Stars, Delta, Updated Date) 與 Unicode 長條圖進度條表格。
  - **GitHub Actions 豐富 Commit Logs**：更新 `.github/workflows/schedules.yml` 的 Commit 步驟，透過 Python 腳本動態讀取 `sync-meta.json` 產出富含意義的 Commit 標題 (如 `data: refresh Andy87877 GitHub Stars (155 stars, delta: +3 | 2026-08-20 20:05:04)`) 與包含詳細數據的 Commit Body。
  - **Web UI Data Status 升級**：`StarModel` 與 `StarView` 動態解析與渲染異動提示（例如 `(較前次 +3) ｜ 更新時間：2026-08-20 20:05:04 (UTC+8)`）。
- **驗證結果**：
  - 重新同步 `Andy87877` 155 筆真實 Star 快照，成功計算並寫入 `formattedDelta` (`+3`) 與 `formattedUpdatedAt`。
  - `README.md` 成功生成豐富的 Mermaid Pie Charts、Shields.io Badges 與長條圖。
  - Robot Framework 測試套件擴充至 27 項，27 / 27 項測試 100% 全部 PASS 通過。
- **狀態**：完成。

## Iteration 20：README.md 重構為 Focus Topic 聚焦總覽與獨立 `language.md` 程式語言分類檔

- **日期**：2026-08-21
- **使用者回饋**：
  - `README.md` 應該顯示 Focus Topic 的資料，並包含完整的數據視覺化圖表。
  - 原先依程式語言分類的資料應獨立寫到一個專屬的 Markdown 檔案 (`language.md`)。
- **架構與設計決策**：
  - **Renderer 重構**: 調整 `MarkdownTopicRenderer` 為 `README.md` 主要渲染引擎，包含完整的 Topic 聚焦分類、`other` 兜底區塊、Mermaid 圓餅圖與長條圖進度條；調整 `MarkdownLanguageRenderer` 渲染獨立的 `language.md` 語言分類檔案。
  - **SyncController 擴充**: 同步發布 `README.md` 與 `language.md`，並在發布時自動清理歷史殘留之舊 `topic.md` 檔案，確保根目錄可見檔案不符合項。
  - **根目錄不變量更新**: 根目錄可見檔案維持三檔案規範 (`README.md`, `language.md`, `main.py`)。
- **驗證結果**：
  - 重新同步 `Andy87877` 156 筆真實 Star 快照，`README.md` 正確呈現 Focus Topic 與數據視覺化圖表，`language.md` 正確呈現程式語言分類。
  - Robot Framework 全套 27 項測試全數 PASS 100% 通過。
- **狀態**：完成。





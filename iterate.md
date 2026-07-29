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

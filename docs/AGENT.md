# GitHub-Star-Manager 協作規範

更新日期：2026-08-21

## 1. 根目錄不變量

根目錄的可見檔案只能有：

- `LICENSE`
- `README.md`
- `language.md`
- `main.py`

隱藏的 `.gitignore`、`.github/` 與必要的程式目錄不受此三檔限制。新增文件必須放入 `docs/`；網站檔案放入 `web/`；依賴與工具設定放入 `config/`。

## 2. 架構責任

- Python Model：`app/models/`，只封裝領域資料。
- Python Controller：`app/controllers/`，協調抓取、分類、數據分析、異動追蹤、視覺化渲染與原子發布。
- Python Services：`app/services/`，透過小型介面與策略實作 GitHub Client、分類、`AnalyticsCalculator`、Renderer、Publisher。
- Web Model／View／Controller：分別位於 `web/js/models/`、`web/js/views/`、`web/js/controllers/`。
- `main.py` 只負責 CLI 組裝 (支援 `--analytics`, `--export`) 與服務 `web/`，不得承擔分類或 DOM 邏輯。

修改時遵守 OOP、SOLID、MVC；不要把 API、DOM、儲存與領域規則混進同一個類別。

## 3. 產物與來源

執行 `python main.py --username Andy87877` 會產生：

- `README.md`
- `language.md`
- `web/data/stars.json`
- `web/data/sync-meta.json`

同步失敗、分頁不完整或零筆資料時不得覆寫上一份有效產物。Robot 的 Mock 輸出只能寫入 `artifacts/test-generated/`，測試報告統一儲存於 `artifacts/robot-reports/`。

## 4. 文件同步

每次功能或路徑變更都要同步更新：

- `README.md`
- `docs/architecture.md`
- `docs/iterate.md`
- `docs/task.md`
- 本檔 `docs/AGENT.md`（若協作規則或路徑有變）

README 必須保留對 [goodjack/stars](https://github.com/goodjack/stars) 的特別感謝。

## 5. 驗證指令

```powershell
python -m pip install -r config/requirements.txt
python -m robot --outputdir artifacts/robot-reports tests
python main.py --analytics
python main.py --serve
```

交付前至少確認：

- Robot Framework 全數 31 項測試通過。
- `web/index.html` 可載入快照與即時 GitHub 資料，頁尾載有 Andy87877 CC0-1.0 視覺化徽章與授權宣告，且數據分析 Dashboard Modal、⌨️ 鍵盤快捷鍵 Modal、目前篩選條件標籤列與點擊標頭排序功能正常。
- Table 為新使用者預設，Cards 明確偏好可還原。
- 390px 下整頁不水平溢位，Table 僅在自身容器內捲動。
- 根目錄沒有散落測試報告或額外可見檔案（僅有 LICENSE, README.md, language.md, main.py）。
- 未經使用者要求，不執行 `git push`。

# 先講結論

`goodjack/stars` 不是一套完整網站，也不是自己從零開發的 GitHub 爬蟲。

它本質上是：

> **利用 GitHub Actions 每天執行 `maguowei/starred` Python 工具，讀取 goodjack 帳號按過 Star 的 repositories，重新產生 Markdown 清單，再自動 commit 回 repository。**

因此這個專案可以視為一套：

* GitHub Star 備份
* GitHub Star 分類索引
* 個人開源專案收藏庫
* 自動更新的 Awesome List

README 也直接寫明，它是由 `starred` 自動生成的個人 GitHub Stars 清單。

---

# 一、這個專案實際上有什麼？

主要只有三個重要部分：

| 檔案                                | 功能                          |
| --------------------------------- | --------------------------- |
| `README.md`                       | 按主要程式語言分類的 Star 清單          |
| `topics.md`                       | 按 GitHub Topics 分類的 Star 清單 |
| `.github/workflows/schedules.yml` | 每天自動更新上述兩個檔案                |

它沒有：

* 資料庫
* 後端伺服器
* React/Vue 前端
* 自己撰寫的 GitHub API 程式
* 搜尋系統
* 登入系統

真正負責抓資料、分類、產生 Markdown 的程式，是另外一個套件：

```text
maguowei/starred
```

`goodjack/stars` 比較像是這個工具的「執行結果 repository」。

---

# 二、使用者看到的內容是什麼？

## 1. `README.md`：按照程式語言分類

例如：

```markdown
## C++

- [TheAlgorithms/C-Plus-Plus](...)
- [microsoft/terminal](...)
- [catchorg/Catch2](...)

## JavaScript

- [某個 JavaScript 專案](...)
```

專案會將 GitHub Star 過的 repository，按照「主要程式語言」分類。

目前 README 內可看到大量分類，例如：

* C
* C++
* CSS
* Go
* HTML
* Java
* JavaScript
* Python
* Rust
* TypeScript
* Vue
* Others

每一筆項目包含：

```text
repository 名稱 + GitHub URL + repository description
```

例如：

```markdown
- [torvalds/linux](https://github.com/torvalds/linux) - Linux kernel source tree
```

實際輸出的格式就是這種 Awesome List 形式。

---

## 2. `topics.md`：按照 GitHub Topic 分類

另一份 `topics.md` 則不是按照語言，而是按照 repository 的 Topic 分類，例如：

* `ai`
* `algorithm`
* `android`
* `automation`
* `chatgpt`
* `docker`
* `fastapi`
* `firebase`
* `github-api`
* `kubernetes`
* `llm`
* `machine-learning`
* `react`
* `security`

`topics.md` 的目錄可以看到非常多分類。

例如某個 repository 同時有：

```text
ai
ai-agents
llm
openai
```

它就可能同時出現在四個分類中。

所以：

* 語言分類通常一個 repository 只出現一次
* Topic 分類可能重複出現很多次

這不是資料重複錯誤，而是多對多分類的自然結果。

---

# 三、完整運作流程

整體流程可以畫成：

```text
goodjack 在 GitHub 按 Star
             │
             ▼
GitHub 儲存 Star 關係
             │
             ▼
GitHub Actions 每天觸發
             │
             ▼
安裝 Python starred 套件
             │
             ▼
呼叫 GitHub GraphQL API
             │
             ▼
抓取 goodjack 的全部 Star
             │
             ├── 按主要語言分類
             │       └── 產生 README.md
             │
             └── 按 Topic 分類
                     └── 產生 topics.md
             │
             ▼
透過 GitHub API 更新檔案
             │
             ▼
自動產生 Git commit
```

---

# 四、GitHub Actions 怎麼運作？

核心設定在：

```text
.github/workflows/schedules.yml
```

## 1. 觸發條件

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: 30 0 * * *
```

有兩種觸發方式：

### 手動觸發

```yaml
workflow_dispatch:
```

你可以進入：

```text
Actions → update awesome-stars → Run workflow
```

手動執行一次。

### 每日自動執行

```yaml
cron: 30 0 * * *
```

代表每天 UTC 00:30 執行，換算台灣時間大約是：

```text
每天 08:30
```

相關設定可直接在 workflow 中確認。

---

## 2. 建立 Python 環境

```yaml
- uses: actions/checkout@v3

- name: Set up Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.10'
```

GitHub Actions 會建立一台暫時的 Ubuntu 虛擬機，並安裝 Python 3.10。

然後執行：

```yaml
python -m pip install --upgrade pip
pip install starred
```

也就是從 PyPI 安裝 `starred` Python 套件。

`starred` 目前要求 Python 3.10 以上，其主要依賴包括：

* `click`：CLI 命令列介面
* `github3.py`：GitHub REST API
* `gql`：GraphQL Client
* `aiohttp`：非同步 HTTP 傳輸
* `requests`：HTTP Request

相關套件定義在 `pyproject.toml`。

---

## 3. 自動取得帳號與 repository 名稱

```yaml
run: echo "REPOSITORY_NAME=${GITHUB_REPOSITORY#*/}" >> $GITHUB_ENV
```

假設目前 repository 是：

```text
goodjack/stars
```

GitHub 內建變數：

```text
GITHUB_REPOSITORY=goodjack/stars
```

`${GITHUB_REPOSITORY#*/}` 會移除第一個 `/` 前面的內容，最後得到：

```text
stars
```

另外：

```yaml
USERNAME: ${{ github.repository_owner }}
```

會得到：

```text
goodjack
```

因此不需要把 goodjack 寫死。

這也代表如果你把它複製成：

```text
Andy87877/stars
```

執行時就會自動變成：

```text
USERNAME=Andy87877
REPOSITORY=stars
```

---

## 4. 產生語言分類

第一個主要命令是：

```bash
starred \
  --username ${USERNAME} \
  --repository ${REPOSITORY} \
  --sort \
  --token ${GITHUB_TOKEN} \
  --message "awesome-stars category by language update by github actions cron, created by starred"
```

這裡沒有指定 `--topic`，因此預設按照程式語言分類，輸出到預設檔案：

```text
README.md
```

參數含義：

| 參數             | 功能                      |
| -------------- | ----------------------- |
| `--username`   | 要取得哪個 GitHub 使用者的 Stars |
| `--repository` | 要更新哪個 repository        |
| `--sort`       | 將分類名稱依字母排序              |
| `--token`      | GitHub API Token        |
| `--message`    | 自動 commit 的訊息           |

---

## 5. 產生 Topic 分類

第二個命令：

```bash
starred \
  --username ${USERNAME} \
  --repository ${REPOSITORY} \
  --sort \
  --token ${GITHUB_TOKEN} \
  --topic \
  --topic_limit 500 \
  --filename topics.md \
  --message "awesome-stars category by topic update by github actions cron, created by starred"
```

增加了：

```bash
--topic
```

表示改成按照 GitHub Topic 分類。

以及：

```bash
--filename topics.md
```

表示輸出到 `topics.md`，避免蓋掉 `README.md`。

完整的兩段命令都在 workflow 裡。

---

# 五、`starred` 核心程式如何抓取 GitHub Stars？

這裡不是 HTML 爬蟲，而是使用 GitHub 官方 GraphQL API：

```text
https://api.github.com/graphql
```

GraphQL Query 大致上是：

```graphql
query ($username: String!, $after: String) {
  user(login: $username) {
    starredRepositories(
      first: 100
      after: $after
      orderBy: {
        direction: DESC
        field: STARRED_AT
      }
    ) {
      nodes {
        nameWithOwner
        description
        url
        stargazerCount
        isPrivate

        languages(
          first: 1
          orderBy: {
            field: SIZE
            direction: DESC
          }
        ) {
          edges {
            node {
              name
            }
          }
        }

        repositoryTopics(first: 100) {
          nodes {
            topic {
              name
              stargazerCount
            }
          }
        }
      }

      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}
```

原始程式確實取得：

* repository 名稱
* 完整 owner/name
* description
* URL
* Star 數
* 是否為 private
* 主要語言
* Topics
* 下一頁 cursor

相關 Query 定義可在來源碼看到。

---

# 六、它如何處理超過 100 個 Stars？

GitHub GraphQL 一次最多抓：

```graphql
first: 100
```

因此需要 Pagination。

程式先讀取：

```python
has_next = result["user"]["starredRepositories"]["pageInfo"]["hasNextPage"]
end_cursor = result["user"]["starredRepositories"]["pageInfo"]["endCursor"]
```

如果還有下一頁：

```python
if has_next:
    items.extend(
        self.get_user_starred_by_username(
            username,
            end_cursor,
            topic_stargazer_count_limit
        )
    )
```

也就是：

```text
第 1 次：抓第 1～100 筆
第 2 次：抓第 101～200 筆
第 3 次：抓第 201～300 筆
...
直到 hasNextPage = false
```

它採用遞迴方式完成 GraphQL Cursor Pagination。

---

# 七、語言是怎麼判斷的？

GraphQL 會要求：

```graphql
languages(
  first: 1
  orderBy: {
    field: SIZE
    direction: DESC
  }
)
```

意思是：

> 按照 repository 中各語言所占程式碼大小排序，只取最大的一個。

例如某個專案：

```text
TypeScript 70%
CSS        20%
HTML       10%
```

這個專案就會被分類為：

```text
TypeScript
```

不是按照開發者自己選，也不是 AI 分類，而是 GitHub Linguist 的主要語言結果。

程式取的也是第一個 language edge。

沒有偵測到語言的 repository 則會被放進：

```text
Others
```

---

# 八、Topic 的 `500` 到底是什麼？

這一段很容易誤會：

```bash
--topic_limit 500
```

它不是指：

```text
只收錄超過 500 Stars 的 repository
```

真正判斷方式是：

```python
topics = [
    tag["topic"]["name"]
    for tag in repo["repositoryTopics"]["nodes"]
    if tag["topic"]["stargazerCount"] > topic_stargazer_count_limit
]
```

也就是：

> 只有該 Topic 本身在 GitHub 上的使用熱度超過 500，才會被保留。

例如某 repository 有：

```text
python
fastapi
andy-personal-project
```

可能：

```text
python                 > 500
fastapi                > 500
andy-personal-project  < 500
```

最後只保留：

```text
python
fastapi
```

這是為了防止 Topic 數量爆炸，出現大量只有一兩個 repository 使用的冷門標籤。

如果過濾後沒有任何 Topic，則會放入：

```text
others
```

---

# 九、Markdown 是怎麼產生的？

核心資料結構大致上是：

```python
repo_dict = {
    "Python": [
        ["owner/repo1", "https://github.com/...", "description"],
        ["owner/repo2", "https://github.com/...", "description"]
    ],
    "JavaScript": [
        ...
    ]
}
```

語言模式：

```python
category = s.language or "Others"
repo_dict[category].append([
    s.name,
    s.url,
    description
])
```

Topic 模式：

```python
for category in s.topics or ["others"]:
    repo_dict[category].append([
        s.name,
        s.url,
        description
    ])
```

程式先輸出目錄：

```markdown
- [Python](#python)
- [JavaScript](#javascript)
```

然後輸出內容：

```markdown
## Python

- [owner/repository](url) - description
```

分類與 Markdown Render 邏輯可在程式中直接看到。

---

# 十、順序是怎麼決定的？

GitHub GraphQL 查詢使用：

```graphql
orderBy: {
  direction: DESC
  field: STARRED_AT
}
```

因此最初資料順序是：

```text
最近按 Star 的 repository
↓
較早按 Star 的 repository
```

然後：

```python
if sort:
    repo_dict = OrderedDict(
        sorted(repo_dict.items(), key=lambda cate: cate[0])
    )
```

`--sort` 只會排序「分類名稱」，不會重新排序分類內的 repository。

所以實際效果大致是：

```text
分類：英文字母順序
分類內：最近 Star 的專案優先
```

這是根據查詢順序與插入順序所作的程式行為推論。

---

# 十一、它怎麼自動 commit？

`starred` 產生完整 Markdown 後，不是執行：

```bash
git add
git commit
git push
```

而是直接使用 GitHub REST API。

邏輯是：

```python
rep = gh.repository(username, repository)
content = rep.file_contents(f"/{filename}")
```

如果檔案內容不同：

```python
content.update(message, file_value)
```

如果檔案不存在：

```python
rep.create_file(filename, message, file_value)
```

如果連 repository 都不存在：

```python
rep = gh.create_repository(
    repository,
    "A curated list of my GitHub stars!"
)
```

然後建立檔案。

所以 Actions 裡的：

```yaml
actions/checkout
```

嚴格來說不是核心必要步驟，因為最後不是靠本地 Git push，而是直接呼叫 GitHub API 更新檔案。

---

# 十二、為什麼 commit 歷史看起來一語言、一 Topic？

因為每次 workflow 執行兩個 `starred` 指令：

1. 更新 `README.md`
2. 更新 `topics.md`

每個指令都可能建立一個 commit。

因此一次 Actions 執行最多產生兩次 commit：

```text
awesome-stars category by language update...
awesome-stars category by topic update...
```

實際近期 commit 訊息也確實在這兩種更新之間交替。

但如果檔案內容完全沒變，程式會比較：

```python
if content.decoded != file_value:
    content.update(...)
```

因此沒有變化時不會建立無意義 commit。

---

# 十三、可以把它理解成一套小型 ETL

從軟體架構角度，可以這樣對應：

| ETL 元件             | 此專案實作                  |
| ------------------ | ---------------------- |
| Data Source        | GitHub Stars           |
| Extract            | GitHub GraphQL API     |
| Transform          | 依 Language／Topic 分類    |
| Load               | 產生 Markdown            |
| Scheduler          | GitHub Actions         |
| Storage            | GitHub Repository      |
| Version History    | Git commits            |
| Presentation Layer | GitHub README Renderer |

所以它其實是一個非常簡潔的：

```text
API → 資料轉換 → 靜態文件生成 → 自動發布
```

系統。

---

# 十四、這個設計的優點

## 1. 幾乎零維運

不需要：

* VPS
* Firebase
* 資料庫
* 網域
* 後端服務
* 長期執行的伺服器

全部放在 GitHub 裡。

## 2. 免費靜態儲存

Markdown 直接存在 repository，而且 Git history 自帶版本紀錄。

## 3. 自動同步取消 Star

因為每次都是重新抓取完整 Stars 並重新生成，因此：

* 新增 Star：下次執行時出現
* 取消 Star：下次執行時消失
* repository 改描述：下次同步更新
* repository 改主要語言：分類跟著變化

## 4. 使用官方 API

不是 Selenium，也不是 BeautifulSoup，更不是解析 GitHub HTML，因此相對穩定。

## 5. 容易 Fork

所有帳號資訊都從：

```yaml
github.repository_owner
GITHUB_REPOSITORY
```

動態取得，不必寫死 goodjack。

---

# 十五、它的限制

## 1. 沒有搜尋功能

Star 數量一多，README 會非常長，只能使用：

* 瀏覽器 Ctrl+F
* GitHub 頁內目錄
* GitHub Repository Search

使用體驗有限。

## 2. 沒有個人註解

你無法針對 repository 寫：

```text
這是我要拿來學 FastAPI 的
這個專案需要之後研究
這個專案適合畢業專題
```

因為每次重新生成都會蓋掉手動修改內容。

## 3. 只使用主要語言

一個 React + FastAPI 專案可能只會被歸到：

```text
TypeScript
```

不會同時出現在 Python。

## 4. Topic 分類會大量重複

同一個 repository 可能同時出現在：

```text
ai
llm
openai
chatgpt
python
```

`topics.md` 可能比原始 Star 數量大很多。

## 5. 每次完整抓取

它不是增量同步。

即使只新增一個 Star，也會重新抓取全部資料、重新生成整份 Markdown。

但對一般個人 GitHub Star 數量而言，這通常可以接受。

## 6. Description 只保留 200 字元

程式設定：

```python
TEXT_LENGTH_LIMIT = 200
```

並截斷 description。

## 7. Private Repository 有額外限制

雖然 CLI 有：

```bash
--private
```

但除了加入參數，Token 本身也必須真的擁有對那些 private repositories 的讀取權限。

目前 goodjack 的 workflow 沒有加 `--private`。

---

# 十六、你能不能寫一個類似的？

可以，而且以你目前會的：

* Python
* requests
* 資料處理
* JSON
* GitHub Actions
* GitHub Pages
* HTML／JavaScript

這個專案對你而言技術難度不高。

真正核心只有四件事：

1. 呼叫 GitHub GraphQL API
2. GraphQL Cursor Pagination
3. 將資料分類
4. 產生 Markdown 或 JSON

---

# 十七、三種仿作方式

## 方案 A：直接使用 `starred`

最省事，建立：

```text
Andy87877/stars
```

然後放入：

```yaml
name: Update GitHub Stars

on:
  workflow_dispatch:
  schedule:
    - cron: "30 0 * * *"

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"

      - name: Install starred
        run: pip install starred

      - name: Generate language list
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          starred \
            --username "${{ github.repository_owner }}" \
            --repository "${{ github.event.repository.name }}" \
            --sort \
            --token "${GITHUB_TOKEN}" \
            --filename README.md

      - name: Generate topic list
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          starred \
            --username "${{ github.repository_owner }}" \
            --repository "${{ github.event.repository.name }}" \
            --sort \
            --topic \
            --topic_limit 500 \
            --token "${GITHUB_TOKEN}" \
            --filename topics.md
```

這不是「自己開發」，而是部署現成工具。

---

## 方案 B：自己重寫 Python 版本

建議架構：

```text
github-stars/
├── app/
│   ├── main.py
│   ├── models.py
│   ├── github_client.py
│   ├── categorizer.py
│   ├── renderer.py
│   └── publisher.py
├── templates/
│   └── README.md.j2
├── tests/
│   ├── test_categorizer.py
│   └── test_renderer.py
├── requirements.txt
└── .github/
    └── workflows/
        └── update-stars.yml
```

### OOP／SOLID 切法

```python
class Repository:
    name: str
    url: str
    description: str
    language: str
    topics: list[str]
    starred_at: str
```

```python
class GitHubClient:
    def get_starred_repositories(self, username: str):
        ...
```

```python
class Categorizer:
    def categorize(self, repositories):
        raise NotImplementedError
```

```python
class LanguageCategorizer(Categorizer):
    def categorize(self, repositories):
        ...
```

```python
class TopicCategorizer(Categorizer):
    def categorize(self, repositories):
        ...
```

```python
class MarkdownRenderer:
    def render(self, categories):
        ...
```

```python
class GitHubPublisher:
    def update_file(self, path, content):
        ...
```

這樣的好處是：

* GitHub API 與顯示格式分離
* Markdown 可替換成 HTML
* Language 與 Topic 分類策略可替換
* 容易寫單元測試
* 符合 Strategy Pattern 與 Dependency Inversion

---

## 方案 C：做成更實用的 GitHub Stars 網站

這比較適合你。

架構：

```text
GitHub GraphQL API
        │
        ▼
Python 同步程式
        │
        ├── data/stars.json
        ├── README.md
        └── topics.md
        │
        ▼
GitHub Pages
        │
        ▼
HTML + JavaScript 搜尋介面
```

前端功能可以加入：

* 即時關鍵字搜尋
* 語言篩選
* Topic 多選
* Star 數排序
* 最近收藏排序
* Repository 更新時間排序
* 只顯示 archived／非 archived
* 顯示 Fork 數
* 顯示最後更新時間
* 收藏註解
* 自訂標籤
* 深色模式
* 匯出 CSV／JSON
* 隨機推薦一個以前 Star 過的專案

資料格式可以設計成：

```json
[
  {
    "name": "fastapi/fastapi",
    "url": "https://github.com/fastapi/fastapi",
    "description": "FastAPI framework",
    "language": "Python",
    "topics": [
      "python",
      "api",
      "fastapi"
    ],
    "stars": 90000,
    "forks": 8000,
    "isArchived": false,
    "starredAt": "2026-07-20T10:30:00Z",
    "updatedAt": "2026-07-28T08:00:00Z"
  }
]
```

前端只要：

```javascript
const result = repositories.filter(repo => {
  const text = [
    repo.name,
    repo.description,
    repo.language,
    ...repo.topics
  ].join(" ").toLowerCase();

  return text.includes(keyword.toLowerCase());
});
```

就可以做到真正的全文搜尋。

---

# 十八、我建議你不要只複製它

單純做 `goodjack/stars` 的複製版，技術價值有限，因為核心套件不是你寫的。

你比較適合做成：

## `Andy87877/GitHub-Star-Manager`

```text
GitHub Star 自動同步
＋
靜態搜尋網站
＋
自訂分類
＋
個人研究註解
＋
GitHub Pages
```

架構可以是：

```text
GitHub Actions
      │
      ▼
Python GraphQL Sync
      │
      ├── stars.json
      ├── languages.json
      └── topics.json
      │
      ▼
GitHub Pages
      │
      ▼
Search / Filter / Sort / Notes UI
```

這樣不只是 Awesome List，而會變成真正的：

> **個人 GitHub 開源專案知識庫。**

技術上會涵蓋：

* GraphQL
* REST API
* OAuth／Token
* GitHub Actions
* ETL
* JSON Schema
* OOP／SOLID
* 靜態網站
* 搜尋與篩選
* CI/CD
* API Rate Limit 處理

對作品集而言，也比單純產生一份 README 更有內容。

~~~


~~~


@GitHub
 
goodjack/stars 詳細介紹這個專案 這個是啥 怎麼運作 我能寫一個類似的嗎
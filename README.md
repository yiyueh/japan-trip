# 旅のきろく｜日本行程規劃 App

手機可用的日本旅遊行程規劃，支援家人/朋友邀請碼共享即時同步。

---

## 部署步驟（約 20–30 分鐘，全程免費）

### 第一步：建立 Firebase 資料庫

1. 打開 https://console.firebase.google.com
2. 點「新增專案」→ 輸入名稱（例如 `japan-trip`）→ 不需要 Google Analytics → 建立
3. 左側選單找 **Realtime Database** → 點「建立資料庫」
4. 選離你最近的地區（亞洲選 `asia-southeast1`）→ 下一步
5. 模式選 **「以測試模式啟動」** → 啟用
6. 複製上方的資料庫網址（格式像：`https://japan-trip-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app`）
7. 點左上角齒輪 ⚙️ →「專案設定」→ 往下找「你的應用程式」→ 點 **`</>`** 圖示（Web）
8. 輸入 App 暱稱 → 註冊應用程式 → 複製整個 `firebaseConfig` 物件

---

### 第二步：填入 Firebase 設定

打開 `src/firebase.js`，把你剛才複製的設定貼進去：

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "japan-trip-xxxxx.firebaseapp.com",
  databaseURL:       "https://japan-trip-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "japan-trip-xxxxx",
  storageBucket:     "japan-trip-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef",
};
```

⚠️ `databaseURL` 這行最重要，確認有填。

---

### 第三步：上傳到 GitHub

1. 如果沒有 GitHub 帳號，先到 https://github.com 免費註冊
2. 點右上角 `+` → New repository → 名稱輸入 `japan-trip` → Public → Create
3. 在電腦打開「終端機」（Mac）或「命令提示字元」（Windows），cd 到這個資料夾：
   ```bash
   cd japan-trip-app
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/你的帳號/japan-trip.git
   git push -u origin main
   ```

---

### 第四步：部署到 Vercel

1. 打開 https://vercel.com → 用 GitHub 帳號登入
2. 點「New Project」→ Import 你剛才的 `japan-trip` repo
3. Framework Preset 選 **Create React App**
4. 點「Deploy」→ 等約 1–2 分鐘
5. 部署完成後會給你一個網址，例如：`https://japan-trip-abc123.vercel.app`

---

### 第五步：手機加到桌面

**iPhone (Safari)：**
1. 用 Safari 打開你的 Vercel 網址
2. 底部點分享按鈕 □↑
3. 選「加入主畫面」→ 加入
4. 桌面上就會出現 App 圖示

**Android (Chrome)：**
1. 用 Chrome 打開網址
2. 右上角三個點 → 「新增到主畫面」
3. 點「新增」

---

## 共享功能使用方式

1. App 首頁，行程卡片下方點「分享行程」
2. 會產生 6 碼邀請碼，複製傳給家人
3. 家人打開同一個網址，點「輸入邀請碼」，輸入後加入
4. 任何人修改行程後，對方點「點擊同步最新」即可看到更新

---

## 常見問題

**Q：Firebase 免費版夠用嗎？**
夠。免費版（Spark Plan）每天 10 萬次讀寫，個人旅遊完全夠。

**Q：30天後 Firebase test mode 過期怎辦？**
到 Firebase → Realtime Database → 規則，把規則改成：
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Q：Vercel 要付費嗎？**
個人使用完全免費，不需要填信用卡。

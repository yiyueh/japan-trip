// ─── Firebase 設定 ────────────────────────────────────────────────────────────
// 步驟：
// 1. 前往 https://console.firebase.google.com
// 2. 建立新專案（免費）
// 3. 左側選 Realtime Database → 建立資料庫 → 選 test mode
// 4. 點右上角齒輪 → 專案設定 → 你的應用程式 → 複製設定貼到下方

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "貼上你的 apiKey",
  authDomain:        "貼上你的 authDomain",
  databaseURL:       "貼上你的 databaseURL",   // ← 一定要有這行
  projectId:         "貼上你的 projectId",
  storageBucket:     "貼上你的 storageBucket",
  messagingSenderId: "貼上你的 messagingSenderId",
  appId:             "貼上你的 appId",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

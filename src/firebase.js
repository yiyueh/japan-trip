import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyCypSQoMOkQwNf3KO2mfR9pd_Zyz2QQdh4",
  authDomain:        "japan-trip-c8d83.firebaseapp.com",
  databaseURL:       "https://japan-trip-c8d83-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "japan-trip-c8d83",
  storageBucket:     "japan-trip-c8d83.firebasestorage.app",
  messagingSenderId: "443630513127",
  appId:             "1:443630513127:web:72dfda1cae752f5ce66b42",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

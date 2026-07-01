/**
 * Firebase クライアントSDK 初期化
 * - firebase/app, firebase/auth, firebase/firestore を設定
 * - 環境変数から設定値を取得 (VITE_FIREBASE_*)
 * - 開発モード時はエミュレータに接続
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase設定 - 環境変数から取得
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase アプリ初期化
const app: FirebaseApp = initializeApp(firebaseConfig);

// Firebase Auth（匿名認証 + Google認証対応）
const auth: Auth = getAuth(app);

// Google認証プロバイダ
const googleProvider = new GoogleAuthProvider();

// Firestore データベース
const db: Firestore = getFirestore(app);

// Cloud Functions（asia-northeast1 = 東京リージョン）
const functions = getFunctions(app, "asia-northeast1");

// 開発モード時はエミュレータに接続
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("[Firebase] エミュレータに接続しました");
  } catch (e) {
    // 既に接続済みの場合はスキップ
    console.warn("[Firebase] エミュレータ接続スキップ:", e);
  }
}

export { app, auth, db, functions, googleProvider };

// import { initializeApp } from "firebase/app";
import dotenv from "dotenv";
import admin from "firebase-admin"; // Admin SDK untuk Firebase

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    databaseURL: process.env.DATABASE_URL,
};

// const app = initializeApp(firebaseConfig); // ini untuk client stide yang langsung di akses di fe

const serviceAccount = process.env.SERVICE_ACCOUNT;
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...firebaseConfig,
}); // sedag kan yang ini ini itu tidak  ini hanya untuk backend

const bucket = admin.storage().bucket(); // Instance Firebase Storage
const db = admin.firestore(); // Instance Firestore Database
const realtimeDb = admin.database(); // Realtime Database Instance

export {
    bucket,
    db,
    realtimeDb
}
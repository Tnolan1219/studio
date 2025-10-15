import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "studio-9261157063-89cbd",
  "appId": "1:920885077891:web:b9f56cb290ffbbea3ef8b6",
  "apiKey": "AIzaSyCfFqVeNy5WtM99GS04_fpuYzKR2BfMhOY",
  "authDomain": "studio-9261157063-89cbd.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "920885077891"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

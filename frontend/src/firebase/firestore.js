import app from './firebase';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

const db = getFirestore(app);
const storage = getStorage(app);

const uploadBase64 = async (path, base64DataUrl) => {
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64DataUrl, 'data_url');
  return getDownloadURL(storageRef);
};

export { db, storage, uploadBase64 };

import app from './firebase';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const auth = getAuth(app);

const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
const signOutUser = () => signOut(auth);

export { auth, signIn, signOutUser, onAuthStateChanged };

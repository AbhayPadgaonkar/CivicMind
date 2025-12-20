import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function logoutUser() {
  await signOut(auth);
}

export async function signupUser(
  firstName: string,  
  lastName: string,
  email: string,
  password: string
) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  const user = userCred.user;

  // Store user profile in Firestore
  await setDoc(doc(db, "users", user.uid), {
    firstName,
    lastName,
    email,
    createdAt: new Date(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred.user;
}

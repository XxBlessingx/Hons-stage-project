// Will be using this for the dashboard logic//
//import {initializeApp} from
// app.js — dashboard logic only

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
   apiKey: "AIzaSyDUPdCJIpj09iUSHL4Dm_ZwbYuHzzq_SmM",
  authDomain: "habitiq-364b5.firebaseapp.com",
  projectId: "habitiq-364b5",
  storageBucket: "habitiq-364b5.firebasestorage.app",
  messagingSenderId: "825959188014",
  appId: "1:825959188014:web:ec3fc6ed82a076be4f01bf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const welcomeEl = document.getElementById("welcome");
const logoutBtn = document.getElementById("logout");
const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-name");
const habitList = document.getElementById("habit-list");

// AUTH GUARD + ONBOARDING CHECK
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || !userSnap.data().onboardingComplete) {
    window.location.href = "onboarding.html";
    return;
  }

  // User is authenticated + onboarded
  const userData = userSnap.data();
  welcomeEl.textContent = `Welcome, ${userData.name}`;

});

// for adding a habit 
habitForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const docRef = await addDoc(
    collection(db, "users", user.uid, "habits"),
    {
      name: habitInput.value
    }
  );
  
  renderHabit(docRef.id, habitInput.value, user.uid);
  habitInput.value = "";
});

//displaying the habit 
async function loadHabits(uid) {
  habitList.innerHTML = "";

  const habitsRef = collection(db, "users", uid, "habits");
  const snapshot = await getDocs(habitsRef);

  snapshot.forEach((docSnap) => {
    renderHabit(docSnap.id, docSnap.data().name, uid);
  });
}


//delete/edit a habit
function renderHabit(id, name, uid) {
  const li = document.createElement("li");
  li.textContent = name;

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";

  delBtn.addEventListener("click", async () => {
    await deleteDoc(doc(db, "users", uid, "habits", id));
    li.remove();
  });

  li.appendChild(delBtn);
  habitList.appendChild(li);
}

// LOGOUT
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});






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
  getDoc,
  addDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
//const habitForm = document.getElementById("habit-form");
//const habitInput = document.getElementById("habit-name");
const habitList = document.getElementById("habit-list");
const openModalBtn = document.getElementById("open-modal");
const modal = document.getElementById("habit-modal");
const closeModalBtn = document.getElementById("close-modal");
const emptyState = document.getElementById("empty-state");
const toggleAdvancedBtn = document.getElementById("toggle-advanced");
const advancedSection = document.getElementById("advanced-section");
const advancedArrow = document.getElementById("advanced-arrow");

let editingHabitId = null;

if (toggleAdvancedBtn) {
  toggleAdvancedBtn.addEventListener("click", () => {
    advancedSection.classList.toggle("open");
    advancedArrow.classList.toggle("rotate");
  });
}

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
// this is what is used to load the users habits 
  loadHabits(user.uid);

});


//displaying the habit 
async function loadHabits(uid) {
  habitList.innerHTML = "";

  const habitsRef = collection(db, "users", uid, "habits");
  const snapshot = await getDocs(habitsRef);

  //debugging
  console.log("Snapshot empty:", snapshot.empty);

  if (snapshot.empty) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");

    snapshot.forEach((docSnap) => {
      renderHabit(docSnap.id, docSnap.data().name, uid);
    });
  }
}


//delete and edit a habit
/*function renderHabit(id, name, uid) {
  const li = document.createElement("li");
  li.textContent = name;

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";

  delBtn.addEventListener("click", async () => {
    await deleteDoc(doc(db, "users", uid, "habits", id));
    li.remove();

    if(habitList.children.length === 0){
      emptyState.classList.remove("hidden");
    }
  });

  li.appendChild(delBtn);
  habitList.appendChild(li);
}*/

function renderHabit(id, name, uid) {
  const habitCard = document.createElement("div");
  habitCard.classList.add("habit-card");

  const title = document.createElement("h3");
  title.textContent = name;

  const actions = document.createElement("div");
  actions.classList.add("habit-actions");

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.classList.add("action-btn")

  editBtn.addEventListener("click", async () => {
  const habitSnap = await getDoc(doc(db, "users", uid, "habits", id));
  const habitData = habitSnap.data();

  document.getElementById("modal-habit-name").value = habitData.name;
  document.getElementById("habit-frequency").value = habitData.frequency;
  document.getElementById("habit-difficulty").value = habitData.difficulty;
  document.getElementById("habit-impact").value = habitData.impact || "low";
  document.getElementById("habit-motivation").value = habitData.motivation || "";

  editingHabitId = id;

  modal.classList.remove("hidden");
});

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.classList.add("delete-btn");

  delBtn.addEventListener("click", async () => {
    await deleteDoc(doc(db, "users", uid, "habits", id));
    habitCard.remove();

   if (habitList.children.length === 0) {
      emptyState.classList.remove("hidden");
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  habitCard.appendChild(title);
  habitCard.appendChild(actions);

  habitList.appendChild(habitCard);
}

const saveHabitBtn = document.getElementById("save-habit");
const modalHabitInput = document.getElementById("modal-habit-name");

if (saveHabitBtn) {
  saveHabitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const habitName = modalHabitInput.value.trim();
    if (!habitName) return;

    if (editingHabitId) {
      // ✏️ UPDATE EXISTING HABIT
      await updateDoc(
        doc(db, "users", user.uid, "habits", editingHabitId),
        {
          name: habitName,
          frequency: document.getElementById("habit-frequency").value,
          difficulty: document.getElementById("habit-difficulty").value,
          impact: document.getElementById("habit-impact").value || null,
          motivation: document.getElementById("habit-motivation").value || null,
        }
      );

      editingHabitId = null;

      loadHabits(user.uid); // reload to show updated values

    } else {
      // ➕ CREATE NEW HABIT
      const docRef = await addDoc(
        collection(db, "users", user.uid, "habits"),
        {
          name: habitName,
          frequency: document.getElementById("habit-frequency").value,
          difficulty: document.getElementById("habit-difficulty").value,
          impact: document.getElementById("habit-impact").value || null,
          motivation: document.getElementById("habit-motivation").value || null,
          createdAt: new Date()
        }
      );

      renderHabit(docRef.id, habitName, user.uid);
    }

    // Reset modal
    modalHabitInput.value = "";
    modal.classList.add("hidden");
    emptyState.classList.add("hidden");
  });
}


const cancelBtn = document.getElementById("cancel-habit");
// OPEN MODAL
if (openModalBtn) {
  openModalBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
}

// CLOSE MODAL (x)
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}
// CLOSE MODAL (Cancel button)
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}


// LOGOUT
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
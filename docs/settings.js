import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentUser = null;
let userDocRef = null;

//  LOAD ACCESSIBILITY PREFS IMMEDIATELY 
// Read from localStorage before auth loads to prevent flash of unstyled content
function loadLocalPrefs() {
  if (localStorage.getItem("dyslexiaFont") === "true") {
    document.body.classList.add("dyslexia-font");
    document.getElementById("font-toggle").checked = true;
  }
  if (localStorage.getItem("highContrast") === "true") {
    document.body.classList.add("high-contrast");
    document.getElementById("contrast-toggle").checked = true;
  }
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    document.getElementById("dark-mode-toggle").checked = true;
  }
}
loadLocalPrefs();

//  HELPERS 
function showSaved() {
  const el = document.getElementById("save-indicator");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2000);
}

function updateConsentStatus(enabled) {
  const el = document.getElementById("consent-status");
  if (!el) return;
  el.textContent = enabled ? "AI insights enabled" : "AI insights disabled";
  el.className = enabled ? "consent-status enabled" : "consent-status";
}

//  AUTH GUARD 
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  userDocRef = doc(db, "users", user.uid);

  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const aiConsent = userData.ai_consent === true;

  document.getElementById("ai-consent-toggle").checked = aiConsent;
  updateConsentStatus(aiConsent);
});

// for the AI CONSENT TOGGLE 
document.getElementById("ai-consent-toggle").addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  updateConsentStatus(enabled);

  if (userDocRef) {
    await updateDoc(userDocRef, { ai_consent: enabled });
    showSaved();
  }
});

// accsessabilty feature: DYSLEXIA FONT TOGGLE 
document.getElementById("font-toggle").addEventListener("change", (e) => {
  const enabled = e.target.checked;
  document.body.classList.toggle("dyslexia-font", enabled);
  localStorage.setItem("dyslexiaFont", enabled);
  showSaved();
});

// accessabilty freature: HIGH CONTRAST TOGGLE
document.getElementById("contrast-toggle").addEventListener("change", (e) => {
  const enabled = e.target.checked;
  document.body.classList.toggle("high-contrast", enabled);
  localStorage.setItem("highContrast", enabled);
  showSaved();
});

// for the dark mode toggle 
document.getElementById("dark-mode-toggle").addEventListener("change", (e) => {
  const enabled = e.target.checked;
  document.body.classList.toggle("dark-mode", enabled);
  localStorage.setItem("darkMode", enabled);
  showSaved();
});

// if the user wishes to download their data
document.getElementById("download-data").addEventListener("click", async () => {
  if (!currentUser) return;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();

  const habitsSnap = await getDocs(collection(db, "users", currentUser.uid, "habits"));
  const habits = [];
  habitsSnap.forEach(docSnap => habits.push({ id: docSnap.id, ...docSnap.data() }));

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      name: userData.name,
      email: currentUser.email
    },
    preferences: {
      ai_consent: userData.ai_consent || false
    },
    habits
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habitiq-data-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── DELETE ACCOUNT ──────────────────────────────────────────────────────────
document.getElementById("delete-account").addEventListener("click", () => {
  document.getElementById("delete-modal").classList.remove("hidden");
});

document.getElementById("cancel-delete").addEventListener("click", () => {
  document.getElementById("delete-modal").classList.add("hidden");
});

document.getElementById("confirm-delete").addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    // Delete all habits first
    const habitsSnap = await getDocs(collection(db, "users", currentUser.uid, "habits"));
    await Promise.all(habitsSnap.docs.map(d => deleteDoc(d.ref)));

    // Delete user document
    await deleteDoc(doc(db, "users", currentUser.uid));

    // Delete Firebase Auth account
    await deleteUser(currentUser);

    window.location.href = "index.html";
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Could not delete account. Please log out and log back in first, then try again.");
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
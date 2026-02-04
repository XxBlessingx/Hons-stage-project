import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
 
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
const db =getFirestore(app);


// Grab all onboarding steps
const steps = document.querySelectorAll(".step");

// Track which step we’re on
let currentStep = 0;

// Store answers
const onboardingData = {};

// Show ONLY one step
function showStep(index) {
  steps.forEach(step => step.classList.remove("active"));
  steps[index].classList.add("active");
}

// Run logic for each step
steps.forEach((step, index) => {
  const key = step.dataset.key;
  const nextBtn = step.querySelector(".next");
  const finishBtn = step.querySelector("#finish");
  const optionButtons = step.querySelectorAll("button[data-value]");

  optionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      onboardingData[key] = btn.dataset.value;

      optionButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      if (nextBtn) nextBtn.disabled = false;
      if (finishBtn) finishBtn.disabled = false;
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentStep++;
      showStep(currentStep);
    });
  }
});

const finishBtn = document.getElementById("finish");

finishBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("User not logged in");
    return;
  }

  try {
    await setDoc(doc(db, "users", user.uid), {
      ...onboardingData,
      onboardingComplete: true,
      createdAt: serverTimestamp()
    });

    // After saving onboarding → go to dashboard
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Error saving onboarding:", error);
    alert("Something went wrong saving your setup");
  }
});

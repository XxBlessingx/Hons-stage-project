import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection
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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

// Gather the onboarding steps
const steps = document.querySelectorAll(".step");

// Track which step we’re on
let currentStep = 0;

// Stores the  answers
const onboardingData = {};

// Show ONLY one step at a time
function showStep(index) {
  steps.forEach(step => step.classList.remove("active"));
  steps[index].classList.add("active");
}

// Repeats for each step 
steps.forEach((step, index) => {
  const key = step.dataset.key;
  const nextBtn = step.querySelector(".next");
  const finishBtn = step.querySelector("#finish");
  const optionButtons = step.querySelectorAll("button[data-value]");
  const backBtn = step.querySelector(".back");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  }

  optionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      
      if (btn.dataset.value === "true") {
          onboardingData[key] = true;
      } else if (btn.dataset.value === "false") {
          onboardingData[key] = false;
      } else {
          onboardingData[key] = btn.dataset.value;
      }

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

const pickerCards = document.querySelectorAll(".habit-picker-card");
const selectedCountEl = document.getElementById("selected-count");
const finishBtn = document.getElementById("finish");
const skipBtn = document.getElementById("skip-habits");

pickerCards.forEach(card => {
  card.addEventListener("click", () => {
    card.classList.toggle("selected");
    const count = document.querySelectorAll(".habit-picker-card.selected").length;
    selectedCountEl.textContent = count;
    finishBtn.disabled = count === 0;
  });
});

skipBtn.addEventListener("click", () => {
  // if not habit is chosen then skips 
  pickerCards.forEach(card => card.classList.remove("selected"));
  selectedCountEl.textContent = "0";
  finishBtn.disabled = false;
  finishBtn.click();
});


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
    },
    {merge:true});

      const selectedCards = document.querySelectorAll(".habit-picker-card.selected");
    const habitPromises = [];

    selectedCards.forEach(card => {
      habitPromises.push(
        addDoc(collection(db, "users", user.uid, "habits"), {
          name: card.dataset.habit,
          category: card.dataset.category,
          difficulty: card.dataset.difficulty,
          frequency: "daily",
          direction: "build",
          completions: {},
          createdAt: new Date()
        })
      );
    });

    await Promise.all(habitPromises);

    // After saving onboarding redirects to the dashboard
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Error saving onboarding:", error);
    alert("Something went wrong saving your setup");
  }
});

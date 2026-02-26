// Will be using this for the dashboard logic//
//import {initializeApp} from
// app.js — dashboard logic only
import { ProgressTracker } from "./progress-tracker.js";
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

// AUTH GUARD + ONBOARDING CHECKs
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

  // User is authenticated + has completed onboarding 
  const userData = userSnap.data();
  welcomeEl.textContent = `Welcome, ${userData.name}`;
// this is what is used to load the users habits 
  loadHabits(user.uid);

});

// for displaying on the dashboard the not completed  habits 

// for displaying habits 
async function loadHabits(uid) {
  habitList.innerHTML = "";

  const habitsRef = collection(db, "users", uid, "habits");
  const snapshot = await getDocs(habitsRef);

  const today = new Date().toISOString().split("T")[0];
  const allHabits = [];

  snapshot.forEach((docSnap) => {
    const habitData = docSnap.data();
    allHabits.push({ id: docSnap.id, ...habitData });
  });

  // IMPORTANT — always calculate from all habits
  //updateProgressStats(allHabits);

 const tracker = new ProgressTracker(allHabits);
 const streak = tracker.calculateStreak();

  document.getElementById("current-streak").textContent = streak;
  document.getElementById("streak-message").textContent = tracker.getStreakMessage(streak);

  const dailyStats = tracker.calculateDailyProgress();

  document.getElementById("completed-count").textContent = dailyStats.completed;
  document.getElementById("total-count").textContent = dailyStats.total;
  document.getElementById("goal-progress").style.width = `${dailyStats.percentage}%`; 

  renderWeeklyCalendar(allHabits);

  const incomplete = allHabits.filter(habit =>
    !habit.completions || !habit.completions[today]
  );

  incomplete.forEach(habit => {
    renderHabit(habit.id, habit, uid);
  });

  // Empty state
  if (incomplete.length === 0 && allHabits.length > 0) {
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = `
      <p>🎉 All habits completed for today!</p>
      <p><a href="all-habits.html">View all habits</a></p>
    `;
  } else if (allHabits.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = `
      <p>Why not add your first habit?</p>
    `;
  } else {
    emptyState.classList.add("hidden");
  }
}

// function updateProgressStats(habits) {
//   const today = new Date().toISOString().split("T")[0];

//   const totalHabits = habits.length;
//   let completedToday = 0;

//   habits.forEach(habit => {
//     if (habit.completions && habit.completions[today]) {
//       completedToday++;
//     }
//   });

//   // Update numbers
//   document.getElementById("completed-count").textContent = completedToday;
//   document.getElementById("total-count").textContent = totalHabits;

//   // Update progress bar
//   const percentage = totalHabits === 0
//     ? 0
//     : Math.round((completedToday / totalHabits) * 100);

//   document.getElementById("goal-progress").style.width = `${percentage}%`;

//   // 🔥 STREAK LOGIC
//   //if (percentage === 100 && totalHabits > 0) {
//    // increaseStreak();
//   }
//   renderWeeklyCalendar(allHabits);
// //}

// streak building logic this is what is used to bulid the streak logic 
/*function increaseStreak() {
  const streakEl = document.getElementById("current-streak");
  let currentStreak = parseInt(localStorage.getItem("streak")) || 0;

  const lastCompleted = localStorage.getItem("lastCompletedDate");
  const today = new Date().toISOString().split("T")[0];

  if (lastCompleted !== today) {
    currentStreak++;
    localStorage.setItem("streak", currentStreak);
    localStorage.setItem("lastCompletedDate", today);
  }

  streakEl.textContent = currentStreak;
}*/
//document.getElementById("current-streak").textContent =
//localStorage.getItem("streak") || 0;

function renderWeeklyCalendar(habits) {
  const container = document.getElementById("week-days");
  container.innerHTML = "";

  const today = new Date();
  const week = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    week.push(date);
  }

  week.forEach(date => {
    const dayEl = document.createElement("div");
    dayEl.classList.add("week-day");

    const dateStr = date.toISOString().split("T")[0];

    let completedCount = 0;

    habits.forEach(habit => {
      if (habit.completions && habit.completions[dateStr]) {
        completedCount++;
      }
    });

    if (completedCount === habits.length && habits.length > 0) {
      dayEl.classList.add("complete");
    } else if (completedCount > 0) {
      dayEl.classList.add("partial");
    }

    dayEl.innerHTML = `
      <div class="day-name">
        ${date.toLocaleDateString("en-GB", { weekday: "short" })}
      </div>
      <div class="day-indicator"></div>
    `;

    container.appendChild(dayEl);
  });
}



function renderHabit(id, habitData, uid) {
  const habitCard = document.createElement("div");
  habitCard.classList.add("habit-card");

  // ===== LEFT SECTION =====
  const leftSection = document.createElement("div");
  leftSection.classList.add("habit-left");

  // Title row with icon and name
  const titleRow = document.createElement("div");
  titleRow.classList.add("habit-title-row");

  // Category icon
  const iconSpan = document.createElement("span");
  iconSpan.classList.add("habit-icon");
  iconSpan.textContent = habitData.category || "📌";
  titleRow.appendChild(iconSpan);

  // Habit name
  const title = document.createElement("h3");
  title.textContent = habitData.name;
  titleRow.appendChild(title);
  leftSection.appendChild(titleRow);

  // Meta row (category, difficulty, frequency)
  const metaRow = document.createElement("div");
  metaRow.classList.add("habit-meta");

  if (habitData.streak > 0) {
  const streakBadge = document.createElement("span");
  streakBadge.classList.add("streak-badge");
  streakBadge.textContent = `🔥 ${habitData.streak} day streak`;
  metaRow.appendChild(streakBadge);
  }

  // Category badge
  if (habitData.category) {
    const categoryBadge = document.createElement("span");
    categoryBadge.classList.add("category-badge");
    
    const categoryNames = {
      "📚": "Study", "💪": "Fitness", "🥗": "Nutrition", "🧘": "Mindfulness",
      "💤": "Sleep", "💧": "Hydration", "📖": "Reading", "✍️": "Writing",
      "🎯": "Goal", "🧹": "Cleaning", "💰": "Finance", "👥": "Social",
      "🎨": "Creative", "⚕️": "Health", "🌱": "Growth"
    };
    
    const categoryName = categoryNames[habitData.category] || "Other";
    categoryBadge.textContent = categoryName; 
    metaRow.appendChild(categoryBadge);
  }

  // Difficulty badge
  if (habitData.difficulty) {
    const difficultyBadge = document.createElement("span");
    difficultyBadge.classList.add("difficulty-badge");
    
    let difficultyIcon = "⚪";
    if (habitData.difficulty.toLowerCase() === "easy") difficultyIcon = "🟢";
    else if (habitData.difficulty.toLowerCase() === "medium") difficultyIcon = "🟡";
    else if (habitData.difficulty.toLowerCase() === "hard") difficultyIcon = "🔴";
    
    difficultyBadge.textContent = `${difficultyIcon} ${habitData.difficulty}`;
    metaRow.appendChild(difficultyBadge);
  }

  // Frequency badge
  if (habitData.frequency) {
    const frequencyBadge = document.createElement("span");
    frequencyBadge.classList.add("frequency-badge");
    
    let frequencyText = habitData.frequency;
    if (habitData.frequency === "daily") frequencyText = "Daily";
    else if (habitData.frequency === "weekly") frequencyText = "Weekly";
    
    frequencyBadge.textContent = `⏰ ${frequencyText}`;
    metaRow.appendChild(frequencyBadge);
  }

  leftSection.appendChild(metaRow);

  // ===== RIGHT SECTION =====
  const rightSection = document.createElement("div");
  rightSection.classList.add("habit-right");

  // Completion circle
  const completeCircle = document.createElement("div");
  completeCircle.classList.add("complete-circle");

  const today = new Date().toISOString().split("T")[0];
  const completions = habitData.completions || {};

  // Check if already completed today
  if (completions[today]) {
    completeCircle.classList.add("completed");
  }

  // ===== COMPLETION CLICK HANDLER =====
completeCircle.addEventListener("click", async (e) => {
  e.stopPropagation();

  const habitRef = doc(db, "users", uid, "habits", id);
  const habitSnap = await getDoc(habitRef);
  const habit = habitSnap.data();

  const today = new Date().toISOString().split("T")[0];

  // Prevent double completion
  if (habit.completions && habit.completions[today]) {
    return;
  }

  await updateDoc(habitRef, {
    completions: {
      ...(habit.completions || {}),
      [today]: true
    }
  });

  await loadHabits(uid);
});

  // Button container (hidden by default, shows on hover)
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("button-container");

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.textContent = "✎";
  editBtn.classList.add("icon-btn", "edit-btn");
  editBtn.title = "Edit habit";

  editBtn.addEventListener("click", () => {
    document.getElementById("modal-habit-name").value = habitData.name;
    document.getElementById("habit-frequency").value = habitData.frequency || "daily";
    document.getElementById("habit-difficulty").value = habitData.difficulty || "medium";
    document.getElementById("habit-direction").value = habitData.direction || "build";
    document.getElementById("habit-category").value = habitData.category || "📚";
    document.getElementById("habit-impact").value = habitData.impact || "low";
    document.getElementById("habit-motivation").value = habitData.motivation || "";

    editingHabitId = id;
    modal.classList.remove("hidden");
  });

  

  // Delete button
  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑";
  delBtn.classList.add("icon-btn", "delete-btn");
  delBtn.title = "Delete habit";

  delBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to delete this habit?")) {
      await deleteDoc(doc(db, "users", uid, "habits", id));
      

      if (habitList.children.length === 0) {
        emptyState.classList.remove("hidden");
      }
    }
  });

  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(delBtn);
  
  rightSection.appendChild(completeCircle);
  rightSection.appendChild(buttonContainer);

  
  habitCard.appendChild(leftSection);
  habitCard.appendChild(rightSection);
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

      // UPDATE EXISTING HABIT
      await updateDoc(
        doc(db, "users", user.uid, "habits", editingHabitId),
        {
          name: habitName,
          frequency: document.getElementById("habit-frequency").value,
          difficulty: document.getElementById("habit-difficulty").value,
          impact: document.getElementById("habit-impact").value || null,
          category: document.getElementById("habit-category").value,
          direction: document.getElementById("habit-direction").value, 
          motivation: document.getElementById("habit-motivation").value || null,
        }
      );

      editingHabitId = null;
      loadHabits(user.uid); // reload to show updated values

    } else {
      //  CREATE NEW HABIT
      const habitData = {
        name: habitName,
        frequency: document.getElementById("habit-frequency").value,
        difficulty: document.getElementById("habit-difficulty").value,
        impact: document.getElementById("habit-impact").value || null,
        motivation: document.getElementById("habit-motivation").value || null,
        category: document.getElementById("habit-category").value,
        completions: {}, // Initialize empty completions object
        streak:0,
        lastCompletedDate: null,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(
        collection(db, "users", user.uid, "habits"),
        habitData
      );

      await loadHabits(user.uid);
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
// Will be using this for the dashboard logic//
//import {initializeApp} from
// app.js — dashboard logic only
// still need to 
import { ProgressTracker } from "./progress-tracker.js";
import { BehaviourEngine } from "./behaviour-engine.js";
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

document.getElementById("pause-habit-btn")?.addEventListener("click", async (e) => {
  const habitId = e.target.dataset.habitId;
  if (!habitId) return;

  const today = new Date();
  today.setDate(today.getDate() + 7);
  const pauseUntil = today.toISOString().split("T")[0];

  const user = auth.currentUser;
  if (!user) return;

  const habitRef = doc(db, "users", user.uid, "habits", habitId);

  await updateDoc(habitRef, {
    pausedUntil: pauseUntil
  });

  location.reload();
});


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

const frequencySelect = document.getElementById("habit-frequency");
const customDaysContainer = document.getElementById("custom-days-container");

if (frequencySelect && customDaysContainer) {
  frequencySelect.addEventListener("change", () => {
    if (frequencySelect.value === "custom") {
      customDaysContainer.classList.remove("hidden");
    } else {
      customDaysContainer.classList.add("hidden");
    }
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
function shouldShowWeeklyCheckIn() {
  //after testing upcomment me PLEASE
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday

  if (day !== 0) return false;

  const lastShown = localStorage.getItem("lastCheckInShown");
  const todayStr = today.toISOString().split("T")[0];

  if (lastShown === todayStr) return false;

  return true;
}

function showCheckInPopup(riskProfile) {
  const previousOverload = localStorage.getItem("previousOverload") === "true";
  if (previousOverload && !riskProfile.overload) {
  message = "Nice adjustment. Your workload is now balanced.";
}
  let message;
  if (riskProfile.burnout) {
  message = "It looks like you've disengaged recently. Start small and rebuild momentum.";
  }
  else if (riskProfile.overload && riskProfile.lowestHabit) {
  message = `You're overloaded. Consider pausing: ${riskProfile.lowestHabit.name}.`;
  } 
  else if (riskProfile.lowConsistency) {
    message = "Your consistency dropped this week. Focus on completing just one habit daily.";
  } 
  else if (riskProfile.difficultyMismatch) {
    message = "Some habits may be too difficult right now. Try simplifying one.";
  } 
  else {
    message = "Great job this week. You're building steady consistency.";
  }

  const modal = document.getElementById("checkin-modal");
  const messageEl = document.getElementById("checkin-message");

  messageEl.textContent = message;
  modal.classList.remove("hidden");

  localStorage.setItem("previousOverload", riskProfile.overload);

  const todayStr = new Date().toISOString().split("T")[0];
  localStorage.setItem("lastCheckInShown", todayStr);

  const pauseBtn = document.getElementById("pause-habit-btn");

  if (riskProfile.overload && riskProfile.lowestHabit) {
    pauseBtn.classList.remove("hidden");
    pauseBtn.dataset.habitId = riskProfile.lowestHabit.id;
  } else {
    pauseBtn.classList.add("hidden");
  }
}

  

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

const behaviour = new BehaviourEngine(allHabits);
// testing - debugging purposes
console.log("Highest Habit:", behaviour.getHighestPerformingHabit());

const riskProfile = behaviour.generateRiskProfile();
const reinforcement = behaviour.generateReinforcementProfile();
const achievements = behaviour.generateAchievementProfile();

if (shouldShowWeeklyCheckIn()) {
  showCheckInPopup(riskProfile);
}
//just checking - for debugging purposes
console.log("Risk Profile:", riskProfile);

  // IMPORTANT — always calculate from all habits
  //updateProgressStats(allHabits);

 const tracker = new ProgressTracker(allHabits);
 const streak = tracker.calculateStreak();

  document.getElementById("current-streak").textContent = streak;
  document.getElementById("streak-message").textContent = tracker.getStreakMessage(streak);
  
  const insight = tracker.detectStreakRisk();
  if (insight) {
  showBehaviourMessage(insight.message);
}
  const dailyStats = tracker.calculateDailyProgress();

  document.getElementById("completed-count").textContent = dailyStats.completed;
  document.getElementById("total-count").textContent = dailyStats.total;
  document.getElementById("goal-progress").style.width = `${dailyStats.percentage}%`; 

const aiInsightContainer = document.getElementById("ai-insight");
const aiCard = document.querySelector(".ai-insight-card");

aiCard.classList.remove("momentum", "strong");

if (achievements.length > 0) {
  aiInsightContainer.textContent = achievements[0].message;
  aiCard.classList.add("strong");
}
else if (reinforcement.strongConsistency) {
  aiInsightContainer.textContent =
    "🏆 Outstanding consistency this week. You're building real discipline.";
  aiCard.classList.add("strong");
}
else if (reinforcement.momentum) {
  aiInsightContainer.textContent =
    "📈 You're improving compared to last week. Keep building that momentum.";
  aiCard.classList.add("momentum");
}
else if (riskProfile.lowConsistency) {
  aiInsightContainer.textContent =
    "⚠️ Try focusing on completing just one habit per day.";
}
else {
  aiInsightContainer.textContent =
    "You're building consistency. Keep going!";
}
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
    //figure out why this isnt  popping up when new users or first-time users set up an account
    // CURRENTLY ISNT WORKING AS OF 2/March/26
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
const today = new Date().toISOString().split("T")[0];
const isPaused = habitData.pausedUntil && habitData.pausedUntil >= today;

  const habitCard = document.createElement("div");
  habitCard.classList.add("habit-card");
  if (isPaused) 
    {
      habitCard.classList.add("paused");
    }
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
    if (isPaused) {
    const pausedBadge = document.createElement("span");
    pausedBadge.classList.add("paused-badge");
    pausedBadge.textContent = `⏸ Paused until ${habitData.pausedUntil}`;
    metaRow.appendChild(pausedBadge);
  }

  leftSection.appendChild(metaRow);

  // ===== RIGHT SECTION =====
  const rightSection = document.createElement("div");
  rightSection.classList.add("habit-right");

  // Completion circle
  const completeCircle = document.createElement("div");
  completeCircle.classList.add("complete-circle");

  //const today = new Date().toISOString().split("T")[0];
  const completions = habitData.completions || {};
  //const isPaused = habitData.pausedUntil && habitData.pausedUntil >= today;



  // Check if already completed today
  if (completions[today]) {
    completeCircle.classList.add("completed");
  }

  // ===== COMPLETION CLICK HANDLER =====
completeCircle.addEventListener("click", async (e) => {
  if (isPaused) return;
  e.stopPropagation();

  const habitRef = doc(db, "users", uid, "habits", id);
  const habitSnap = await getDoc(habitRef);
  const habit = habitSnap.data();

  // const today = new Date().toISOString().split("T")[0];
  // const compeletions =

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
        completions: {},
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

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("close-checkin");
  const modal = document.getElementById("checkin-modal");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
});

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
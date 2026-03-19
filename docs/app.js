import { ProgressTracker } from "./progress-tracker.js";
import { BehaviourEngine } from "./behaviour-engine.js";
import { getAIInsight } from "./ai-service.js";
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
  deleteDoc,
  updateDoc
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
const habitList = document.getElementById("habit-list");
const openModalBtn = document.getElementById("open-modal");
const modal = document.getElementById("habit-modal");
const closeModalBtn = document.getElementById("close-modal");
const emptyState = document.getElementById("empty-state");
const toggleAdvancedBtn = document.getElementById("toggle-advanced");
const advancedSection = document.getElementById("advanced-section");
const advancedArrow = document.getElementById("advanced-arrow");

let editingHabitId = null;
// testing purposes - forcing circumstanes
 let currentAiConsent = false; // defalut but will be overwritten by Firestore value

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

  const userData = userSnap.data();
  welcomeEl.textContent = `Welcome, ${userData.name}`;

  currentAiConsent = userData.ai_consent;
  //loadHabits(user.uid,  userData.ai_consent);
  // for testing purpose - forcusing circumstances 
  loadHabits(user.uid, userData.ai_consent);

  if (!userData.tutorialComplete) {
  setTimeout(() => startTutorial(), 1500); 
}
});

// LOAD AND RENDER HABITS
async function loadHabits(uid, aiConsent ) {
 habitList.innerHTML = "";

  const habitsRef = collection(db, "users", uid, "habits");
  const today = new Date().toISOString().split("T")[0];
  const allHabits = [];

  try {
    const snapshot = await getDocs(habitsRef);
    snapshot.forEach((docSnap) => {
      allHabits.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.error("Failed to load habits:", err);
    habitList.innerHTML = "<p>Failed to load habits. Please refresh.</p>";
    return;
  }

  // Behaviour engine
  const behaviour = new BehaviourEngine(allHabits);
  const riskProfile = behaviour.generateRiskProfile();
  const reinforcementProfile = behaviour.generateReinforcementProfile();
  const achievementProfile = behaviour.generateAchievementProfile();

  // Streak + progress
  const tracker = new ProgressTracker(allHabits);
  const streak = tracker.calculateStreak();

  document.getElementById("current-streak").textContent = streak;
  document.getElementById("streak-message").textContent = tracker.getStreakMessage(streak);

  // const insight = tracker.detectStreakRisk();
  // if (insight) {
  //   showBehaviourMessage(insight.message);
  // }

  const dailyStats = tracker.calculateDailyProgress();
  document.getElementById("completed-count").textContent = dailyStats.completed;
  document.getElementById("total-count").textContent = dailyStats.total;
  document.getElementById("goal-progress").style.width = `${dailyStats.percentage}%`;

  // AI insight card 
const aiInsightContainer = document.getElementById("ai-insight");
const aiCard = document.querySelector(".ai-insight-card");

aiCard.classList.remove("momentum", "strong");
aiInsightContainer.textContent = "Generating insight...";

const user = auth.currentUser;
const userSnap2 = await getDoc(doc(db, "users", user.uid));
const previousFeedback = userSnap2.data()?.lastInsightFeedback || null;

const result = await getAIInsight(riskProfile, reinforcementProfile, achievementProfile, aiConsent, null, previousFeedback);

aiInsightContainer.textContent = result.insight;

if (reinforcementProfile.strongConsistency || achievementProfile.length > 0) {
  aiCard.classList.add("strong");
} else if (reinforcementProfile.momentum) {
  aiCard.classList.add("momentum");
}

initInsightFeedback();

  // Weekly calendar
  renderWeeklyCalendar(allHabits);

  // Render incomplete habits for today
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
    emptyState.innerHTML = `<p>Why not add your first habit?</p>`;
  } else {
    emptyState.classList.add("hidden");
  }
}

// WEEKLY CALENDAR
function renderWeeklyCalendar(habits) {
  const container = document.getElementById("week-days");
  container.innerHTML = "";

  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);

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
      <div class="day-name">${date.toLocaleDateString("en-GB", { weekday: "short" })}</div>
      <div class="day-indicator"></div>
    `;

    container.appendChild(dayEl);
  }
}
// saving the Human-in-the-loop response
async function saveFeedback(type, insightText) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    await updateDoc(doc(db, "users", user.uid), {
      lastInsightFeedback: {
        type,           // "accepted", "rejected", "edited"
        insight: insightText,
        date: today
      }
    });
  } catch (err) {
    console.error("Failed to save feedback:", err);
  }
}
// RENDER INDIVIDUAL HABIT CARD
function renderHabit(id, habitData, uid) {
  const today = new Date().toISOString().split("T")[0];
  const isPaused = habitData.pausedUntil && habitData.pausedUntil >= today;

  const habitCard = document.createElement("div");
  habitCard.classList.add("habit-card");
  if (isPaused) habitCard.classList.add("paused");

  // Left section
  const leftSection = document.createElement("div");
  leftSection.classList.add("habit-left");

  const titleRow = document.createElement("div");
  titleRow.classList.add("habit-title-row");

  const iconSpan = document.createElement("span");
  iconSpan.classList.add("habit-icon");
  iconSpan.textContent = habitData.category || "📌";
  titleRow.appendChild(iconSpan);

  const title = document.createElement("h3");
  title.textContent = habitData.name;
  titleRow.appendChild(title);
  leftSection.appendChild(titleRow);

  const metaRow = document.createElement("div");
  metaRow.classList.add("habit-meta");

  // Category badge
  if (habitData.category) {
    const categoryNames = {
      "📚": "Study", "💪": "Fitness", "🥗": "Nutrition", "🧘": "Mindfulness",
      "💤": "Sleep", "💧": "Hydration", "📖": "Reading", "✍️": "Writing",
      "🎯": "Goal", "🧹": "Cleaning", "💰": "Finance", "👥": "Social",
      "🎨": "Creative", "⚕️": "Health", "🌱": "Growth"
    };
    const categoryBadge = document.createElement("span");
    categoryBadge.classList.add("category-badge");
    categoryBadge.textContent = categoryNames[habitData.category] || "Other";
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
    const frequencyText = habitData.frequency === "daily" ? "Daily"
      : habitData.frequency === "weekly" ? "Weekly"
      : habitData.frequency;
    frequencyBadge.textContent = `⏰ ${frequencyText}`;
    metaRow.appendChild(frequencyBadge);
  }

  if (habitData.time) {
  const timeBadge = document.createElement("span");
  timeBadge.classList.add("time-badge");
  timeBadge.textContent = `🕐 ${habitData.time}`;
  metaRow.appendChild(timeBadge);
}

  // // Paused badge
  if (isPaused) {
    const pausedBadge = document.createElement("span");
    pausedBadge.classList.add("paused-badge");
    pausedBadge.textContent = `⏸ Paused until ${habitData.pausedUntil}`;
    metaRow.appendChild(pausedBadge);
  }

  leftSection.appendChild(metaRow);

  // Right section
  const rightSection = document.createElement("div");
  rightSection.classList.add("habit-right");

  const completeCircle = document.createElement("div");
  completeCircle.classList.add("complete-circle");

  const completions = habitData.completions || {};
  if (completions[today]) {
    completeCircle.classList.add("completed");
  }

  // Completion click handler
  completeCircle.addEventListener("click", async (e) => {
    if (isPaused) return;
    e.stopPropagation();

    const habitRef = doc(db, "users", uid, "habits", id);
    const habitSnap = await getDoc(habitRef);
    const habit = habitSnap.data();

    if (habit.completions && habit.completions[today]) return;

    try {
      await updateDoc(habitRef, {completions: { ...(habit.completions || {}), [today]: true }});
      await loadHabits(uid, currentAiConsent);
    } catch (err) {
      console.error("Failed to complete habit:", err);
      alert("Could not save completion. Please try again.");
    }
  });

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
    document.getElementById("habit-time").value = habitData.time || "";

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
      try {
        await deleteDoc(doc(db, "users", uid, "habits", id));
        await loadHabits(uid, currentAiConsent);
      } catch (err) {
        console.error("Failed to delete habit:", err);
        alert("Could not delete habit. Please try again.");
      }
    }
  });

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸";
  pauseBtn.classList.add("icon-btn", "pause-btn");
  pauseBtn.title = isPaused ? "Resume habit" : "Pause habit";
  
  pauseBtn.addEventListener("click", async (e) => {
  e.stopPropagation();

  // If already paused, resume it
  if (isPaused) {
    try {
      await updateDoc(doc(db, "users", uid, "habits", id), {
        pausedUntil: null
      });
      await loadHabits(uid, currentAiConsent);
    } catch (err) {
      console.error("Failed to resume habit:", err);
      alert("Could not resume habit. Please try again.");
    }
    return;
  }

  // Remove any existing dropdown first
  const existing = document.getElementById("pause-dropdown");
  if (existing) existing.remove();

  // Build dropdown
  const dropdown = document.createElement("div");
  dropdown.id = "pause-dropdown";
  dropdown.classList.add("pause-dropdown");
  dropdown.innerHTML = `
    <p class="pause-dropdown-title">Pause for how long?</p>
    <button class="pause-option" data-days="7">7 days</button>
    <button class="pause-option" data-days="14">14 days</button>
    <button class="pause-option" data-days="30">30 days</button>
    <button class="pause-cancel">Cancel</button>
  `;

  // Position it near the button
  pauseBtn.parentElement.appendChild(dropdown);

  // Option click handler
  dropdown.querySelectorAll(".pause-option").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const days = parseInt(btn.dataset.days);
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + days);
      const pauseUntilStr = pauseUntil.toISOString().split("T")[0];

      dropdown.remove();

      try {
        await updateDoc(doc(db, "users", uid, "habits", id), {
          pausedUntil: pauseUntilStr
        });
        await loadHabits(uid, currentAiConsent);
      } catch (err) {
        console.error("Failed to pause habit:", err);
        alert("Could not pause habit. Please try again.");
      }
    });
  });

  // Cancel button
  dropdown.querySelector(".pause-cancel").addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.remove();
  });

  // Close if user clicks outside
  setTimeout(() => {
    document.addEventListener("click", function handler() {
      dropdown.remove();
      document.removeEventListener("click", handler);
    });
  }, 0);
});

  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(pauseBtn);
  buttonContainer.appendChild(delBtn);

  rightSection.appendChild(completeCircle);
  rightSection.appendChild(buttonContainer);

  habitCard.appendChild(leftSection);
  habitCard.appendChild(rightSection);
  habitList.appendChild(habitCard);
}

// SAVE HABIT (create or update)
const saveHabitBtn = document.getElementById("save-habit");
const modalHabitInput = document.getElementById("modal-habit-name");

if (saveHabitBtn) {
  saveHabitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const habitName = modalHabitInput.value.trim();
    if (!habitName) return;
    try{
    if (editingHabitId) {
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
          time: document.getElementById("habit-time").value || null
        }
      );
      editingHabitId = null;
      await loadHabits(user.uid, currentAiConsent);

    } else {
      await addDoc(collection(db, "users", user.uid, "habits"), {
        name: habitName,
        frequency: document.getElementById("habit-frequency").value,
        difficulty: document.getElementById("habit-difficulty").value,
        impact: document.getElementById("habit-impact").value || null,
        motivation: document.getElementById("habit-motivation").value || null,
        category: document.getElementById("habit-category").value,
        time: document.getElementById("habit-time").value || null,
        completions: {},
        createdAt: new Date()
      });

      await loadHabits(user.uid, currentAiConsent);
    }

    modalHabitInput.value = "";
    modal.classList.add("hidden");
    emptyState.classList.add("hidden");
  }catch(error){
    console.error("Failed to save habit:", error);
    alert("Could not save habit. Please try again");
  }
});
}

// MODAL CONTROLS
const cancelBtn = document.getElementById("cancel-habit");

if (openModalBtn) {
  openModalBtn.addEventListener("click", () => modal.classList.remove("hidden"));
}
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
}
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

function initInsightFeedback() {
    const feedbackDiv = document.getElementById('insight-feedback');
    const acceptBtn = document.getElementById('insight-accept');
    const rejectBtn = document.getElementById('insight-reject');
    const thanksMsg = document.getElementById('feedback-thanks');

    // Reset state each time it's called
    thanksMsg.classList.add('hidden');
    acceptBtn.disabled = false;
    rejectBtn.disabled = false;
    acceptBtn.style.opacity = '1';
    rejectBtn.style.opacity = '1';

    // Show buttons immediately since insight is already loaded
    feedbackDiv.classList.remove('hidden');

    // Remove old listeners by cloning buttons
    const newAccept = acceptBtn.cloneNode(true);
    const newReject = rejectBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAccept, acceptBtn);
    rejectBtn.parentNode.replaceChild(newReject, rejectBtn);

    newAccept.addEventListener('click', () => {
        const insight = document.getElementById('ai-insight').innerText;
        saveFeedback('accepted', insight);
        thanksMsg.classList.remove('hidden');
        newAccept.disabled = true;
        newReject.disabled = true;
        newAccept.style.opacity = '0.5';
        newReject.style.opacity = '0.5';
    });

    newReject.addEventListener('click', () => {
        const insight = document.getElementById('ai-insight').innerText;
        saveFeedback('rejected', insight);
        thanksMsg.classList.remove('hidden');
        newAccept.disabled = true;
        newReject.disabled = true;
        newAccept.style.opacity = '0.5';
        newReject.style.opacity = '0.5';
    });

    const editBtn = document.getElementById('insight-edit');
const editContainer = document.getElementById('edit-container');
const editTextarea = document.getElementById('insight-edit-text');
const saveEditBtn = document.getElementById('insight-save-edit');

const newEditBtn = editBtn.cloneNode(true);
editBtn.parentNode.replaceChild(newEditBtn, editBtn);

newEditBtn.addEventListener('click', () => {
    const currentInsight = document.getElementById('ai-insight').innerText;
    editTextarea.value = currentInsight;
    editContainer.classList.remove('hidden');
    newEditBtn.disabled = true;
    newEditBtn.style.opacity = '0.5';
});

saveEditBtn.addEventListener('click', () => {
    const editedInsight = editTextarea.value.trim();
    if (!editedInsight) return;
    document.getElementById('ai-insight').innerText = editedInsight;
    saveFeedback('edited', editedInsight);
    editContainer.classList.add('hidden');
    thanksMsg.classList.remove('hidden');
    newAccept.disabled = true;
    newReject.disabled = true;
    newEditBtn.disabled = true;
    newAccept.style.opacity = '0.5';
    newReject.style.opacity = '0.5';
});

}

// TUTORIAL
function startTutorial() {
  const steps = [
    {
      target: ".streak-header",
      text: "🔥 This is your streak counter. Complete all your habits every day to keep it growing!",
    },
    {
      target: ".weekly-calendar",
      text: "📅 Your weekly calendar shows how consistent you've been. Green means a full day, yellow means partial.",
    },
    {
      target: ".ai-insight-card",
      text: "🤖 Your AI insight engine analyses your habits and gives you personalised feedback every day.",
    },
    {
      target: "#open-modal",
      text: "➕ Tap this button to add your first habit. Try adding something simple to start!",
    },
    {
      target: "#habit-list",
      text: "✅ Your habits appear here. Tap the circle on any habit to mark it as done for today.",
    },
  ];

  let currentStep = 0;
  const overlay = document.getElementById("tutorial-overlay");
  const tooltip = document.getElementById("tutorial-tooltip");
  const tooltipText = document.getElementById("tutorial-text");
  const nextBtn = document.getElementById("tutorial-next");
  const skipBtn = document.getElementById("tutorial-skip");
  const stepIndicator = document.getElementById("tutorial-step-indicator");

  let highlightedEl = null;

  function showStep(index) {
    // Remove previous highlight
    if (highlightedEl) {
      highlightedEl.classList.remove("tutorial-highlight");
    }

    const step = steps[index];
    const target = document.querySelector(step.target);

    if (!target) {
      endTutorial();
      return;
    }

    // Highlight target
    highlightedEl = target;
    target.classList.add("tutorial-highlight");

    // Update tooltip text
    tooltipText.textContent = step.text;
    stepIndicator.textContent = `${index + 1} of ${steps.length}`;

    // Update button text on last step
    nextBtn.textContent = index === steps.length - 1 ? "Done ✓" : "Next →";

    // Position tooltip near the target
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 140;
    const margin = 16;

    let top = rect.bottom + margin;
    let left = rect.left;

    // Keep tooltip within viewport
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - margin;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - margin;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    overlay.classList.remove("hidden");
    overlay.classList.add("active");
  }

  function endTutorial() {
    overlay.classList.add("hidden");
    overlay.classList.remove("active");
    if (highlightedEl) {
      highlightedEl.classList.remove("tutorial-highlight");
    }

    // Save to Firestore so it never shows again
    const user = auth.currentUser;
    if (user) {
      updateDoc(doc(db, "users", user.uid), { tutorialComplete: true })
        .catch(err => console.error("Failed to save tutorial state:", err));
    }
  }

  nextBtn.addEventListener("click", () => {
    currentStep++;
    if (currentStep >= steps.length) {
      endTutorial();
    } else {
      showStep(currentStep);
    }
  });

  skipBtn.addEventListener("click", endTutorial);

  showStep(0);
}
// LOGOUT
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

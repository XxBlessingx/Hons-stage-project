import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { BehaviourEngine } from "./behaviour-engine.js";

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }//secuirty for unregister user trying to access

 const habits = [];// stores habits 
 try {
    const snapshot = await getDocs(collection(db, "users", user.uid, "habits"));// collects habits from database
    snapshot.forEach(doc => habits.push({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Failed to load progress data:", err);
    document.querySelector(".progress-main").innerHTML = "<p>Failed to load progress. Please refresh.</p>";
    return;
  }// infroming the user that something is wrong 

  const behaviour = new BehaviourEngine(habits);

  renderWeeklyOverview(behaviour);
  renderTrend(behaviour);
  renderMilestones(behaviour);
  renderHabitPerformance(behaviour);
});

// user weekly overview 
function renderWeeklyOverview(behaviour) {
  const risk = behaviour.generateRiskProfile();

  document.getElementById("weekly-rate").textContent =
    `${Math.round(risk.weeklyRate * 100)}%`;

  document.getElementById("risk-level").textContent =
    risk.riskLevel;// risk level

  document.getElementById("highest-habit").textContent =
    risk.highestHabit?.name || "—";// higest risk

  document.getElementById("lowest-habit").textContent =
    risk.lowestHabit?.name || "—";// lowest risk
}
//users trends 
function renderTrend(behaviour) {
  const reinforcement = behaviour.generateReinforcementProfile();

  const diff = Math.round(
    (reinforcement.currentRate - reinforcement.previousRate) * 100
  );

  const trendEl = document.getElementById("trend-direction");
  const diffEl = document.getElementById("trend-difference");

  if (diff > 0) {
    trendEl.textContent = "Improving 📈";
    diffEl.textContent = `+${diff}%`;
  } else if (diff < 0) {
    trendEl.textContent = "Declining 📉";
    diffEl.textContent = `${diff}%`;
  } else {
    trendEl.textContent = "Stable ➖";
    diffEl.textContent = "No change";
  }
  // cheinking and printing out if the user is improving or declining 
  // provide summary
}
// user milestones 
function renderMilestones(behaviour) {
  const achievements = behaviour.generateAchievementProfile();
  const container = document.getElementById("milestone-container");
  container.innerHTML = "";
//prints if milestone is completed
  if (achievements.length === 0) {
    container.innerHTML = "<p>No milestones yet. Keep building!</p>";
    return;
  }

  achievements.forEach(a => {
    const badge = document.createElement("div");
    badge.classList.add("badge");
    badge.textContent = a.message;
    container.appendChild(badge);
  });
}
// checkes for acheveiments 

// user performace 
function renderHabitPerformance(behaviour) {
  const performances = behaviour.getHabitPerformance();
  const container = document.getElementById("habit-performance-container");
  container.innerHTML = "";

  performances.forEach(habit => {
    const percent = Math.round(habit.completionRate * 100);

    const wrapper = document.createElement("div");
    wrapper.classList.add("habit-bar-wrapper");

    wrapper.innerHTML = `
      <div class="habit-bar-label">
        ${habit.name} (${percent}%)
      </div>
      <div class="habit-bar">
        <div class="habit-bar-fill" style="width:${percent}%"></div>
      </div>
    `;

    container.appendChild(wrapper);
  });
}
document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
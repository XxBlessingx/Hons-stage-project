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
const habitsContainer = document.getElementById("all-habits-container");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-habits");
const categoryFilter = document.getElementById("category-filter");
const logoutBtn = document.getElementById("logout");
const openModalBtn = document.getElementById("open-modal");
const modal = document.getElementById("habit-modal");
const closeModalBtn = document.getElementById("close-modal");
const saveHabitBtn = document.getElementById("save-habit");
const cancelBtn = document.getElementById("cancel-habit");
const modalHabitInput = document.getElementById("modal-habit-name");
const toggleAdvancedBtn = document.getElementById("toggle-advanced");
const advancedSection = document.getElementById("advanced-section");
const advancedArrow = document.getElementById("advanced-arrow");

let allHabits = [];
let currentUser = null;
let editingHabitId = null;

// Advanced Toggle
if (toggleAdvancedBtn) {
  toggleAdvancedBtn.addEventListener("click", () => {
    advancedSection.classList.toggle("open");
    advancedArrow.classList.toggle("rotate");
  });
}

// Auth Guard
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists() || !userSnap.data().onboardingComplete) {
    window.location.href = "onboarding.html";
    return;
  }

  loadAllHabits(user.uid);
});

// Load ALL habits (no date filtering)
async function loadAllHabits(uid) {
  habitsContainer.innerHTML = "";
  
  const habitsRef = collection(db, "users", uid, "habits");
  const snapshot = await getDocs(habitsRef);
  
  if (snapshot.empty) {
    emptyState.classList.remove("hidden");
    return;
  }
  
  emptyState.classList.add("hidden");
  allHabits = [];
  
  snapshot.forEach((docSnap) => {
    const habitData = {
      id: docSnap.id,
      ...docSnap.data()
    };
    allHabits.push(habitData);
    renderHabit(habitData, uid);
  });
}

// Render a single habit for All Habits page
function renderHabit(habitData, uid) {
  const habitCard = document.createElement("div");
  habitCard.classList.add("habit-card", "all-habits-card");
  habitCard.dataset.id = habitData.id;
  habitCard.dataset.category = habitData.category || "📌";
  habitCard.dataset.name = habitData.name.toLowerCase();

  // Left section with icon and details
  const leftSection = document.createElement("div");
  leftSection.classList.add("habit-left");

  // Title row with icon
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

  // Meta row (category, difficulty, frequency)
  const metaRow = document.createElement("div");
  metaRow.classList.add("habit-meta");

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
    categoryBadge.textContent = `${habitData.category} ${categoryName}`;
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
    frequencyBadge.textContent = `⏰ ${habitData.frequency}`;
    metaRow.appendChild(frequencyBadge);
  }

  leftSection.appendChild(metaRow);

  // Right section with completion stats and buttons
  const rightSection = document.createElement("div");
  rightSection.classList.add("habit-right");

  // Completion stats
  const completions = habitData.completions || {};
  const totalCompletions = Object.keys(completions).length;
  
  const statsSpan = document.createElement("span");
  statsSpan.classList.add("completion-stats");
  statsSpan.textContent = `✅ ${totalCompletions} times`;
  rightSection.appendChild(statsSpan);

  // Button container
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("button-container");

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.textContent = "✎";
  editBtn.classList.add("icon-btn", "edit-btn");
  editBtn.title = "Edit habit";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(habitData);
  });

  // Delete button
  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑";
  delBtn.classList.add("icon-btn", "delete-btn");
  delBtn.title = "Delete habit";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteHabit(habitData.id, uid, habitCard);
  });

  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(delBtn);
  rightSection.appendChild(buttonContainer);

  habitCard.appendChild(leftSection);
  habitCard.appendChild(rightSection);
  habitsContainer.appendChild(habitCard);
}

// Filter habits based on search and category
function filterHabits() {
  const searchTerm = searchInput.value.toLowerCase();
  const category = categoryFilter.value;
  
  const cards = document.querySelectorAll('.habit-card');
  
  cards.forEach(card => {
    const name = card.dataset.name;
    const cardCategory = card.dataset.category;
    
    const matchesSearch = name.includes(searchTerm);
    const matchesCategory = category === 'all' || cardCategory === category;
    
    if (matchesSearch && matchesCategory) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// Event listeners for filters
searchInput.addEventListener('input', filterHabits);
categoryFilter.addEventListener('change', filterHabits);

// Delete habit function
async function deleteHabit(habitId, uid, cardElement) {
  if (confirm("Are you sure you want to delete this habit?")) {
    await deleteDoc(doc(db, "users", uid, "habits", habitId));
    cardElement.remove();
    
    if (habitsContainer.children.length === 0) {
      emptyState.classList.remove("hidden");
    }
  }
}

// Open edit modal
function openEditModal(habitData) {
  document.getElementById("modal-habit-name").value = habitData.name;
  document.getElementById("habit-frequency").value = habitData.frequency || "daily";
  document.getElementById("habit-difficulty").value = habitData.difficulty || "medium";
  document.getElementById("habit-direction").value = habitData.direction || "build";
  document.getElementById("habit-category").value = habitData.category || "📚";
  document.getElementById("habit-impact").value = habitData.impact || "medium";
  document.getElementById("habit-motivation").value = habitData.motivation || "";

  editingHabitId = habitData.id;
  modal.classList.remove("hidden");
}

// Save habit (create or update)
if (saveHabitBtn) {
  saveHabitBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const habitName = modalHabitInput.value.trim();
    if (!habitName) return;

    const habitData = {
      name: habitName,
      frequency: document.getElementById("habit-frequency").value,
      difficulty: document.getElementById("habit-difficulty").value,
      direction: document.getElementById("habit-direction").value,
      category: document.getElementById("habit-category").value,
      impact: document.getElementById("habit-impact").value || null,
      motivation: document.getElementById("habit-motivation").value || null
    };

    if (editingHabitId) {
      // Update existing habit
      await updateDoc(
        doc(db, "users", currentUser.uid, "habits", editingHabitId),
        habitData
      );
      editingHabitId = null;
    } else {
      // Create new habit
      habitData.completions = {};
      habitData.createdAt = new Date();
      
      await addDoc(
        collection(db, "users", currentUser.uid, "habits"),
        habitData
      );
    }

    // Reset and reload
    modalHabitInput.value = "";
    modal.classList.add("hidden");
    loadAllHabits(currentUser.uid);
  });
}

// Modal controls
if (openModalBtn) {
  openModalBtn.addEventListener("click", () => {
    editingHabitId = null;
    modalHabitInput.value = "";
    document.getElementById("habit-frequency").value = "daily";
    document.getElementById("habit-difficulty").value = "medium";
    document.getElementById("habit-direction").value = "build";
    document.getElementById("habit-category").value = "📚";
    document.getElementById("habit-impact").value = "medium";
    document.getElementById("habit-motivation").value = "";
    modal.classList.remove("hidden");
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
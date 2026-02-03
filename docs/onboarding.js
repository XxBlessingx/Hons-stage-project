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

  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      console.log("Onboarding complete:", onboardingData);
      window.location.href = "dashboard.html";
    });
  }
});

const steps = document.querySelectorAll(".step");
let currentStep = 0;

const onboardingData = {};

function showStep(index) {
  steps.forEach(step => step.classList.remove("active"));
  steps[index].classList.add("active");
}

steps.forEach((step, index) => {
  const key = step.dataset.key;
  const nextBtn = step.querySelector(".next") || step.querySelector("#finish");

  const optionButtons = step.querySelectorAll("button[data-value]");

  optionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // stores the users answer
      onboardingData[key] = btn.dataset.value;

      //used for the visual feedback
      optionButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      // enable next / finish
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  if (nextBtn && nextBtn.id !== "finish") {
    nextBtn.addEventListener("click", () => {
      currentStep++;
      showStep(currentStep);
    });
  }
});


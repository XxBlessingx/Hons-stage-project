// Select ALL onboarding steps (each question is one step)
const steps = document.querySelectorAll(".step");

// Keeps track of which question  the user is  on
let currentStep = 0;

//  store all onboarding answers
// Each answer is saved using the step's data-key
const onboardingData = {};

// Function to show ONE step at a time
function showStep(index) {
  // Hide all the other questions showing 1 question at a time
  steps.forEach(step => step.classList.remove("active"));

  // shows 1 question at a time
  steps[index].classList.add("active");
}

// Loop through each onboarding step
steps.forEach((step) => {

  // Read the unique key for this step (e.g. "consistency", "barrier")
  const key = step.dataset.key;

  // Get the "Next" button (exists on most steps)
  const nextBtn = step.querySelector(".next");

  // Get the "Finish" button (exists only on the last step)
  const finishBtn = step.querySelector("#finish");

  // Get all answer buttons for this step
  const optionButtons = step.querySelectorAll("button[data-value]");

  // For each answer button (e.g. Studying / Health / Routine)
  optionButtons.forEach(btn => {
    btn.addEventListener("click", () => {

      // is what stores the   answer from onboardingData provided by the user
      onboardingData[key] = btn.dataset.value;

      // Remove highlight from all buttons in this step
      optionButtons.forEach(b => b.classList.remove("selected"));

      // Highlight the selected button
      btn.classList.add("selected");

      // Enable the "Next" button if it exists for the next question
      if (nextBtn) nextBtn.disabled = false;

      // Enable the "Finish" button if this is the final step for the last question
      if (finishBtn) finishBtn.disabled = false;
    });
  });

  // handeles the next function  "Next" so is the function that controls the button
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      // Move to the next step
      currentStep++;

      // Show the next step
      showStep(currentStep);
    });
  }
});



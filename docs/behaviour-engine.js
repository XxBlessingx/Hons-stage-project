export class BehaviourEngine {
  constructor(habits) {
    this.habits = habits;
    this.today = new Date();
  }

  getLastNDates(n) {
    const dates = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(this.today.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }

  calculateWeeklyCompletionRate() {
    const last7 = this.getLastNDates(7);
    let totalExpected = 0;
    let totalCompleted = 0;

    this.habits.forEach(habit => {
      if (habit.frequency === "daily") {
        totalExpected += 7;
      } else if (habit.frequency === "weekly") {
        totalExpected += 1;
      }

      last7.forEach(date => {
        if (habit.completions && habit.completions[date]) {
          totalCompleted++;
        }
      });
    });

    if (totalExpected === 0) return 0;

    return totalCompleted / totalExpected;
  }

  detectOverload() {
    const dailyHabits = this.habits.filter(h => h.frequency === "daily");
    const completionRate = this.calculateWeeklyCompletionRate();

    return dailyHabits.length > 5 && completionRate < 0.5;
  }

  detectDifficultyMismatch() {
    const hardHabits = this.habits.filter(
      h => h.difficulty?.toLowerCase() === "hard"
    );

    const hardRatio = hardHabits.length / this.habits.length;
    const completionRate = this.calculateWeeklyCompletionRate();

    return hardRatio > 0.6 && completionRate < 0.6;
  }

 generateRiskProfile() {
  const weeklyRate = this.calculateWeeklyCompletionRate();

  const dailyHabits = this.habits.filter(h => h.frequency === "daily");
  const hardHabits = this.habits.filter(
    h => h.difficulty?.toLowerCase() === "hard"
  );

  const hardRatio = this.habits.length === 0 
    ? 0 
    : hardHabits.length / this.habits.length;

  const overload = dailyHabits.length > 5 && weeklyRate < 0.5;
  const difficultyMismatch = hardRatio > 0.6 && weeklyRate < 0.6;
  const burnout = this.detectBurnout();

  return {
    weeklyRate,
    overload,
    difficultyMismatch,
    burnout,
    lowConsistency: weeklyRate < 0.4
  };

  
}
detectBurnout() {
  const last3 = this.getLastNDates(3);
  let missedDays = 0;

  last3.forEach(date => {
    const anyCompleted = this.habits.some(habit =>
      habit.completions && habit.completions[date]
    );

    if (!anyCompleted) {
      missedDays++;
    }
  });
// testing 
console.log("Checking burnout for dates:", last3);
  return missedDays === 3;

  // testing
  
}
}
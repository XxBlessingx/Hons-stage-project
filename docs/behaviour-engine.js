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

  calculateHabitStreak(habit) {
  let streak = 0;
  let date = new Date();

  while (true) {
    const dateStr = date.toISOString().split("T")[0];

    if (habit.completions && habit.completions[dateStr]) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
  getPreviousWeekCompletionRate() {
  const dates = [];
  for (let i = 7; i < 14; i++) {
    const d = new Date();
    d.setDate(this.today.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let totalExpected = 0;
  let totalCompleted = 0;

  this.habits.forEach(habit => {
    if (habit.frequency === "daily") {
      totalExpected += 7;
    }

    dates.forEach(date => {
      if (habit.completions && habit.completions[date]) {
        totalCompleted++;
      }
    });
  });

  if (totalExpected === 0) return 0;

  return totalCompleted / totalExpected;
}

generateReinforcementProfile() {
  const currentRate = this.calculateWeeklyCompletionRate();
  const previousRate = this.getPreviousWeekCompletionRate();

  let momentum = false;
  let strongConsistency = false;

  if (currentRate > previousRate + 0.1) {
    momentum = true;
  }

  if (currentRate >= 0.7) {
    strongConsistency = true;
  }

  return {
    momentum,
    strongConsistency,
    currentRate,
    previousRate
  };
}

generateAchievementProfile() {
  const weeklyRate = this.calculateWeeklyCompletionRate();
  const achievements = [];

  // Weekly performance milestone
  if (weeklyRate >= 0.7) {
    achievements.push({
      type: "consistency",
      message: "🏆 70%+ weekly completion. Strong discipline."
    });
  }

  if (weeklyRate === 1) {
    achievements.push({
      type: "perfectWeek",
      message: "🔥 Perfect week. Elite focus."
    });
  }

  
  this.habits.forEach(habit => {
    const streak = this.calculateHabitStreak(habit);

    if (streak === 3) {
      achievements.push({
        type: "streak3",
        message: `🌱 ${habit.name}: 3-day streak started.`
      });
    }

    if (streak === 7) {
      achievements.push({
        type: "streak7",
        message: `🚀 ${habit.name}: 7-day streak. Momentum building.`
      });
    }
  });

  return achievements;
}

getHighestPerformingHabit() {
  const performances = this.getHabitPerformance();

  if (performances.length === 0) return null;

  const frequencyWeight = {
    daily: 1.2,
    weekly: 1.0,
    custom: 0.9
  };

  const difficultyWeight = {
    hard: 1.3,
    medium: 1.1,
    easy: 1.0
  };

  return performances.reduce((highest, current) => {
    const currentScore =
      current.completionRate *
      (frequencyWeight[current.frequency] || 1) *
      (difficultyWeight[current.difficulty] || 1);

    const highestScore =
      highest.completionRate *
      (frequencyWeight[highest.frequency] || 1) *
      (difficultyWeight[highest.difficulty] || 1);

    return currentScore > highestScore ? current : highest;
  });
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

    return missedDays === 3;
  }
getHabitPerformance() {
  const last7 = this.getLastNDates(7);

  return this.habits.map(habit => {
    let completed = 0;

    last7.forEach(date => {
      if (habit.completions && habit.completions[date]) {
        completed++;
      }
    });

    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      difficulty: habit.difficulty,
      completionRate: completed / 7
    };
  });
}

  getLowestPerformingHabit() {
    const performances = this.getHabitPerformance();
    if (performances.length === 0) return null;

    return performances.reduce((lowest, current) =>
      current.completionRate < lowest.completionRate ? current : lowest
    );
  }

  getLowestDailyHabit() {
  const performances = this.getHabitPerformance()
    .filter(h => h.frequency === "daily");

  if (performances.length === 0) return null;

  return performances.reduce((lowest, current) =>
    current.completionRate < lowest.completionRate ? current : lowest
  );
}

  generateRiskProfile() {
  const weeklyRate = this.calculateWeeklyCompletionRate();

  const todayStr = new Date().toISOString().split("T")[0];

  const dailyHabits = this.habits.filter(h => 
    h.frequency === "daily" &&
    (!h.pausedUntil || h.pausedUntil < todayStr)
  );

  const hardHabits = this.habits.filter(
    h => h.difficulty?.toLowerCase() === "hard"
  );

  const hardRatio = this.habits.length === 0
    ? 0
    : hardHabits.length / this.habits.length;

     // for checking - debugging line
  //console.log("Daily habit count:", dailyHabits.length);
  let riskScore = 0;

// Burnout is serious
if (this.detectBurnout()) riskScore += 40;

// Overload is structural strain
if (dailyHabits.length > 5 && weeklyRate < 0.5) riskScore += 25;

// Low consistency
if (weeklyRate < 0.4) riskScore += 20;

// Difficulty mismatch
if (hardRatio > 0.6 && weeklyRate < 0.6) riskScore += 15;

// Cap score at 100
riskScore = Math.min(riskScore, 100);

let riskLevel = "Low";

if (riskScore >= 60) riskLevel = "High";
else if (riskScore >= 30) riskLevel = "Moderate";

  return {
    weeklyRate,
    // uncomment me after testing 
     overload: dailyHabits.length > 5 && weeklyRate < 0.5,
    // overload: dailyHabits.length > 1,// comment me when not testing
    difficultyMismatch: hardRatio > 0.6 && weeklyRate < 0.6,
    burnout: this.detectBurnout(),
    lowConsistency: weeklyRate < 0.4,
    lowestHabit: this.getLowestDailyHabit(),
    riskScore,
    riskLevel
  };

 
}
}
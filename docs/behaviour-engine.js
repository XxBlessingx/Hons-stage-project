export class BehaviourEngine {
  constructor(habits) {
    this.habits = habits;
    this.today = new Date();
  }
// collects user data from the past 7 days 
  getLastNDates(n) {
    const dates = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(this.today.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }
  // and collects user data
//calcutes how many for the habits set by the users have been completed
  calculateWeeklyCompletionRate() {
  const last7 = this.getLastNDates(7);
  let totalExpected = 0;
  let totalCompleted = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  this.habits.forEach(habit => {
    const isPaused =
      habit.pausedUntil && habit.pausedUntil >= todayStr;

    if (isPaused) return; // for habits that have been pauses it doesnt count it within its calutations 

    // checks the fequency of your daily habits 
    if (habit.frequency === "daily") {
      totalExpected += 7;

      last7.forEach(date => {
        if (habit.completions && habit.completions[date]) {
          totalCompleted++;
        }
      });
    }

    // checkes the habits for weekly progress
    else if (habit.frequency === "weekly") {
      totalExpected += 1;

      const completedThisWeek = last7.some(date =>
        habit.completions && habit.completions[date]
      );

      if (completedThisWeek) {
        totalCompleted += 1;
      }
    }
  });

  if (totalExpected === 0) return 0;

  return totalCompleted / totalExpected;
}
// calcluating for based of a habit at a time 
 calculateHabitStreak(habit) {
  let streak = 0;
  let date = new Date();
  date.setDate(date.getDate() - 1); // starting from yesterday

  while (true) {
    const dateStr = date.toISOString().split("T")[0];
    if (habit.completions && habit.completions[dateStr]) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
// uses this to calculate weather a day has been completed or not 
  return streak;
}
  getPreviousWeekCompletionRate() {// calculating streak from previous weeks 
  const dates = [];
  for (let i = 7; i < 14; i++) {
    const d = new Date();
    d.setDate(this.today.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }// rates progress the week before comparing if there has been improvemet or not 
  // caluclating based off trend and momentum freautres

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
  });// all is used for the ai insights 

  if (totalExpected === 0) return 0;

  return totalCompleted / totalExpected;
}// if momentum is high shows improvement
//builds profile and used to check if the user is improving or not 



generateReinforcementProfile() {
  const currentRate = this.calculateWeeklyCompletionRate();
  const previousRate = this.getPreviousWeekCompletionRate();

  let momentum = false;
  let strongConsistency = false;

  if (currentRate > previousRate + 0.1) {
    momentum = true;// compares from last week to this week if checks if it any better by 10%
  }

  if (currentRate >= 0.7) {
    strongConsistency = true;
  }// if consistance is over 70 % it show high and stong consistance
// checks for weather the user is improvement 
  return {
    momentum,
    strongConsistency,
    currentRate,
    previousRate
  };
}// used for the insights 

generateAchievementProfile() {
  const weeklyRate = this.calculateWeeklyCompletionRate(); 
  

  const achievements = [];// checks for achievements over the week 

  
  if (weeklyRate >= 0.7) {// checks progress ove 7 day period 
    achievements.push({
      type: "consistency",
      message: " 70%+ weekly completion. Strong discipline."// if acheived then tell user through consistancy 
    });// progress badges 
  }

  if (weeklyRate >= 0.99) {
    achievements.push({
      type: "perfectWeek",
      message: "Perfect week. Elite focus."// for when its a 7 day streak and all habits are completed
    });
  }// progress bagde for a perferct week 

  
  this.habits.forEach(habit => {
    const streak = this.calculateHabitStreak(habit);

    if (streak === 3) {
      achievements.push({
        type: "streak3",
        message: ` ${habit.name}: 3-day streak started.`// used for indivdual habits over 3 days 
      });// progress for 3 days 
    }

    if (streak === 7) {// if progess is a 7 day streak for a habit 
      achievements.push({
        type: "streak7",
        message: ` ${habit.name}: 7-day streak. Momentum building.`
      });
    }
  }); 

  return achievements;
}// calcutes best performing habit over this week 

getHighestPerformingHabit() {
  const performances = this.getHabitPerformance();

  if (performances.length === 0) return null;

  const frequencyWeight = {// harder  and more frequency habit = higher score
    daily: 1.2,
    weekly: 1.0,
    custom: 0.9
  };

  const difficultyWeight = {
    hard: 1.3,// high difficulty
    medium: 1.1,// medium difficulty 
    easy: 1.0//  easy and no difficuly 
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
  

  detectBurnout() {// checks if the the users hasnt done any habits 
    const last3 = this.getLastNDates(3);
    let missedDays = 0;// checks for missed days 

    last3.forEach(date => {
      const anyCompleted = this.habits.some(habit =>
        habit.completions && habit.completions[date]// checking for how many days the user has missed
      );

      if (!anyCompleted) {
        missedDays++;// counts how many days missed 
      }
    });

    return missedDays === 3;// burnout = if its been 3 days or more
  }
getHabitPerformance() {
  const last7 = this.getLastNDates(7);// goes each habit and its completion rate over 7 days 

  return this.habits.map(habit => {
    let completed = 0;

    last7.forEach(date => {
      if (habit.completions && habit.completions[date]) {
        completed++;// checking each habit over a week
      }
    });

    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      difficulty: habit.difficulty,
      completionRate: completed / 7
    };
  });// gives an array that is used for highestperforminghabit and lowest daily
}

  getLowestPerformingHabit() {//overall lowest habit 
    const performances = this.getHabitPerformance();
    if (performances.length === 0) return null;

    return performances.reduce((lowest, current) =>
      current.completionRate < lowest.completionRate ? current : lowest
    );
  }

  getLowestDailyHabit() {
  const performances = this.getHabitPerformance()
    .filter(h => h.frequency === "daily");// lowest daliy habit 
// used as part of risk profile and overloaded
  if (performances.length === 0) return null;

  return performances.reduce((lowest, current) =>
    current.completionRate < lowest.completionRate ? current : lowest
  );
}

  generateRiskProfile() {// collectes everything for thr risk profile and send to Claude
  const weeklyRate = this.calculateWeeklyCompletionRate();

  const todayStr = new Date().toISOString().split("T")[0];

  const dailyHabits = this.habits.filter(h => 
    h.frequency === "daily" &&
    (!h.pausedUntil || h.pausedUntil < todayStr)
  );// do not include paused habits 

  const hardHabits = this.habits.filter(
    h => h.difficulty?.toLowerCase() === "hard"
  );
//displays on user profile and profle pages 
  const hardRatio = this.habits.length === 0
    ? 0
    : hardHabits.length / this.habits.length;

  
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
     
    overload: dailyHabits.length > 5 && weeklyRate < 0.5,
    difficultyMismatch: hardRatio > 0.6 && weeklyRate < 0.6,
    burnout: this.detectBurnout(),
    lowConsistency: weeklyRate < 0.4,
    lowestHabit: this.getLowestDailyHabit(),
    highestHabit: this.getHighestPerformingHabit(),
    riskScore,
    riskLevel
  };

 
}
}
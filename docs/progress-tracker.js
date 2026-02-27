export class ProgressTracker{
    constructor(habits){
        this.habits = habits;
        this.today= new Date().toISOString().split('T')[0];
    }
    // this will be used to calclute the current streak held by the user
    calculateStreak() {
    // 🔒 Prevent infinite loop if no habits
    if (!this.habits || this.habits.length === 0) {
        return 0;
    }

    let streak = 0;
    let currentDate = new Date();

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let allCompleted = true;

        for (let habit of this.habits) {
            const completions = habit.completions || {};
            if (!completions[dateStr]) {
                allCompleted = false;
                break;
            }
        }

        if (allCompleted) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}
    // calcutaing current days progress
    calculateDailyProgress(){
        const total = this.habits.length;
        let completed = 0;

        this.habits.forEach(habit =>{
            const completions =habit.completions || {};
            if(completions[this.today]){
                completed++;
            }
        });
        return{
            completed,
            total,
            percentage: total > 0 ? (completed/total)*100:0
        };
    }
    // Generate weekly calendar data
  getWeekDays() {
    const weekDays = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    
    // Adjust to Monday (assuming Monday is first day of week)
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = day === 0 ? 6 : day - 1; // If Sunday, go back 6 days to Monday
    startOfWeek.setDate(today.getDate() - diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate completion for this day
      let completedCount = 0;
      this.habits.forEach(habit => {
        const completions = habit.completions || {};
        if (completions[dateStr]) {
          completedCount++;
        }
      });
      
      const total = this.habits.length;
      const percentage = total > 0 ? (completedCount / total) * 100 : 0;
      
      // Determine status based on completion percentage
      let status = 'empty';
      if (percentage === 100) status = 'complete';
      else if (percentage > 0) status = 'partial';
      
      weekDays.push({
        date,
        dateStr,
        dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        status,
        percentage
      });
    }
    
    return weekDays;
  }
  // detectStreakRisk()
  // {
  //   const streak = this.calculateStreak();
  //   const daily = this.calculateDailyProgress();
  //   //debugging
  //   console.log("Streak:", streak);
  //   console.log("Daily:", daily);
  //   if (streak >= 3 && daily.completed < daily.total) {
  //   return {
  //     type: "warning",
  //     title: "Streak at Risk",
  //     message: "You're close to breaking your streak. Complete today's habits to keep it alive."
      
  //   };
  // }
  // return null;
  // }

//   detectStreakRisk() {
//   const daily = this.calculateDailyProgress();

//   // calculate streak ignoring today
//   const originalToday = this.today;
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 1);
//   this.today = yesterday.toISOString().split('T')[0];

//   const streakUntilYesterday = this.calculateStreak();

//   this.today = originalToday;

//   if (streakUntilYesterday >= 3 && daily.completed < daily.total) {
//     return {
//       type: "warning",
//       title: "Streak at Risk",
//       message: "You're close to breaking your streak."
//     };
//   }

//   return null;
// }
// testing 
detectStreakRisk() {
  const daily = this.calculateDailyProgress();

  // Clone habits so we don't mutate original
  const habitsCopy = JSON.parse(JSON.stringify(this.habits));

  let streak = 0;
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1); // START FROM YESTERDAY

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    let allCompleted = true;

    for (let habit of habitsCopy) {
      const completions = habit.completions || {};
      if (!completions[dateStr]) {
        allCompleted = false;
        break;
      }
    }

    if (allCompleted) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (streak >= 3 && daily.completed < daily.total) {
    return {
      type: "warning",
      title: "Streak at Risk",
      message: "You're close to breaking your streak. Complete today to protect it."
    };
  }

  return null;
}

  getBehaviouralInsights(){
    const insight = [];
    const streakRisk = this.detectStreakRisk();
    if(streakRisk) insight.push(streakRisk);

    return insight;
  }

  // Generate streak message based on streak length
  getStreakMessage(streak) {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "🔥 First day! Keep it going!";
    if (streak === 2) return "🔥 2 days! You're building momentum!";
    if (streak === 3) return "🔥 3 days! Great start!";
    if (streak === 4) return "🔥 4 days! You're on a roll!";
    if (streak === 5) return "🔥 5 days! Halfway to a week!";
    if (streak === 6) return "🔥 6 days! One more day!";
    if (streak === 7) return "🎉 ONE WEEK! You're amazing!";
    if (streak === 14) return "🎉 14 DAYS! Two weeks straight!";
    if (streak === 21) return "🎉 21 DAYS! Three weeks of consistency!";
    if (streak === 30) return "🏆 30 DAYS! You've built a habit!";
    if (streak === 50) return "🏆 50 DAYS! Incredible dedication!";
    if (streak === 100) return "💯 100 DAYS! You're a legend!";
    return `🔥 ${streak} day streak! You're on fire!`;
  }

  // Check for milestone unlocks
  checkMilestones(streak) {
    const milestones = [7, 14, 21, 30, 50, 100];
    const unlocked = [];
    
    milestones.forEach(milestone => {
      if (streak >= milestone) {
        unlocked.push(milestone);
      }
    });
    
    return unlocked;
  }
}
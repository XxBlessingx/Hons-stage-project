export class ProgressTracker{
    constructor(habits){
        this.habits = habits;
        this.today= new Date().toISOString().split('T')[0];
    }
    // this will be used to calclute the current streak held by the user
    calculateStreak() {
    // Prevent infinite loop if no habits
    if (!this.habits || this.habits.length === 0) {
        return 0;
    }

    let streak = 0;
    let currentDate = new Date();

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let allCompleted = true;

        for (let habit of this.habits) {
          const isPaused = habit.pausedUntil && habit.pausedUntil >= dateStr;
          if (isPaused) continue; // skip paused habits and continues the streak as normal if the habit is pauased
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
    const activeHabits = this.habits.filter(h => !h.pausedUntil || h.pausedUntil < this.today);
    const total = activeHabits.length;// how many active habits 
    let completed = 0;

    activeHabits.forEach(habit =>{
        const completions = habit.completions || {};
        if(completions[this.today]){
            completed++;// how many completeled habits 
        }
    });
    
        return{
            completed,
            total,
            percentage: total > 0 ? (completed/total)*100:0
        };
    }// send back compeleted habits
    // Generate weekly calendar data
  getWeekDays() {
    const weekDays = [];
    const today = new Date();
    const startOfWeek = new Date(today);// starting from monday 
    
    
    const day = today.getDay(); 
    const diff = day === 0 ? 6 : day - 1; 
    startOfWeek.setDate(today.getDate() - diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate completion for this day
      let completedCount = 0;
      
     const activeHabits = this.habits.filter(h => !h.pausedUntil || h.pausedUntil < dateStr);// doesnt include puase habits in streak

    activeHabits.forEach(habit => {
      const completions = habit.completions || {};
      if (completions[dateStr]) {
        completedCount++;// counts the number of active habits 
      }
    });

const total = activeHabits.length;

      const percentage = total > 0 ? (completedCount / total) * 100 : 0;// calculate percentage of days 
      
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

detectStreakRisk() {
  const daily = this.calculateDailyProgress();
// dectes when user is at risk 
  
  const habitsCopy = JSON.parse(JSON.stringify(this.habits));

  let streak = 0;
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1); // START FROM YESTERDAY

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    let allCompleted = true;

    for (let habit of habitsCopy) {
      const isPaused = habit.pausedUntil && habit.pausedUntil >= dateStr;
      if (isPaused) continue;
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
// warning user that they are at risk
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
  // gamification provides motivational messages 

  // Check for milestone unlocks
  checkMilestones(streak) {
    const milestones = [7, 14, 21, 30, 50, 100]; // different milestones that could be reached by user
    const unlocked = [];
    
    milestones.forEach(milestone => {
      if (streak >= milestone) {
        unlocked.push(milestone);
      }
    });
    
    return unlocked;
  }// if collected is stores and shown on the user progess page

  calculateLongestStreak() {
  if (!this.habits || this.habits.length === 0) return 0;
// checking for the longest streak held
  let longest = 0;
  let current = 0;

  // Collect all completion dates across habits
  const completionDates = new Set();

  this.habits.forEach(habit => {
    const completions = habit.completions || {};
    Object.keys(completions).forEach(date => {
      if (completions[date]) completionDates.add(date);
    });
  });

  const sortedDates = Array.from(completionDates).sort();
// sorting the dates of completed habits 
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]); // based on last week 
      const curr = new Date(sortedDates[i]);// based on this week 

      const diff = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        current++;
      } else {
        current = 1;
      }
    }

    if (current > longest) longest = current;
  }

  return longest;
}


}
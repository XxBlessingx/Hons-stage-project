export class ProgressTracker{
    constructor(habits){
        this.habits = habits;
        this.today= new Date().toISOString().split('T')[0];
    }
    // this will be used to calclute the current streak held by the user
    calculateStreak(){
        let streak = 0;
        let currentDate= new Date();
         while(true){
            const  dateStr = currentDate.toISOString().split('T')[0];
            let allCompleted = true;

            this.habits.forEach(habit => {
                const completions = habit.completions || {};
                if(!completions[dateStr]){
                    allCompleted = false;
                }
            });

            if(allCompleted){
                streak++;
                currentDate.setDate(currentDate.getDate()-1);
            }else{
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
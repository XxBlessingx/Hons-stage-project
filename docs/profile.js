const behaviour = new BehaviourEngine(allHabits);
const tracker = new ProgressTracker(allHabits);

const riskProfile = behaviour.generateRiskProfile();
const weeklyRate = Math.round(riskProfile.weeklyRate * 100);

const currentStreak = tracker.calculateStreak();
const longestStreak = tracker.calculateLongestStreak(); // you may need to implement this

const today = new Date().toISOString().split("T")[0];

const pausedHabits = allHabits.filter(h =>
  h.pausedUntil && h.pausedUntil >= today
).length;

const activeHabits = allHabits.length - pausedHabits;
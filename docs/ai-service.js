// ai-service.js — handles all AI insight generation for HabitIQ
// change this to claude for the api intergration

const CLAUDE_API_KEY = "YOUR_API_KEY_HERE";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";

let insightCache = null;
let insightCacheDate = null;

export async function getAIInsight(riskProfile, reinforcementProfile, achievementProfile, aiConsent, userProfile) {

  if (!aiConsent) {
    return { success: false, insight: getFallbackInsight(riskProfile, reinforcementProfile, achievementProfile) };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (insightCache && insightCacheDate === todayStr) {
    return { success: true, insight: insightCache };
  }

  const habitLines = [];

  if (riskProfile.highestHabit) {
    habitLines.push(
      `- Strongest habit: ${riskProfile.highestHabit.name} (${Math.round(riskProfile.highestHabit.completionRate * 100)}% this week, difficulty: ${riskProfile.highestHabit.difficulty || "unknown"})`
    );
  }

  if (riskProfile.lowestHabit) {
    habitLines.push(
      `- Most struggled habit: ${riskProfile.lowestHabit.name} (${Math.round(riskProfile.lowestHabit.completionRate * 100)}% this week, difficulty: ${riskProfile.lowestHabit.difficulty || "unknown"})`
    );
  }

  const flags = [];
  if (riskProfile.burnout)
    flags.push("user appears disengaged — no habits completed in the last 3 days");
  if (riskProfile.overload)
    flags.push("workload appears high relative to current completion rate");
  if (riskProfile.difficultyMismatch)
    flags.push("habit difficulty may be misaligned with current capacity");
  if (riskProfile.lowConsistency)
    flags.push("consistency has been low this week");
  if (reinforcementProfile.momentum)
    flags.push("user is showing positive momentum compared to last week");
  if (reinforcementProfile.strongConsistency)
    flags.push("strong consistency this week — above 70% completion");
  if (achievementProfile.length > 0)
    flags.push(`recent achievement: ${achievementProfile[0].message}`);

  const trend = reinforcementProfile.currentRate > reinforcementProfile.previousRate
    ? "improving"
    : reinforcementProfile.currentRate < reinforcementProfile.previousRate
    ? "declining"
    : "stable";

  const behaviourContext = `
  User behavioural profile:
  - Self-rated consistency: ${userProfile?.consistency || "unknown"}
  - Main barrier: ${userProfile?.barrier || "unknown"}
  - Focus area: ${userProfile?.habitType || "mixed"}
  - Preferred support style: ${userProfile?.supportStyle || "balanced"}
  `;
  
    const prompt = `You are a supportive performance coach helping a university student build sustainable habits.
    ${behaviourContext}
    Weekly summary:
    - Completion rate: ${Math.round(riskProfile.weeklyRate * 100)}%
    - Trend: ${trend} vs last week (last week: ${Math.round(reinforcementProfile.previousRate * 100)}%, this week: ${Math.round(reinforcementProfile.currentRate * 100)}%)
    - Risk level: ${riskProfile.riskLevel}

Habit insights:
${habitLines.join("\n")}

Context signals:
${flags.length > 0 ? flags.map(f => `- ${f}`).join("\n") : "- No major risk signals this week"}

Write a 2-3 sentence personalised insight. Rules:
- Be supportive and clear
- Reference habit names when helpful
- Suggest one small realistic adjustment
- If progress is strong, acknowledge it first
- If struggling, acknowledge the difficulty before suggesting a fix
- Sound like a knowledgeable friend, not a therapist
- Adapt tone based on preferred support style (accountability = direct, gentle reminders = softer tone)
- If user reports low consistency, focus on small wins
- If user reports motivation issues, emphasise identity and purpose`
;

  try {
    const response = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} — ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const insight = data.content[0].text.trim();

    insightCache = insight;
    insightCacheDate = todayStr;
    return { success: true, insight };

  } catch (err) {
    console.error("AI insight failed:", err);
    return {
      success: false,
      insight: getFallbackInsight(riskProfile, reinforcementProfile, achievementProfile)
    };
  }
}

function getFallbackInsight(riskProfile, reinforcementProfile, achievementProfile) {
  if (achievementProfile.length > 0) return achievementProfile[0].message;
  if (reinforcementProfile.strongConsistency && riskProfile.highestHabit)
    return `Your ${riskProfile.highestHabit.name} habit is your strongest this week. Keep that momentum going.`;
  if (reinforcementProfile.momentum)
    return "You're improving compared to last week. Keep building on that progress.";
  if (riskProfile.burnout)
    return "It looks like you've stepped back recently. Start with just one habit today to rebuild momentum.";
  if (riskProfile.overload && riskProfile.lowestHabit)
    return `You might have too much on your plate. Consider pausing ${riskProfile.lowestHabit.name} this week.`;
  if (riskProfile.lowConsistency)
    return "Focus on completing just one habit each day this week to rebuild your consistency.";
  return "You're building consistency. Keep going.";
}
const WORKER_URL = "https://habitiq-ai-insight.blessing-angelica.workers.dev";// protecting the API key stored here

let insightCache = null;
let insightCacheDate = null;

export async function getAIInsight(riskProfile, reinforcementProfile, achievementProfile, aiConsent, userProfile, previousFeedback) {

  if (!aiConsent) {
    return { success: false, insight: getFallbackInsight(riskProfile, reinforcementProfile, achievementProfile) };// uses the risk profile + reinforcement + acheveinmet to generate prompts
  }// if no ai then uses fallback 

  const todayStr = new Date().toISOString().split("T")[0];
  if (insightCache && insightCacheDate === todayStr) {
    return { success: true, insight: insightCache };
  }

  const habitLines = [];// provides summary for best and worset habits

  if (riskProfile.highestHabit) {
    habitLines.push(
      `- Strongest habit: ${riskProfile.highestHabit.name} (${Math.round(riskProfile.highestHabit.completionRate * 100)}% this week, difficulty: ${riskProfile.highestHabit.difficulty || "unknown"})`
    );
  }// prints out the stongest habit  and the highest difficulty 

  if (riskProfile.lowestHabit) {
    habitLines.push(
      `- Most struggled habit: ${riskProfile.lowestHabit.name} (${Math.round(riskProfile.lowestHabit.completionRate * 100)}% this week, difficulty: ${riskProfile.lowestHabit.difficulty || "unknown"})`
    );// prints out worst performing habit and its risk score 
  }

  const flags = [];// context for the ai based on behavoural signals 
  if (riskProfile.burnout)// high disengagement = hight burnout 
    flags.push("user appears disengaged — no habits completed in the last 3 days");
  if (riskProfile.overload)// to many habits = overloaded
    flags.push("workload appears high relative to current completion rate");
  if (riskProfile.difficultyMismatch)// too many hard habits this time 
    flags.push("habit difficulty may be misaligned with current capacity");
  if (riskProfile.lowConsistency)// less productive = low consistance
    flags.push("consistency has been low this week");
  if (reinforcementProfile.momentum)//improvement in momentum from last week
    flags.push("user is showing positive momentum compared to last week");
  if (reinforcementProfile.strongConsistency)//stong consistancy this week
    flags.push("strong consistency this week — above 70% completion");
  if (achievementProfile.length > 0)// gainign and acheveiment
    flags.push(`recent achievement: ${achievementProfile[0].message}`);

  const trend = reinforcementProfile.currentRate > reinforcementProfile.previousRate// checks trend from last week to this week to see if improving, delcining or stable
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
  `;// uses behavioral profile from onboarding

  
  const feedbackContext = previousFeedback// HITL for collecting user responses about the insights 
    ? `\nPrevious insight feedback: The user marked the last insight as "${previousFeedback.type}".${
        previousFeedback.type === "rejected"// if the use disagrees with insight
          ? " Avoid a similar approach this time."// send back to not ound like this 
          : previousFeedback.type === "edited"// if user changes the insight
          ? ` The user edited it to: "${previousFeedback.insight}". Match this tone and style.`// returns back to match the tone given by user
          : " The user found it helpful — maintain a similar approach."// no changes to stay like that 
      }`
    : "";

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
${feedbackContext}

Write a 2-3 sentence personalised insight. Rules:
- Be supportive and clear
- Reference habit names when helpful
- Suggest one small realistic adjustment
- If progress is strong, acknowledge it first
- If struggling, acknowledge the difficulty before suggesting a fix
- Sound like a knowledgeable friend, not a therapist
- Adapt tone based on preferred support style (accountability = direct, gentle reminders = softer tone)
- If user reports low consistency, focus on small wins
- If user reports motivation issues, emphasise identity and purpose`;

  try {
    const response = await fetch(WORKER_URL, {// requesting to Cloudflare for API access
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        habitData: { prompt },
        previousFeedback: previousFeedback
      })
    });
    // for the context and the include stuff from behavioural data, user profile and sound like a friend but constructive 
// make suggestions that are safe and based on behavoral science
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} — ${JSON.stringify(errorData)}`);// accesss delined 
    }

    const data = await response.json();
    const insight = data.insight.trim();

    insightCache = insight;
    insightCacheDate = todayStr;
    return { success: true, insight };

  } catch (err) {
    console.error("AI insight failed:", err);
    return {
      success: false,
      insight: getFallbackInsight(riskProfile, reinforcementProfile, achievementProfile)
    };// fallback engine  and make sure users still get insighs 
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
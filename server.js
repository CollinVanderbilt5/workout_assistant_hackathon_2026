const express = require("express");
const path = require("path");

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const modelId = "google/gemma-4-26b-a4b-it-maas";
const supportedMuscles = new Set([
  "trapezius", "upper-back", "lower-back", "chest", "biceps", "triceps",
  "forearm", "back-deltoids", "front-deltoids", "abs", "obliques", "adductor",
  "hamstring", "quadriceps", "abductors", "calves", "gluteal", "head", "neck"
]);

app.use(express.json({ limit: "16kb" }));

function getGemmaCredentials() {
  const apiKey = process.env.GEMMA_API_KEY || process.env.GOOGLE_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!apiKey || !projectId) {
    const error = new Error("Configure GEMMA_API_KEY and GOOGLE_CLOUD_PROJECT on the server.");
    error.status = 503;
    throw error;
  }
  return { apiKey, projectId };
}

async function requestGemma(messages, responseFormat, maxTokens = 1800) {
  const { apiKey, projectId } = getGemmaCredentials();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/endpoints/openapi/chat/completions`;
  const body = { model: modelId, messages, max_tokens: maxTokens };
  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000)
  });

  if (!response.ok) {
    const error = new Error(`Gemma request failed with status ${response.status}.`);
    error.status = 502;
    error.publicMessage = ({
      400: "Google Cloud rejected the request. Check the Gemma model ID and request configuration.",
      401: "Google Cloud rejected the API key. Use a Google Cloud Agent Platform key, not a browser key.",
      403: "Gemma access is forbidden. Enable the Agent Platform API and Gemma MaaS model, and grant the project access.",
      404: "The Gemma model endpoint was not found. Check the project ID and model availability.",
      429: "The Gemma quota or rate limit was reached. Try again later or review project quota."
    })[response.status] || "Google Cloud could not complete the Gemma request. Check the project and model configuration.";
    throw error;
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    const error = new Error("Gemma returned an empty response.");
    error.status = 502;
    throw error;
  }
  return text;
}

function optionalPositiveInteger(value, label) {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1) throw new Error(`Gemma returned invalid ${label}.`);
  return value;
}

function validateAnalysis(parsed) {
  if (!parsed || !Array.isArray(parsed.exercises) || parsed.exercises.length > 20) {
    throw new Error("Gemma returned an invalid exercise list.");
  }

  return parsed.exercises.map((exercise) => {
    if (!exercise || typeof exercise.name !== "string" || !exercise.name.trim() ||
      exercise.name.length > 100 || !Array.isArray(exercise.muscles)) {
      throw new Error("Gemma returned an invalid exercise mapping.");
    }
    const muscles = [...new Set(exercise.muscles)];
    if (muscles.some((muscle) => typeof muscle !== "string" || !supportedMuscles.has(muscle))) {
      throw new Error("Gemma returned unsupported muscle identifiers.");
    }
    const weightLb = exercise.weightLb ?? null;
    if (weightLb != null && (typeof weightLb !== "number" || !Number.isFinite(weightLb) || weightLb < 0)) {
      throw new Error("Gemma returned an invalid weight.");
    }
    return {
      name: exercise.name.trim(),
      muscles,
      sets: optionalPositiveInteger(exercise.sets, "set count"),
      reps: optionalPositiveInteger(exercise.reps, "rep count"),
      weightLb
    };
  });
}

function validateSplit(parsed) {
  if (!parsed || typeof parsed.summary !== "string" || !parsed.summary.trim() || !Array.isArray(parsed.days) ||
    parsed.days.length < 2 || parsed.days.length > 6) {
    throw new Error("Gemma returned an invalid workout split.");
  }
  return {
    summary: parsed.summary.slice(0, 500),
    days: parsed.days.map((day) => {
      if (!day || typeof day.name !== "string" || !day.name.trim() || !Array.isArray(day.focusMuscles) ||
        !Array.isArray(day.exercises) || !day.exercises.length || day.exercises.length > 8) {
        throw new Error("Gemma returned an invalid split day.");
      }
      const focusMuscles = [...new Set(day.focusMuscles)];
      if (focusMuscles.some((muscle) => typeof muscle !== "string" || !supportedMuscles.has(muscle))) {
        throw new Error("Gemma returned unsupported focus muscles.");
      }
      const exercises = day.exercises.map((exercise) => {
        if (!exercise || typeof exercise.name !== "string" || !exercise.name.trim() ||
          !Array.isArray(exercise.muscles) || exercise.muscles.some((muscle) => !supportedMuscles.has(muscle))) {
          throw new Error("Gemma returned an invalid split exercise.");
        }
        const sets = optionalPositiveInteger(exercise.sets, "set count");
        const reps = optionalPositiveInteger(exercise.reps, "rep count");
        if (sets > 8 || reps > 30) throw new Error("Gemma returned unrealistic set or rep counts.");
        return {
          name: exercise.name.trim().slice(0, 100),
          muscles: [...new Set(exercise.muscles)],
          sets,
          reps
        };
      });
      return { name: day.name.trim().slice(0, 80), focusMuscles, exercises };
    })
  };
}

app.get("/api/health", (req, res) => {
  res.json({ gemmaConfigured: Boolean((process.env.GEMMA_API_KEY || process.env.GOOGLE_API_KEY) && process.env.GOOGLE_CLOUD_PROJECT) });
});

app.post("/api/analyze-workout", async (req, res) => {
  const workout = typeof req.body?.workout === "string" ? req.body.workout.trim() : "";
  if (!workout) return res.status(400).json({ error: "Describe the workout you completed." });
  if (workout.length > 4000) return res.status(413).json({ error: "Workout descriptions must be 4,000 characters or less." });

  try {
    const content = await requestGemma([
      {
        role: "system",
        content: `Extract only exercises the user explicitly says they completed. Return a JSON object with an exercises array; each item has a concise canonical name, a muscles array, sets, reps, and weightLb. Use only these exact supported muscle IDs: ${[...supportedMuscles].join(", ")}. Assign primary and clearly relevant secondary muscles only. Use an empty muscles array when no supported mapping is defensible. Return sets, reps, or weightLb only when the user explicitly states them; otherwise use null. Convert stated kilograms to pounds for weightLb. Never guess details or invent exercises. Return JSON only.`
      },
      { role: "user", content: workout }
    ], { type: "json_object" });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({ error: "Gemma returned an unreadable workout analysis. Try a clearer exercise list." });
    }
    return res.json({ exercises: validateAnalysis(parsed) });
  } catch (error) {
    const status = error.status || 502;
    const message = status === 503 ? error.message : error.publicMessage || "Gemma could not analyze this workout. Check the server configuration and try again.";
    return res.status(status).json({ error: message });
  }
});

app.post("/api/recommend", async (req, res) => {
  const { goal, recent_workouts } = req.body || {};
  if (!goal || !recent_workouts) {
    return res.status(400).json({ error: "Goal and recent_workouts are required." });
  }

  try {
    const recommendation = await requestGemma([
      { role: "system", content: "You are a fitness tracking assistant. Give a concise, balanced next-workout suggestion based on the goal and recent sessions. Do not give medical advice." },
      { role: "user", content: `Goal: ${String(goal).slice(0, 1000)}\nRecent workouts: ${String(recent_workouts).slice(0, 4000)}` }
    ]);
    return res.json({ recommendation });
  } catch (error) {
    const message = error.status === 503 ? error.message : error.publicMessage || "Failed to get a workout recommendation.";
    return res.status(error.status || 502).json({ error: message });
  }
});

app.post("/api/recommend-split", async (req, res) => {
  const sessions = Array.isArray(req.body?.sessions) ? req.body.sessions.slice(0, 12) : [];
  const recentHistory = sessions.map((session) => ({
    completedAt: typeof session?.completedAt === "string" ? session.completedAt.slice(0, 40) : "",
    exercises: Array.isArray(session?.exercises) ? session.exercises.slice(0, 20).map((exercise) => ({
      name: typeof exercise?.name === "string" ? exercise.name.slice(0, 100) : "",
      muscles: Array.isArray(exercise?.muscles) ? exercise.muscles.filter((muscle) => supportedMuscles.has(muscle)) : []
    })) : []
  }));

  try {
    const content = await requestGemma([
      {
        role: "system",
        content: `Create a practical 3-to-5-day workout split using recent logged muscle coverage to prioritize groups represented less often. Treat this only as a short-history coverage signal; do not call a muscle chronically undertrained and do not give medical advice. Use only these muscle IDs: ${[...supportedMuscles].join(", ")}. Return JSON with summary and days; each day has name, focusMuscles, and exercises. Each exercise has name, muscles, sets (integer 1-8), and reps (integer 1-30). Keep exercise muscles and day focusMuscles within the supported IDs.`
      },
      { role: "user", content: `Recent completed sessions (newest first): ${JSON.stringify(recentHistory)}` }
    ], { type: "json_object" }, 2200);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({ error: "Gemma returned an unreadable workout split." });
    }
    return res.json(validateSplit(parsed));
  } catch (error) {
    const message = error.status === 503 ? error.message : error.publicMessage || "Gemma could not create a split. Check the server configuration and try again.";
    return res.status(error.status || 502).json({ error: message });
  }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status === 413 ? 413 : 400;
  return res.status(status).json({ error: status === 413 ? "Request body is too large." : "Invalid request." });
});

if (require.main === module) {
  app.listen(port, () => console.log(`RepRadar server listening on port ${port}`));
}

module.exports = app;
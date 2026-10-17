# RepRadar: A muscle tracking app for all your fitness needs

**See your training. Find your gaps. Build a balanced physique.**

RepRadar is an interactive fitness tracker that visualizes current-session exercise mappings on a two-dimensional muscle model. Its coverage summaries describe recent logged sessions and are not a diagnosis of long-term training balance.

## Features

- **Interactive Muscle Map** — Switch between front and back views of the supported 2D anatomy model.
- **AI Workout Logging** — Describe completed exercises in plain language; Gemma maps supported muscles and extracts only explicitly stated sets, reps, and weight.
- **Session Coverage** — Review muscle groups represented in the active workout and recent history.
- **Recommended Training Split** — Ask Gemma for a split that prioritizes groups seen less often in the recent workout history.
- **Training History** — Track your workouts over time and monitor changes in your training balance.

## How It Works

1. **Describe a completed workout.** Include sets, reps, or weight when you want those details counted.
2. **Review the mapping.** Gemma identifies exercises and returns only supported muscle IDs; unspecified volume remains unknown.
3. **See current coverage.** The two-dimensional model updates from active workout entries.
4. **Plan a split.** Recommendations use recent session coverage as a planning signal, not as a claim that a muscle is chronically undertrained.

## Technology

RepRadar uses React, Express, `react-body-highlighter`, and Gemma 4 MaaS on Google Cloud Agent Platform.

## Run Locally

1. Install Node.js 20.12 or later and run `npm install`.
2. Copy `.env.example` to `.env`, then set `GEMMA_API_KEY` to a Google Cloud Gemini Enterprise Agent Platform API key and `GOOGLE_CLOUD_PROJECT` to its project ID. Never commit `.env`.
3. Enable the Agent Platform API and Gemma 4 26B A4B IT MaaS model for that project.
4. Run `npm run dev_start` and open `http://localhost:3000`.

The workout mapper sends the user's text to Gemma 4 on the server. The API key is not sent to the browser. Gemma results are restricted to the muscle IDs supported by `react-body-highlighter`; set, rep, and weight values are counted only when explicitly stated.

## Project Goals

Our goal is to make workout planning more intuitive and actionable by turning training data into a visual experience. MuscleMap aims to help users understand their training balance, identify potential gaps, and make more informed decisions about future workouts.

## Disclaimer

MuscleMap provides general fitness tracking and workout suggestions, not medical advice. Muscle activation and training-volume estimates are approximations and may vary depending on exercise technique, intensity, and individual circumstances.

## License

License information will be added as the project and its third-party assets are finalized. Third-party models, libraries, and other assets remain subject to their respective licenses.

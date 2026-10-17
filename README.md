# RepRadar: A muscle tracking app for all your fitness needs

**See your training. Find your gaps. Build a balanced physique.**

RepRadar is an interactive fitness tracker that visualizes user-selected exercises on a two-dimensional muscle model. Session coverage and recommendations are calculated locally from workout history.

## Features

- **Interactive Muscle Map** — Switch between front and back views of the supported 2D anatomy model.
- **Workout Logging** — Choose an exercise and enter sets, reps, and weight.
- **Automatic Muscle Mapping** — Exercise definitions map each logged workout to supported muscle IDs.
- **Session Coverage** — Review the muscle groups trained in the active workout.
- **Next Workout Suggestions** — Deterministic recommendations prioritize muscle groups touched by fewer sessions in the last 28 days.
- **Training History** — Track your workouts over time and monitor changes in your training balance.

## How It Works

1. **Choose an exercise.** Select from the built-in exercise library.
2. **Log the work.** Enter sets, reps per set, and weight; entries can be edited or removed.
3. **See current coverage.** The two-dimensional model updates from active workout entries.
4. **Choose a suggestion.** The local recommendation ranks exercises by recent muscle coverage and preselects your choice in the workout form.

## Technology

RepRadar uses React, Express, and `react-body-highlighter`. Workout logging, persistence, and recommendations require no AI API or external credentials.

## Run Locally

1. Install Node.js 20.12 or later and run `npm install`.
2. Run `npm run dev_start` and open `http://localhost:3000`.

Workout entries and history are stored in browser local storage. Recommendations are heuristics based on the last 28 days of recorded sessions, not medical advice or a claim of chronic undertraining.

## Project Goals

Our goal is to make workout planning more intuitive and actionable by turning training data into a visual experience. MuscleMap aims to help users understand their training balance, identify potential gaps, and make more informed decisions about future workouts.

## Disclaimer

MuscleMap provides general fitness tracking and workout suggestions, not medical advice. Muscle activation and training-volume estimates are approximations and may vary depending on exercise technique, intensity, and individual circumstances.

## License

License information will be added as the project and its third-party assets are finalized. Third-party models, libraries, and other assets remain subject to their respective licenses.

# Autonomous Patient Companion Robot Simulator

A deterministic, safety-critical web simulation of an autonomous hospital companion robot designed to guide outpatients between clinical departments (e.g., Ward to CT scan) while adhering to strict healthcare safety and privacy standards.

The simulator models navigation checkpoints, following distance monitoring, lost-patient escalations, operator interventions, and simulated visual confirmation — all without requiring physical robot hardware.

---

## Key Features

- **Clinical Route Orchestration**: Simulates a multi-stage patient escort journey (`Ward 3A` → `Corridor A` → `Corner B` → `CT Waiting Area` → `Scan Completion` → `Return Transfer`).
- **Safety-First State Machine**:
  - Distance & stillness monitoring (halt if patient falls behind or stops).
  - Lost-patient timeout and staff escalation alert system.
  - Operator manual pause and emergency-stop overrides.
  - Proximity re-acquisition verification before resuming navigation.
- **Privacy-Preserving Perception**: Simulated photo/face checks occur strictly in ephemeral device memory and are immediately purged after verification; no biometric media is persisted to the cloud or database.
- **Two Deployment & Simulation Modes**:
  1. **Single Robot Mode (`/solo`)**: Autonomous self-driven kiosk that receives staff triggers, displays patient interactions, handles simulated camera validation, and runs route physics independently.
  2. **Distributed Multi-Device Mode (`/robot`, `/console`, `/camera`)**: Simulates a networked hospital setup with synchronized real-time state across patient display, remote nurse console, and camera perception unit.
- **Staff Dispatch Queue (`/dispatch`)**: Web console for nursing staff to queue escort missions, with support for an authenticated HTTP trigger API.
- **Hardware-Free Unit Testing**: All journey logic and safety guardrails are implemented as pure mathematical reducers (`src/lib/companion/`) with zero I/O or React dependencies for comprehensive automated test coverage.

---

## Architecture Overview

            +------------------------------------------------+
            |              Staff Dispatchers                 |
            |   - Staff Console (/dispatch)                  |
            |   - External Hospital API (POST /robot-trigger)|
            +-----------------------+------------------------+
                                    |
                                    v
            +------------------------------------------------+
            |             Mission Trigger Queue              |
            |     (Pending -> Claimed -> In-Progress)        |
            +-----------------------+------------------------+
                                    |
                +-------------------+-------------------+
                |                                       |
                v                                       v
    [Single Robot Simulator]               [Distributed Network Mode]
            /solo                                       |
    - Internal tick engine              +---------------+---------------+
    - Integrated sensor simulator       |               |               |
    - Audio/visual prompts              v               v               v
                                    Patient Robot   Nurse Console   Perception
                                    (/robot)       (/console)     (/camera)



## Route Catalog

| Path | Screen / Interface | Description |
| :--- | :--- | :--- |
| `/` | **Overview** | Mode selection, scenario descriptions, and simulation documentation. |
| `/solo` | **Single Robot Kiosk** | Self-contained companion robot screen with integrated camera and trigger consumer. |
| `/dispatch` | **Staff Dispatch** | Mission scheduler for nursing staff and external API trigger guide. |
| `/robot` | **Patient Display** | Patient-facing screen showing guidance prompts, arrows, and consent dialogs. |
| `/console` | **Operator Console** | Staff telemetry dashboard with pause, resume, route overrides, and alert feeds. |
| `/camera` | **Perception Unit** | Dedicated simulated sensor stream with following distance and gaze tracking. |

---

## Tech Stack

- **Framework**: TanStack Start v1 (Full-stack React 19, Vite, Nitro SSR)
- **Styling**: Tailwind CSS v4, Lucide Icons, Radix UI primitives
- **Language**: TypeScript (Strict Mode)
- **State Management**: Pure functional session reducers + TanStack Query
- **Testing**: Vitest with `@testing-library/react` and JSDOM

---

## Getting Started

### Prerequisites

- **Node.js**: Version 20.x or 22.x LTS
- **Package Manager**: `npm` (v10+) or `bun` (v1.1+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Update `.env` with your backend credentials).*

3. Install project dependencies:
   ```bash
   npm install
   ```

4. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) (or the port indicated in your terminal) in your browser.

---

## External Trigger API

Hospital systems (HIS / EHR / Nurse Call) can dispatch escort missions programmatically:

```http
POST /api/public/robot-trigger
Content-Type: application/json
x-robot-key: <YOUR_ROBOT_TRIGGER_KEY>

{
  "patient_name": "Mr. Yilmaz",
  "patient_room": "Ward 3A",
  "destination": "CT Scanner",
  "appointment_time": "10:00 AM",
  "staff_notes": "Patient requires gentle pacing."
}
```

**Responses:**
- `200 OK`: Mission queued or dispatched immediately.
- `401 Unauthorized`: Missing or invalid `x-robot-key` header.
- `400 Bad Request`: Payload validation failed.

---

## Verification & Testing

Run unit tests covering pure safety reducers, following thresholds, and transition states:

```bash
npm test
```

To run tests in interactive watch mode:
```bash
npm run test:watch
```

---

## Project Structure

```text
├── src/
│   ├── lib/
│   │   └── companion/         # Hardware-free, pure safety state machine
│   │       ├── config.ts      # Clinical route stops and safety thresholds
│   │       ├── following.ts   # Distance and stillness detection logic
│   │       ├── journey.ts     # Route transition state machine
│   │       ├── session.ts     # Session state reducer
│   │       └── types.ts       # Shared TypeScript domain models
│   ├── routes/                # File-based TanStack Start routes
│   │   ├── api/public/        # External webhook endpoints
│   │   ├── dispatch.tsx       # Staff mission dispatch UI
│   │   ├── solo.tsx           # Single robot simulation
│   │   ├── robot.tsx          # Patient-facing screen
│   │   ├── console.tsx        # Nurse telemetry console
│   │   └── camera.tsx         # Sensor simulation
│   └── components/companion/  # Shared telemetry & UI components
└── drizzle/                   # Database migrations and schema snapshots
```

---

## License

This project is licensed under the MIT License.
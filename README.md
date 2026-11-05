# 🧩 BB Brackets Microservice

This microservice handles all bracket-related functionality for the BusterBrackets app. Built with Node.js, TypeScript, MongoDB, and Hapi, it serves as the backend API for creating, managing, and seeding College BB Tournament brackets.

---

## ⚙️ Tech Stack

- **Node.js** + **TypeScript**
- **Hapi.js** for routing and API structure
- **MongoDB** for database storage
- **Jest** for testing
- **Docker** for containerized workflows

---

## 🔗 Related Repositories

- [UI/UX Microservice](https://github.com/jduffey1990/busterbrackets-ui)
- [Users & Authentication Microservice](https://github.com/jduffey1990/busterbrackets-app-users)

---

## 🚀 Run Locally

1. **Clone the repo:**
   ```bash
   git clone https://github.com/jduffey1990/busterbrackets-app-brackets.git
   cd busterbrackets-app-brackets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the root** (see Environment variables below):

   ```
   MONGO_URI=mongodb://localhost:27017/busterBrackets
   JWT_SECRET=<same secret the users service signs with>
   ADMIN_USER_ID=<Mongo _id of the account allowed to edit tournament data>
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Run tests and the type check:**
   ```bash
   npm test
   npx tsc --noEmit
   ```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | yes | Mongo connection string. Defaults to `mongodb://localhost:27017/busterBrackets` when unset; Docker Compose overrides it to the `mongo` container. |
| `JWT_SECRET` | yes | Secret used to verify the JWT issued by the users service. Must match the users service exactly or every request is a 401. |
| `ADMIN_USER_ID` | yes | The one user id allowed to write tournament data (the field and official results). There is no role model; the check is an id compare. |
| `OPENAI_API_KEY` | for breakdowns | Used by the AI bracket breakdown. Unset, breakdown requests fail with a configuration error. |
| `MOCK_BREAKDOWN` | no | `true` returns a canned breakdown instead of calling OpenAI. Use it for local work. |
| `DRY_RUN` | no | Read by `migrateBrackets` only. Defaults to `true`; set `false` to write. |

---

## Scripts

Every script builds first and runs against `MONGO_URI`.

- `npm run seed`: seed brackets and tournament data for local use (additive; run after the users seed).
- `npm run rebuild-games`: re-derive the `tournamentGames` collection from every year's official results in `tournamentData`. Run after entering or correcting results outside the Admin page.
- `npm run backfill-games`: load `src/data/historical-games.json` (1985 to 2024, derived from Kaggle's March Machine Learning Mania data) for years that have no Admin-entered results. Never touches a tracked year.
- `npx ts-node src/scripts/backtestOdds.ts`: score the odds model on held-out seasons.

---

## 🧪 Seeding the Database

You can populate the brackets collection with a default seed script (must run AFTER users seed script):

- **Locally:**
  ```bash
  npm run seed
  ```

- **With Docker Compose:**
  ```bash
  npm run docker-seed
  ```

---

## 🧩 API Responsibilities

This service is responsible for:

- Creating and saving new brackets
- Handling bracket "offshoots" (alternative versions)
- Fetching bracket data by user
- Managing bracket history and updates

---

## 🐳 Docker

If you're running this as part of a full-stack app:

- Make sure `docker-compose.yml` includes the correct service and MongoDB configuration.  Locally, `docker-compose.yml` is necessary to map the ports properly versus the self-contained microservices in production

'''
version: "3.8"
services:
  mongo:
    image: mongo:8
    container_name: mongo
    ports:
      - "27017:27017"

  users:
    build: ./users
    env_file:
      - ./users/.env
    container_name: services-users
    ports:
      - "3001:3000"
    depends_on:
      - mongo
    image: users-image

  brackets:
    build: ./brackets
    env_file:
      - ./brackets/.env
    container_name: services-brackets
    ports:
      - "3002:3000"
    depends_on:
      - mongo
    image: brackets-image

volumes:
  mongo_data:
'''
- Use `docker compose up --build` to spin everything up

---

## 📁 Folder Structure

```
.
├── src/
│   ├── app.ts           # Entry point (local and Docker)
│   ├── lambda.ts        # Lambda entry point (production)
│   ├── routes/          # Hapi route handlers
│   ├── controllers/     # Logic for DB ops
│   ├── models/          # Bracket model (interface)
│   └── scripts/         # Seed script for local (must run AFTER users)
├── dist/                # Compiled JS (after build, not tracked)
├── .env
├── package.json
├── tsconfig.json
```

---

## 📃 License

This project is currently **UNLICENSED** and not available for public reuse.


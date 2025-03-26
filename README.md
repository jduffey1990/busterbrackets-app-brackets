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

3. **Create a `.env` file in the root:**

   ```
   MONGODB_URI=mongodb://localhost:27017/brackets
   PORT=3001
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

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
│   ├── app.ts           # Entry point
│   ├── routes/          # Hapi route handlers
│   ├── controllers/     # Logic for DB ops
│   ├── models/          # Bracket model (interface)
│   └── scripts/         # Seed script for local (must run AFTER users)
├── dist/                # Compiled JS (after build)
├── .env
├── package.json
├── tsconfig.json
```

---

## 📃 License

This project is currently **UNLICENSED** and not available for public reuse.


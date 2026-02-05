# NutriTrack – Calorie Manager Web Application

## Table of Contents

- [NutriTrack – Calorie Manager Web Application](#nutritrack--calorie-manager-web-application)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Features](#features)
  - [Technologies](#technologies)
  - [Environment Variables](#environment-variables)
  - [Database Setup \& Initialization](#database-setup--initialization)
  - [Running the Application](#running-the-application)
  - [API Integration \& Architecture](#api-integration--architecture)
  - [Extra Features](#extra-features)
  - [Security Considerations](#security-considerations)

## Description

NutriTrack is a full-stack Node.js/Express application for tracking daily nutritional intake. It combines live data from the FatSecret OAuth 1.0a API with a normalized MySQL schema to deliver scalable meal planning, macro calculations, and user management.

## Features

* **User Auth & Sessions**: Password hashing with Scrypt, session persistence via `express-session`, and middleware-based route protection (`ensureAuth`, `ensureAdmin`).
* **Profile Wizard**: Multi-step data capture (age, sex, height, weight, activity level) with on-the-fly BMR and macro target computation using the Mifflin–St Jeor formula.
* **Food Search & Caching**: Two-phase integration—`foods.search` for bulk lookup, then `food.get` for detailed macros. Results are upserted into `foods` and `servings` tables to minimize redundant API calls and improve latency.
* **Favorites Module**: Junction table `user_favorites` enables many-to-many relationships between users and favorite foods, with transactional upsert logic.
* **Meal Plan Engine**: Create, update, and delete named plans. `meal_plan_items` tracks portioned servings tied to plan IDs, with JSON payload validation and ACID-compliant transactions.
* **Data Visualization**: Real-time doughnut charts (Chart.js) compare plan macros versus targets fetched from `nutrition_targets`.
* **Admin UI**: Role-based CRUD operations for user accounts, leveraging Express routers and parameterized SQL queries for safe data manipulation.
* **Admin Account Management**: The first user who registers is automatically granted the `admin` role; all subsequent sign-ups receive the `user` role. Upon admin login, the application routes directly to the admin dashboard (`admin.html`), while unauthorized users attempting to access `admin.html` are met with a 403 FORBIDDEN error.

## Technologies

* **Runtime & Framework**: Node.js (v14+), Express.js (Router, Middleware)
* **Auth & Security**: OAuth 1.0a (FatSecret), `express-session`, Helmet.js for HTTP headers
* **Database**: MySQL 5.7+ with `mysql2/promise` pool, schema normalized to 3NF
* **Front-End**: HTML5, CSS3, ES6+ JavaScript, jQuery, Chart.js, FontAwesome, Vue.js
* **Build & Tooling**: NPM scripts, dotenv for config, Multer for file uploads

## Environment Variables

Configuration is driven by a `.env` file. Copy `.env.example` to `.env`, then set your FatSecret and MySQL credentials.

## Database Setup & Initialization

**Schema Overview:**

* `users` (user\_id PK, role enum)
* `foods` (food\_id PK, metadata)
* `servings` (serving\_id PK, portions, foreign key → foods)
* `user_favorites` (user\_id FK, food\_id FK)
* `meal_plans` (plan\_id PK, user\_id FK, name)
* `meal_plan_items` (item\_id PK, plan\_id FK, serving\_id FK, quantity)
* `nutrition_targets` (user\_id FK, calorie\_goal, protein\_goal, carb\_goal, fat\_goal)

**Initialization:**

1. Confirm `.env` contains valid DB credentials.
2. From project root, execute:

   ```bash
   node DataBase/init_db.js
   ```

   This script uses the `mysql2` promise pool to create the database and all tables atomically.

## Running the Application

Launch the server with:

```bash
npm start
```

The Express app listens on port 3000 by default. Navigate to `http://localhost:3000/` to access the UI.

## API Integration & Architecture

The backend exposes RESTful JSON endpoints under `/api` using Express routers:

* **Auth Routes (`/api/auth`)**: Handlers for signup, login, logout; password hashing via Scrypt and session cookies with `HttpOnly` flags.
* **Profile Routes (`/api/profile`)**: GET/POST for user profile data; calculates and persists macro targets in `nutrition_targets`.
* **Food Routes (`/api/foods`)**: Implements proxy endpoints that sign and forward requests to FatSecret. After each call, payloads are normalized and upserted into MySQL.
* **Favorites Routes (`/api/favorites`)**: Idempotent POST handlers wrap upsert logic in DB transactions; DELETE for removal.
* **Meal Plan Routes (`/api/mealplan`)**: CRUD operations for meal plans and items, with parameterized queries to prevent SQL injection and ensure ACID compliance.

Middleware patterns:

* **`ensureAuth`** validates sessions before protected routes.
* **`ensureAdmin`** enforces role-based access for admin controllers.
* **Error Handling** via Express `next(err)` with centralized error-logging and response formatter.

## Extra Features

* **Live Password Strength Indicator**: On the signup page, a client-side script evaluates password entropy in real time (using zxcvbn) and provides visual feedback (progress bar + strength labels).
* **Admin Dashboard**: A dedicated UI section secured by `ensureAdmin` middleware. Implements DataTables for paginated user lists and AJAX-based inline edits/deletions of user accounts.

## Security Considerations

* **Input Sanitization**: `express-validator` on all API routes; client-side validation with HTML5 constraints.
* **SQL Safety**: Parameterized queries via `mysql2/promise` to mitigate injection risks.
* **Session Security**: Secure cookies, `sameSite=Strict`, rolling sessions.
* **XSS & CSRF**: Content Security Policy headers via Helmet; CSRF tokens for state-changing POST/DELETE requests.

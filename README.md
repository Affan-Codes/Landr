# 🌍 Landr

**Landr** is an AI-driven web application built with **Next.js 15**, **TypeScript**, and **Drizzle ORM**, designed to analyze resumes, generate personalized feedback, and streamline AI-assisted content interactions.  
It leverages advanced AI models and a modular UI to create a seamless user experience for automation, productivity, and intelligent data handling.

## 🚀 Features

- 🤖 **AI Resume Analysis** – Intelligent resume parsing and feedback generation
- 🧠 **AI-Powered Q&A** – Generate and analyze questions dynamically
- 🗂️ **API Endpoints** – Modular and extendable API architecture for AI functions
- 🧩 **Authentication with Clerk** – Secure sign-in and session management
- 🎨 **Modern UI** – Built with Shadcn + TailwindCSS for an elegant interface
- 💬 **Voice Integration (Hume AI)** – Interactive AI voice capabilities
- ⚙️ **Drizzle ORM** – Type-safe and efficient database handling
- 💻 **Next.js App Router** with Server Actions and modern build setup

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, TailwindCSS
- **Backend:** Next.js API Routes (App Router)
- **Database:** PostgreSQL via Drizzle ORM
- **AI SDKs:** Vercel AI SDK, Hume AI
- **Auth:** Clerk Authentication
- **Styling:** TailwindCSS + Shadcn UI + Radix UI
- **Linting & Formatting:** ESLint, TypeScript
- **Environment Management:** @t3-oss/env-nextjs

## 📂 Project Structure

```bash
Landr-main/
 ┣ public/                         # Static assets (icons, svgs)
 ┣ src/
 ┃ ┣ app/
 ┃ ┃ ┣ api/
 ┃ ┃ ┃ ┣ ai/
 ┃ ┃ ┃ ┃ ┣ questions/              # AI question generation APIs
 ┃ ┃ ┃ ┃ ┃ ┣ generate-feedback/route.ts
 ┃ ┃ ┃ ┃ ┃ ┣ generate-question/route.ts
 ┃ ┃ ┃ ┃ ┃ ┗ latest/route.ts
 ┃ ┃ ┃ ┃ ┣ resumes/analyze/route.ts
 ┃ ┃ ┣ layout.tsx                  # Root layout configuration
 ┃ ┃ ┣ page.tsx                    # Main landing page
 ┃ ┃ ┣ globals.css                 # Global styles
 ┃ ┣ middleware.ts                 # Route handling middleware
 ┣ drizzle.config.ts               # Drizzle ORM configuration
 ┣ docker-compose.yml              # Docker setup for local development
 ┣ package.json                    # Dependencies and scripts
 ┣ tsconfig.json                   # TypeScript configuration
 ┣ postcss.config.mjs              # Tailwind/PostCSS setup
 ┣ components.json                 # Shadcn component registry
 ┣ eslint.config.mjs               # ESLint configuration
 ┗ README.md
```

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Affan-Codes/Landr.git
cd Landr-main

```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create .env file in the root directory

#### Add the following variables:

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_WEBHOOK_SIGNING_SECRET=your_webhook_secret

ARCJET_KEY=your_arcjet_key

DATABASE_URL=your_database_connection_string

// For development (DOCKER)
DB_PASSWORD=password
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5433
DB_NAME=landr

HUME_API_KEY=your_hume_api_key
HUME_SECRET_KEY=your_hume_secret_key
NEXT_PUBLIC_HUME_CONFIG_ID=your_hume_config_id

GEMINI_API_KEY=your_gemini_api_key
```

### 4️⃣ Run Database migrations

```bash
npm run db:migrate

```

### 5️⃣ Start the development server

```
npm run dev
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

- Fork the project
- Create a feature branch (git checkout -b feature-name)
- Commit your changes (git commit -m "Added new feature")
- Push the branch (git push origin feature-name)
- Open a Pull Request

# 👨‍💻 Author

Made by **_Affan Khan_**

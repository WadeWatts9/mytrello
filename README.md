# MyTrello by ACDev

<div align="center">
  <img src="public/logo.png" alt="MyTrello by ACDev" width="180" height="180" />

  **A premium, self-hosted Kanban application built with Next.js, Prisma and Docker.**

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://prisma.io/)
  [![Docker](https://img.shields.io/badge/Docker-ready-blue?style=flat-square&logo=docker)](https://docker.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
</div>

---

## ✨ Features

- 🔐 **Authentication** — Secure login with NextAuth.js (credentials-based)
- 👑 **Admin Role** — Full control: create users, manage all boards
- 👤 **User Management** — Admin can create and manage user accounts
- 📋 **Personal & Shared Boards** — Private boards or collaborative boards
- 🔒 **Granular Roles** — Per-board roles: **Viewer** (read-only) or **Editor** (full edit)
- 🗂️ **Dynamic Columns** — Each board has its own custom status columns
- 🃏 **Rich Cards** — Cards with title, description, hashtags, URLs, image uploads and external links
- 🏷️ **Hashtags / Tags** — Cross-card tagging for quick linking and search
- 🖼️ **Image Support** — Attach images via URL or file upload
- 🌙 **Dark Mode** — Automatic dark/light mode based on system preference
- 💎 **Glassmorphism UI** — Polished, premium visual design
- 🐳 **Docker-Ready** — Single container, SQLite persistence, port `3004`

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2

### 1. Clone the repository
```bash
git clone https://github.com/WadeWatts9/mytrello.git
cd mytrello
```

### 2. Run with Docker Compose
```bash
docker-compose up -d
```

Open your browser at **http://localhost:3004**

### 3. Default Admin Credentials
| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@mytrello.com`   |
| Password | `admin123`             |

> ⚠️ **Change the default password immediately after first login in a production environment.**

---

## 🏗️ Architecture

```
mytrello/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # NextAuth.js endpoints
│   │   │   ├── boards/              # Board CRUD API
│   │   │   ├── cards/               # Card CRUD API
│   │   │   └── users/               # User management API (Admin only)
│   │   ├── board/[id]/              # Board view (Kanban)
│   │   ├── login/                   # Login page
│   │   ├── admin/                   # Admin dashboard
│   │   ├── globals.css              # Global styles + Glassmorphism
│   │   ├── layout.tsx               # Root layout (providers, metadata)
│   │   └── page.tsx                 # Home / Boards list
│   ├── components/
│   │   ├── Board.tsx                # Kanban board component
│   │   ├── Card.tsx                 # Card component (draggable)
│   │   ├── List.tsx                 # Column component
│   │   └── Providers.tsx            # Session provider wrapper
│   └── lib/
│       └── prisma.ts                # Prisma client singleton
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── seed.js                      # Admin user seed script
│   └── dev.db                       # SQLite database (auto-created)
├── public/
│   ├── logo.png                     # App logo 512×512
│   ├── favicon.png                  # Favicon 32×32
│   └── icon-192.png                 # PWA icon 192×192
├── Dockerfile                       # Multi-stage Docker build
├── docker-compose.yml               # ZimaOS/Docker deployment config
└── next.config.ts                   # Next.js config (standalone output)
```

---

## 🗃️ Data Model

```
User ──────── owns ──────────── Board
  │                               │
  └── member (role) ─────────── Board
                                  │
                               Column (ordered)
                                  │
                               Card
                              ├── Tag (hashtags)
                              ├── Image (URL or upload)
                              └── Link (external URLs)
```

### Roles
| Role    | Description                                   |
|---------|-----------------------------------------------|
| `ADMIN` | Full access: users, boards, all settings      |
| `USER`  | Can create personal boards, join shared boards |

### Board Member Roles
| Role     | Can view | Can edit cards | Can manage columns |
|----------|----------|----------------|--------------------|
| `VIEWER` | ✅        | ❌              | ❌                  |
| `EDITOR` | ✅        | ✅              | ✅                  |

---

## 🐳 Docker & ZimaOS Deployment

### Build image locally
```bash
docker build -t mytrello-acdev .
```

### Save image to file (for transfer to ZimaOS)
```bash
docker save mytrello-acdev:latest | gzip > mytrello-acdev.tar.gz
```

### Load on ZimaOS
```bash
docker load < mytrello-acdev.tar.gz
docker-compose up -d
```

### Environment Variables
| Variable          | Default                | Description                         |
|-------------------|------------------------|-------------------------------------|
| `NEXTAUTH_URL`    | `http://localhost:3004`| Full URL of the application          |
| `NEXTAUTH_SECRET` | `changeme_in_production`| JWT signing secret — **change this** |
| `DATABASE_URL`    | `file:/app/data/dev.db`| SQLite path (auto-mounted volume)    |
| `PORT`            | `3004`                 | Server port                          |

### Persistent Data Volume
All data (database + uploaded images) is stored in a named Docker volume:
```yaml
volumes:
  mytrello_data:    # Maps to /app/data inside the container
```

---

## 💻 Local Development

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10

### Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to local SQLite
npx prisma db push

# Seed admin user
node prisma/seed.js

# Start development server
npm run dev
```

App runs at **http://localhost:3000**

---

## 🛠️ Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Framework   | [Next.js 16](https://nextjs.org/) (App Router, standalone) |
| Database    | [SQLite](https://sqlite.org/) via [Prisma 5](https://prisma.io/) ORM |
| Auth        | [NextAuth.js v4](https://next-auth.js.org/) (credentials) |
| Styling     | [Tailwind CSS v4](https://tailwindcss.com/) + custom Glassmorphism |
| Drag & Drop | [@dnd-kit](https://dndkit.com/)             |
| Runtime     | [Node.js 20 Alpine](https://hub.docker.com/_/node) (Docker) |
| Container   | [Docker](https://docker.com/) + Docker Compose |

---

## 📝 License

MIT © 2026 ACDev

---

<div align="center">
  Made with ❤️ by <strong>ACDev</strong>
</div>

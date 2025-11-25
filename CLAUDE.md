# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application for "seguimiento de tesis" (thesis tracking). It's built with TypeScript and follows NestJS architectural patterns.

## Development Commands

### Installation
```bash
npm install
```

### Running the Application
```bash
npm run start          # Standard mode
npm run start:dev      # Watch mode (auto-reload on changes)
npm run start:debug    # Debug mode with watch
npm run start:prod     # Production mode (runs compiled dist/main.js)
```

The application listens on port 3000 by default (configurable via PORT environment variable).

### Building
```bash
npm run build          # Compiles TypeScript to dist/ directory
```

### Testing
```bash
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage report
npm run test:e2e       # Run end-to-end tests
npm run test:debug     # Run tests in debug mode
```

### Code Quality
```bash
npm run lint           # Run ESLint with auto-fix
npm run format         # Format code with Prettier
```

### Database
```bash
npx prisma generate    # Generate Prisma Client after schema changes
npx prisma migrate dev # Create and apply database migrations
npx prisma studio      # Open Prisma Studio (database GUI)
npm run seed           # Seed database with default roles (admin, user, moderator)
```

Before running the application for the first time:
1. Ensure PostgreSQL is running
2. Update `.env` with your `DATABASE_URL` connection string
3. Run `npx prisma migrate dev` to create database tables
4. Run `npm run seed` to create default roles

## Architecture

### NestJS Structure
- **Entry Point**: `src/main.ts` - bootstraps the NestJS application
- **Root Module**: `src/app.module.ts` - main application module that imports all feature modules
- **Controllers**: Handle HTTP requests and return responses (e.g., `app.controller.ts`)
- **Services**: Contain business logic and are injectable providers (e.g., `app.service.ts`)

### Module Pattern
NestJS uses a modular architecture. Each feature should be organized as a module with:
- Module file (`*.module.ts`) - defines the module boundary
- Controller(s) - handle routes
- Service(s) - implement business logic
- DTOs - data transfer objects for validation
- Entities/Interfaces - data models

### Dependency Injection
NestJS heavily uses dependency injection. Services are decorated with `@Injectable()` and injected via constructor parameters.

### Prisma Integration
- **PrismaService** (`src/prisma/prisma.service.ts`) - Global Prisma Client service
- **PrismaModule** - Exports PrismaService as a global module
- Implements lifecycle hooks: `OnModuleInit`, `OnModuleDestroy`
- Uses Prisma 7 adapter pattern with `@prisma/adapter-pg` and `pg` Pool
- Automatically connects on module init and disconnects on destroy

## Feature Modules

### Users Module (`src/users/`)
Handles user management with full CRUD operations.

**Entities:**
- `User`: Main user entity with email, password (hashed), firstName, lastName, email verification status, and roles
- `Role`: Role entity supporting RBAC (admin, user, moderator)

**Key Features:**
- User creation with automatic password hashing (bcrypt with salt rounds 10)
- Email uniqueness validation
- Default role assignment
- User-Role many-to-many relationship
- Email verification token management
- Password reset token management

**Service Methods:**
- `create()`, `findAll()`, `findOne()`, `findByEmail()`, `update()`, `remove()`
- `verifyEmail()`, `setEmailVerificationToken()`, `setPasswordResetToken()`, `resetPassword()`

### Auth Module (`src/auth/`)
Implements secure authentication with JWT and refresh tokens.

**Entities:**
- `RefreshToken`: Stores refresh tokens with expiration and revocation status

**Authentication Strategy:**
- JWT access tokens (short-lived, 15 minutes by default)
- Refresh tokens (long-lived, 7 days by default)
- Bcrypt password hashing
- Passport JWT strategy

**Endpoints:**
- `POST /auth/register` - User registration with email verification token
- `POST /auth/login` - Login with credentials, returns access + refresh token
- `POST /auth/refresh` - Refresh access token using refresh token
- `POST /auth/logout` - Logout and revoke refresh token
- `POST /auth/logout-all` - Revoke all refresh tokens for user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/verify-email?token=` - Verify email address
- `POST /auth/resend-verification` - Resend verification email

**Security Features:**
- Rate limiting on auth endpoints (configurable via Throttle decorator)
- Token rotation on refresh
- Automatic token revocation
- Password reset with 1-hour expiration
- Email verification flow

**Guards:**
- `JwtAuthGuard`: Protects routes requiring authentication
- `RolesGuard`: Enforces role-based access control

**Decorators:**
- `@Roles(...roles)`: Mark endpoints with required roles
- `@CurrentUser()`: Extract current user from request

### Mail Module (`src/mail/`)
Handles email notifications using Nodemailer.

**Features:**
- Email verification emails
- Password reset emails
- Welcome emails after verification

**Configuration:**
Configure SMTP settings in `.env`:
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`
- `MAIL_FROM`, `FRONTEND_URL`

## Database

**ORM:** Prisma 7 with PostgreSQL

**Schema Location:** `prisma/schema.prisma`

**Models:**
- `User` - User accounts with email verification and password reset functionality
- `Role` - User roles (ADMIN, USER, MODERATOR) using enum type
- `RefreshToken` - JWT refresh tokens with expiration and revocation tracking

**Key Features:**
- Prisma 7 with PostgreSQL adapter (`@prisma/adapter-pg`)
- Type-safe database queries with auto-generated types
- Automatic cascade deletion for related records
- Many-to-many relationship between Users and Roles

**Schema Management:**
- Migrations stored in `prisma/migrations/`
- Run `npx prisma migrate dev` to create and apply migrations
- Run `npx prisma generate` to regenerate Prisma Client after schema changes
- Use `npx prisma studio` to browse data with GUI

**Seeding:**
Run `npm run seed` to populate the database with default roles (ADMIN, USER, MODERATOR).

## Security

### Password Security
- Bcrypt hashing with 10 salt rounds
- Minimum password length: 8 characters
- Passwords never returned in API responses

### JWT Security
- Access tokens: 15-minute expiration
- Refresh tokens: 7-day expiration with rotation
- Separate secrets for access and refresh tokens
- Token revocation support

### Rate Limiting
Configured via `@nestjs/throttler`:
- Auth endpoints: 3-5 requests per minute
- Global default: 10 requests per 60 seconds (configurable)

### Input Validation
All DTOs use `class-validator` decorators:
- Email format validation
- Required field validation
- String length validation
- UUID validation for IDs

## Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/database?schema=public`)
- `JWT_SECRET` - Secret key for access tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens

**Optional:**
- `PORT` (default: 3000)
- `NODE_ENV` (development/production)
- `JWT_EXPIRATION` (default: 15m)
- `JWT_REFRESH_EXPIRATION` (default: 7d)
- `THROTTLE_TTL`, `THROTTLE_LIMIT`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD` - SMTP configuration
- `MAIL_FROM`, `FRONTEND_URL` - Email sender and frontend URL for links

## TypeScript Configuration

- Target: ES2023
- Module system: NodeNext with ESM interop
- Decorators enabled (required for NestJS)
- Strict null checks enabled
- Output directory: `dist/`

## Testing

- **Unit tests**: Located alongside source files with `.spec.ts` suffix
- **E2E tests**: Located in `test/` directory with `.e2e-spec.ts` suffix
- Test framework: Jest
- E2E testing uses Supertest for HTTP assertions

## Code Style

- Single quotes preferred
- Trailing commas enforced
- ESLint configured with TypeScript support
- Auto-format on save recommended
- End-of-line format handled automatically by Prettier

# Setup Guide - Backend Seguimiento Tesis

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

**Database Configuration:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_DATABASE=tesis_seguimiento
```

**JWT Configuration:**
```env
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```

**Email Configuration (SMTP):**
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@tesisapp.com
```

For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" at https://myaccount.google.com/apppasswords
3. Use the app password in `MAIL_PASSWORD`

### 3. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE tesis_seguimiento;

# Exit
\q
```

### 4. Seed the Database

This will create the default roles (admin, user, moderator):

```bash
npm run seed
```

### 5. Start the Application

**Development mode (with auto-reload):**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

- `POST /auth/login` - Login
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /auth/refresh` - Refresh access token
  ```json
  {
    "refreshToken": "your-refresh-token"
  }
  ```

- `POST /auth/logout` - Logout (requires authentication)
- `GET /auth/verify-email?token=xxx` - Verify email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

### Users (Protected)

All user endpoints require authentication (JWT token in Authorization header):

```bash
Authorization: Bearer <your-access-token>
```

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## Using Protected Endpoints

1. Register or login to get an access token
2. Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     http://localhost:3000/users
```

## Role-Based Access Control

To protect endpoints with roles, use the `@Roles()` and `@UseGuards()` decorators:

```typescript
import { Roles } from './auth/decorators/roles.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { RoleEnum } from './users/entities/role.entity';

@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
async adminOnly() {
  return { message: 'Admin only endpoint' };
}
```

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify the database exists

### Email Sending Error

- Verify SMTP credentials
- For Gmail, ensure you're using an App Password
- Check firewall/network settings

### JWT Token Error

- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`
- Check token expiration settings
- Verify the token is sent in the Authorization header

## Next Steps

1. Configure your frontend URL in `.env` (`FRONTEND_URL`)
2. Implement additional business logic in new modules
3. Set up proper email templates
4. Configure CORS if needed
5. Set up migrations for production (instead of `synchronize: true`)
6. Add API documentation with Swagger

## Security Recommendations

**Before deploying to production:**

1. Change all secret keys in `.env`
2. Set `NODE_ENV=production`
3. Disable `synchronize` in TypeORM and use migrations
4. Use HTTPS for all endpoints
5. Configure proper CORS origins
6. Set up rate limiting for all endpoints
7. Enable logging and monitoring
8. Use environment-specific `.env` files

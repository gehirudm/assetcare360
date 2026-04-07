# AssetCare360 - Inventory Management System Backend

A PHP-based backend for an inventory management system with role-based access control, automatic database table creation, and request logging.

## Features

- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Role-based access control (RBAC) with 7 user roles
- ✅ Automatic API request logging with categorization
- ✅ Advanced log viewing and analytics (Admin only)
- ✅ Endpoint registry for action mapping
- ✅ Cookie-based session management
- ✅ User management with CRUD operations
- ✅ Password management with force change flag
- ✅ User filtering and search capabilities
- ✅ Database auto-table creation from models
- ✅ Secure password hashing
- ✅ CORS support
- ✅ CSV export functionality for logs
- ✅ Machine and vehicle inventory management
- ✅ Fault ticket system with image uploads (max 5 images per report)
- ✅ UUID-based image storage for fault reports  
- ✅ RabbitMQ event pipeline (publisher + audit/notification consumers + service-due producer)

## Project Structure

```
assetcare-backend-new/
├── config/
│   ├── config.php           # Application configuration
│   └── Database.php         # Database singleton class
├── app/
│   ├── controllers/         # API Controllers
│   │   └── AuthController.php
│   ├── models/              # Database Models (with CRUD)
│   │   ├── BaseModel.php    # Base model with auto-table creation
│   │   └── User.php         # User model
│   ├── services/            # Business Logic Services
│   │   └── AuthService.php
│   ├── middleware/          # Middleware
│   │   ├── RequestLogger.php
│   │   └── RoleMiddleware.php
│   ├── helpers/             # Helper Classes
│   │   ├── JWTHelper.php
│   │   └── Response.php
│   └── Router.php           # Request Router
├── public/
│   ├── index.php            # Entry point
│   └── .htaccess            # URL rewriting
├── scripts/
│   ├── migrate.php          # Migration manager (status/baseline/migrate)
│   └── seed.php             # Database seeder
├── logs/                    # Log files (created automatically)
└── .htaccess                # Root URL rewriting
```

## User Roles

The system supports the following roles (in order of hierarchy):
1. **Admin** - Full system access including user management and system logs
2. **Maintenance Manager** - Manage maintenance operations and schedules
3. **Inventory Manager** - Manage inventory operations
4. **Technical Officer** - Technical support and equipment management
5. **Supervisor** - Supervise operations
6. **Driver** - Driver-specific access
7. **Machinary Operator** - Equipment-specific access

## Documentation

- **[API Quick Reference](docs/API_REFERENCE.md)** - Quick overview of all endpoints
- **[System Logging Guide](docs/LOGGING.md)** - Complete logging system documentation
- **[Testing Guide](docs/TESTING_LOGS.md)** - How to test the logging features
- **[Architecture Overview](docs/ARCHITECTURE_LOGS.md)** - System architecture diagrams
- **[Change Log](docs/CHANGELOG_LOGS.md)** - Recent changes and implementation details
- **[OpenAPI Specification](testing/openapi.yaml)** - Full API specification

## Setup Instructions

### Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache with mod_rewrite enabled (for production)
- PDO MySQL extension

### Quick Setup (Automated)

The easiest way to set up the project is using the automated setup script:

1. **Configure database credentials**
   
   Edit `config/config.php` and update the database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'assetcare360');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   ```

2. **Run the setup script**
   ```bash
   php setup.php
   ```
   
   The script will:
   - ✅ Check PHP version and required extensions
   - ✅ Create the database automatically
   - ✅ Create the logs directory
   - ✅ Initialize all database tables
   - ✅ Seed test users
   - ✅ Test the database connection

3. **Run pending migrations**
   ```bash
   php scripts/migrate.php status
   php scripts/migrate.php migrate
   ```

4. **(Optional) Enable event pipeline**
   ```bash
   composer install
   # update .env with RabbitMQ settings and set EVENTS_ENABLED=true
   php services/consume_audit_events.php
   php services/consume_notification_events.php
   php services/check_service_due.php
   ```

   Suggested cron for service-due producer:
   ```cron
   */10 * * * * /usr/bin/php /path/to/assetcare360/services/check_service_due.php >> /var/log/assetcare360-service-due.log 2>&1
   ```

   For existing databases that already have historical changes applied manually, baseline old migrations first, then run new ones:
   ```bash
   php scripts/migrate.php baseline --until=41
   php scripts/migrate.php migrate
   ```

4. **Start the development server**
   ```bash
   cd public
   php -S localhost:8000
   ```

5. **Access the API**
   
   Open your browser or API client to: `http://localhost:8000/api`

### Manual Setup (Alternative)

If you prefer to set up manually:

1. **Create the database**
   ```sql
   CREATE DATABASE assetcare360;
   ```

2. **Seed the database with test users**
   ```bash
   php scripts/seed.php
   ```

3. **Run migrations**
   ```bash
   php scripts/migrate.php status
   php scripts/migrate.php migrate
   ```

4. **Create logs directory**
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

5. **Configure your web server**
   
   Point your document root to the `public` folder or ensure `.htaccess` is working.

6. **Start your server**
   
   For local development with PHP built-in server:
   ```bash
   cd public
   php -S localhost:8000
   ```

## Email Testing with MailHog (macOS)

MailHog is a local SMTP server that captures emails for testing without actually sending them. This is perfect for development and testing the password reset functionality.

### Installation

1. **Install MailHog using Homebrew**
   ```bash
   brew install mailhog
   ```

2. **Start MailHog service**
   ```bash
   brew services start mailhog
   ```

3. **Install mhsendmail (mail sender binary)**
   ```bash
   go install github.com/mailhog/mhsendmail@latest
   ```

4. **Configure PHP to use MailHog**
   
   Find your `php.ini` file location:
   ```bash
   php --ini
   ```
   
   Edit the `php.ini` file and set the `sendmail_path`:
   ```ini
   sendmail_path = "~/go/bin/mhsendmail"
   ```
   
   **Note:** Replace `~` with your actual home directory path if needed (e.g., `/Users/yourusername/go/bin/mhsendmail`)

5. **Restart PHP** (if using PHP-FPM or Apache, restart the service)

### Usage

Once configured, you can use PHP's built-in `mail()` function normally:

```php
mail($to, $subject, $message, $headers);
```

All emails will be captured by MailHog and can be viewed in the web interface at:

**http://localhost:8025/**

### Testing the Setup

Run the included test script to verify email configuration:

```bash
php test_mail.php
```

If successful, you should see "Mail sent successfully!" and the email will appear in MailHog's web interface at http://localhost:8025/

### Features

- 📧 View all captured emails in a web interface
- 🔍 Search and filter emails
- 📱 Responsive design for mobile viewing
- 🗑️ Delete emails individually or clear all
- 🔗 View email headers and raw source
- 📎 Download attachments (if any)

### Stopping MailHog

To stop the MailHog service:
```bash
brew services stop mailhog
```

To restart:
```bash
brew services restart mailhog
```

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "employee_id": "LITRO-ADMIN-001",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "employee_id": "LITRO-ADMIN-001",
      "full_name": "Admin User",
      "role": "Admin",
      "email": "admin@assetcare360.com",
      "phone": "+94771234567",
      "is_active": 1,
      "last_login": "2025-10-19 10:30:00",
      "created_at": "2025-10-19 09:00:00"
    }
  }
}
```

**Note:** The JWT token is automatically stored in an HTTP-only cookie named `auth_token`. The cookie is used for subsequent authenticated requests. The token is also returned in the response for clients that prefer Authorization header authentication.

#### Get Current User
```http
GET /api/auth/me
```

**Authentication:** Cookie-based (automatic) or Authorization header
```

#### Logout
```http
POST /api/auth/logout
```

**Note:** This clears the `auth_token` cookie. If using header authentication, the client should discard the token.

#### Change Password
```http
POST /api/auth/change-password
Content-Type: application/json

{
  "current_password": "password123",
  "new_password": "newpassword456"
}
```

**Note:** If a user has `force_password_change` flag set, they will be automatically redirected to the password change page upon login and cannot access the dashboard until they change their password.

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "employee_id": "LITRO-ADMIN-001",
  "email": "admin@assetcare360.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "If your account exists, you will receive a password reset email shortly.",
  "debug_token": "abc123...",
  "debug_link": "http://localhost:3000/auth/reset-password.html?token=abc123..."
}
```

**Note:** In development mode, the response includes `debug_token` and `debug_link` for testing. These should be removed in production. The password reset email is sent to the user's registered email address with a link that expires in 1 hour.

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "new_password": "newpassword456"
}
```

**Note:** The token is obtained from the password reset email link. It must be used within 1 hour of generation.

#### Validate Token
```http
GET /api/auth/validate
```

**Authentication:** Cookie-based (automatic) or Authorization header

## Password Reset Flow

1. **User requests password reset**: User enters their Employee ID and email on the forgot password page
2. **Email sent**: System sends password reset email with a unique token (valid for 1 hour)
3. **User clicks link**: Email contains link to `http://localhost:3000/auth/reset-password.html?token={token}`
4. **Set new password**: User enters new password on reset page
5. **Password updated**: System validates token, updates password, and redirects to login page

**Force Password Change:**
- When an admin creates a new user or resets a user's password, the `force_password_change` flag is set
- User can log in with temporary password but is immediately redirected to change password page
- User cannot access any dashboard or functionality until password is changed
- After successful password change, the flag is cleared and user is redirected to their dashboard

## Authentication Methods

This API supports two authentication methods:

### 1. Cookie-Based Authentication (Default)
After logging in, the JWT token is automatically stored in an HTTP-only cookie. Subsequent requests automatically include this cookie, so no additional headers are needed.

**Advantages:**
- More secure (HTTP-only cookies prevent XSS attacks)
- Automatic inclusion in requests
- No client-side token management needed

**Usage:**
```bash
# Login (cookie is set automatically)
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"LITRO-ADMIN-001","password":"password123"}'

# Make authenticated requests (cookie sent automatically)
curl -b cookies.txt http://localhost:8000/api/auth/me
```

### 2. Header-Based Authentication (Alternative)
You can also use the traditional Authorization header with Bearer token.

**Usage:**
```bash
# Extract token from login response and use in header
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Note:** The API checks for cookies first, then falls back to the Authorization header if no cookie is present.

## Test Credentials

| Employee ID | Password | Role |
|------------|----------|------|
| LITRO-ADMIN-001 | password123 | Admin |
| LITRO-INVMGR-001 | password123 | Inventory Manager |
| LITRO-INVMGR-002 | password123 | Inventory Manager |
| LITRO-SUPERVISOR-001 | password123 | Supervisor |
| LITRO-SUPERVISOR-002 | password123 | Supervisor |
| LITRO-DRIVER-001 | password123 | Driver |
| LITRO-DRIVER-002 | password123 | Driver |
| LITRO-MACHOPER-001 | password123 | Machinary Operator |
| LITRO-MACHOPER-002 | password123 | Machinary Operator |
| LITRO-MACHOPER-003 | password123 | Machinary Operator |

## Creating New Models

To create a new database table, simply create a new model class that extends `BaseModel`:

```php
<?php

require_once __DIR__ . '/BaseModel.php';

class Product extends BaseModel {
    protected $table = 'products';
    
    protected function getSchema() {
        return [
            'id' => 'INT AUTO_INCREMENT PRIMARY KEY',
            'name' => 'VARCHAR(255) NOT NULL',
            'sku' => 'VARCHAR(100) UNIQUE NOT NULL',
            'quantity' => 'INT DEFAULT 0',
            'price' => 'DECIMAL(10,2) NOT NULL',
            'created_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ];
    }
    
    // Add custom methods here
    public function findBySku($sku) {
        return $this->findOne(['sku' => $sku]);
    }
}
```

The table will be automatically created when the model is first instantiated!

## Adding Role-Based API Protection

To protect an endpoint with role-based access control:

```php
// In your controller method
RoleMiddleware::requireRole('Admin'); // Only admins

RoleMiddleware::requireRole(['Admin', 'Inventory Manager']); // Multiple roles

RoleMiddleware::requireMinRole('Supervisor'); // Supervisor and above
```

## System Logging & Analytics

### Automatic Request Logging

All API requests are automatically logged to the `api_request_logs` table with:
- User ID and Employee ID
- HTTP Method and Endpoint
- Action and Category (from endpoint registry)
- Request Body (with sensitive data redacted)
- Response Code
- IP Address and User Agent
- Timestamp

No code changes needed - it's automatic!

### Endpoint Registry

The system maintains a registry of all endpoints mapping them to:
- **Action**: Human-readable description (e.g., "Create User", "User Login")
- **Category**: Logical grouping (e.g., "Authentication", "User Management", "Inventory Management")
- **Description**: Detailed explanation of what the endpoint does

This allows logs to be intelligently categorized and searched.

### Log Viewing Features (Admin Only)

Admins can view and analyze system logs with powerful filtering:

**Filter Options:**
- **By Category**: Authentication, User Management, System Administration, etc.
- **By Time Period**: Today, Past Week, Past Month, Past Year, All Time
- **By Keyword**: Search across actions, endpoints, employee IDs, user names
- **By User**: View all activities of a specific user
- **By Response Code**: Filter by HTTP status codes (200, 401, 404, etc.)
- **By Method**: Filter by HTTP method (GET, POST, PUT, DELETE)

**Analytics Features:**
- **Statistics**: Total requests, requests by category, method, response code
- **Top Users**: Most active users by request count
- **Top Actions**: Most frequently performed actions
- **Error Rate**: Percentage of failed requests
- **Activity Timeline**: Hourly breakdown of system activity
- **User Activity Summary**: Per-user statistics and activity breakdown

**Export:**
- Download logs as CSV for external analysis (max 1000 records per export)

**Example Queries:**
```bash
# Get all user management logs from the past week
GET /api/logs?category=User%20Management&period=week

# Search for "admin" activities
GET /api/logs?keyword=admin

# Get user activity for user ID 5
GET /api/logs/user/5?period=month

# Get statistics for today
GET /api/logs/stats?period=today

# Export logs as CSV
GET /api/logs/export?period=week&category=Authentication
```

## User Management (Admin Only)

The system includes comprehensive user management functionality accessible through the System Administration dashboard.

### Features

#### Create User
- Generate unique employee IDs
- Assign roles: Admin, Inventory Manager, Machinery Operator, Driver, Supervisor
- Set department and contact information
- Auto-generate temporary passwords
- Force password change on first login
- Send welcome emails with credentials

#### Update User
- Modify user information (name, email, phone, role, department)
- Employee ID cannot be changed after creation
- All changes are tracked in system logs

#### Suspend/Activate User
- **Suspend**: Deactivates user account (sets `is_active = 0`)
- **Activate**: Reactivates suspended account (sets `is_active = 1`)
- Suspended users cannot login (checked during authentication)
- Status shown with visual badges (Active/Inactive)

#### Reset Password
- Generate new temporary password
- Automatically sets `force_password_change = 1`
- User must change password on next login
- Password displayed to admin for secure sharing

#### Delete User
- **Note**: Delete performs soft delete (deactivates account)
- User data is retained for audit purposes
- Cannot be undone (deactivated permanently)

### API Endpoints

```bash
# List all users with filtering
GET /api/users?role=Admin&status=active&search=john&page=1&limit=20

# Get specific user
GET /api/users/{id}

# Create new user
POST /api/users
{
  "employee_id": "EMP-020",
  "full_name": "John Doe",
  "email": "john@company.com",
  "phone": "+94771234567",
  "role": "Inventory Manager",
  "department": "Warehouse",
  "force_password_change": 1,
  "send_welcome_email": false
}

# Update user
PUT /api/users/{id}
{
  "full_name": "John Smith",
  "email": "john.smith@company.com",
  "role": "Supervisor"
}

# Suspend user
POST /api/users/{id}/deactivate

# Activate user
POST /api/users/{id}/activate

# Reset password
POST /api/users/{id}/reset-password

# Delete user (soft delete)
DELETE /api/users/{id}

# Get user statistics
GET /api/users/stats
```

### Authentication with Account Status

When a user attempts to login, the system checks:
1. Valid credentials (employee ID + password)
2. **Account status** (`is_active` must be `1`)
3. Password change requirement (`force_password_change` flag)

Suspended users receive: `"Your account has been deactivated. Please contact administrator."`

### User Statistics

The dashboard displays:
- Total users
- Active users count
- Inactive users count
- Users by role breakdown
- Recent user activity

### Access Control

All user management endpoints require **Admin role**. Enforced by `RoleMiddleware::requireRole('Admin')`.

## Development Tips

1. **Adding new routes**: Edit `public/index.php` and add routes using the router
2. **Creating services**: Put business logic in `app/services/`
3. **Adding middleware**: Create middleware in `app/middleware/`
4. **Custom validation**: Add validation methods in your models or create a Validator helper

## Security Notes

⚠️ **Important for Production:**
- Change `JWT_SECRET` in `config/config.php` to a strong random string
- Update database credentials
- Disable `display_errors` in production
- Use HTTPS in production
- Configure proper CORS settings
- Implement rate limiting
- Add input validation and sanitization

## License

MIT License

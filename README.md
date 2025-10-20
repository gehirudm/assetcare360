# AssetCare360 - Inventory Management System Backend

A PHP-based backend for an inventory management system with role-based access control, automatic database table creation, and request logging.

## Features

✅ **Auto Table Creation** - Database tables are automatically created from PHP model definitions  
✅ **Role-Based Access Control** - Easy-to-configure user roles with API restrictions  
✅ **Automatic Request Logging** - All API requests are logged with user information  
✅ **JWT Authentication** - Secure token-based authentication  
✅ **Clean Architecture** - Models for database operations, Services for business logic, Controllers for endpoints  

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
│   └── seed.php             # Database seeder
├── logs/                    # Log files (created automatically)
└── .htaccess                # Root URL rewriting
```

## User Roles

The system supports the following roles (in order of hierarchy):
1. **Admin** - Full system access
2. **Inventory Manager** - Manage inventory operations
3. **Supervisor** - Supervise operations
4. **Driver** - Driver-specific access
5. **Machinary Operator** - Equipment operation access

## Setup Instructions

### Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache with mod_rewrite enabled

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/gehirudm/Programming/AssetCare360/assetcare-backend-new
   ```

2. **Configure database connection**
   
   Edit `config/config.php` and update the database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'assetcare360');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   ```

3. **Create the database**
   ```sql
   CREATE DATABASE assetcare360;
   ```

4. **Seed the database with test users**
   ```bash
   php scripts/seed.php
   ```

5. **Configure your web server**
   
   Point your document root to the `public` folder or ensure `.htaccess` is working.

6. **Start your server**
   
   For local development with PHP built-in server:
   ```bash
   cd public
   php -S localhost:8000
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

#### Validate Token
```http
GET /api/auth/validate
```

**Authentication:** Cookie-based (automatic) or Authorization header

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

## Request Logging

All API requests are automatically logged to the `api_request_logs` table with:
- User ID and Employee ID
- HTTP Method and Endpoint
- Request Body (with sensitive data redacted)
- Response Code
- IP Address and User Agent
- Timestamp

No code changes needed - it's automatic!

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

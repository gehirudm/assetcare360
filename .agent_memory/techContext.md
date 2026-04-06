# Tech Context

## Stack
| Layer | Technology |
|---|---|
| Backend language | PHP 7.4+ |
| Database | MariaDB / MySQL 5.7+ via PDO |
| Auth | JWT (HS256) in HTTP-only cookie |
| Frontend | Vanilla HTML5 / CSS3 / JS (ES6+) |
| Dev server | `php -S localhost:8000` from `public/` |
| Email (dev) | Mailhog (`mailhog_config.json`) |

## Directory Structure
```
public/index.php          — Entry point, route registration
app/
  Router.php              — Request dispatcher
  controllers/            — One controller per resource
  models/                 — PDO models extending BaseModel
  middleware/             — RoleMiddleware, RequestLogger
  helpers/                — Response, JWTHelper
  services/               — AuthService
config/
  config.php              — DB/JWT/cookie constants; reads .env
  Database.php            — PDO singleton
migrations/               — Numbered migration scripts
pages/
  dashboard/
    technical-officer/    — TO role dashboard + fault-ticket-detail/
    supervisor/
    driver/
    ...
  auth/                   — Login page
  js/                     — Shared JS: config.js, api.js, auth.js, dashboard-init.js
testing/openapi.yaml      — OpenAPI spec (must be kept up to date)
```

## Development Setup
1. Copy `dev.env` → `.env`, configure DB credentials
2. Run `php setup.php` or manually create DB `assetcare360`
3. Run migrations: `php scripts/migrate.php migrate`
4. Serve: `php -S localhost:8000 -t public/`

## Key Config Constants (config.php)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `JWT_SECRET`, `JWT_EXPIRATION` (24h)
- `COOKIE_NAME = 'auth_token'`, `COOKIE_HTTPONLY = true`

## CSS Design Tokens (pages/dashboard/style.css)
- `--ok: #16a34a` (green, overridden in detail pages)
- `--royal-blue`, `--tang-blue`
- `--stone-100`, `--stone-200`, `--muted`
- `--card`, `--radius`, `--shadow-lg`
- `--text-600`, `--text-700`

## Constraints
- No Composer/autoloading — all `require_once` manually
- No JS bundler — plain `<script>` tags in correct load order
- `testing/openapi.yaml` **must** be updated whenever API changes
- `testing/postman/` collection should be updated for new endpoints

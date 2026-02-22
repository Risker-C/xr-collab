# XR Collab Mobile Scan SDK - Backend

Device capability detection and 4-tier grading system API service.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start server
npm run dev
```

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Testing:** Jest + Supertest
- **Validation:** Joi

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database & Redis configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Validation & error handling
│   ├── repositories/    # Database access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── index.js         # Application entry point
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── migrations/          # Database migrations
└── scripts/             # Utility scripts
```

## API Endpoints

- `POST /api/device/capability` - Analyze device and return tier
- `GET /api/device/stats` - Get tier statistics
- `GET /health` - Health check

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

## Device Tiers

| Tier | Score | Description |
|------|-------|-------------|
| Premium | 80-100 | Flagship devices with AR support |
| High | 60-79 | High-end devices |
| Medium | 40-59 | Mid-range devices |
| Low | 0-39 | Entry-level devices |

## Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
npm test               # Run all tests with coverage
npm run test:watch     # Run tests in watch mode
npm run test:integration  # Run integration tests only
npm run migrate        # Run database migrations
```

## Environment Variables

See `.env.example` for all configuration options.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Integration tests only
npm run test:integration
```

## License

MIT

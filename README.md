# Memorhythm

A musical memory game built with Vue 3 and TypeScript. Challenge yourself to replicate sequences of musical notes both positionally and rhythmically.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and provide the required values:
   - `KV_REST_API_URL` - Upstash Redis instance URL
   - `KV_REST_API_TOKEN` - Upstash Redis write token
   - `KV_REST_API_READ_ONLY_TOKEN` - Upstash Redis read-only token
   - `VITE_API_BASE_URL` - API base URL (http://localhost:3000 for local dev, production URL for production)

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run preview` - Preview production build
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run tests with Playwright UI
- `npm run test:e2e:headed` - Run tests in headed mode

## Environment Variables

The project requires these environment variables (see `.env.example`):

- **Redis Configuration** (get from [Upstash Console](https://console.upstash.com/redis)):
  - `KV_REST_API_URL` - Your Redis instance URL
  - `KV_REST_API_TOKEN` - Write access token
  - `KV_REST_API_READ_ONLY_TOKEN` - Read-only access token

- **API Configuration**:
  - `VITE_API_BASE_URL` - Base URL for API calls
    - Development: `http://localhost:3000` 
    - Production: `https://your-app.vercel.app`

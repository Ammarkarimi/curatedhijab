# HijabBilling

Simple HijabBilling app with Express backend and PostgreSQL persistence (Neon).

## Local development

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Docker deployment

Build the image:

```bash
docker build -t hijabbilling:latest .
```

Run the container:

```bash
docker run -p 3000:3000 hijabbilling:latest
```

The app will be available at `http://localhost:3000`.

## Deploy to a container platform

Any platform that supports Docker containers can run this app. Upload the repository or Docker image to services like:

- Render
- Railway
- Fly.io
- DigitalOcean App Platform
- AWS ECS / Fargate
- Google Cloud Run

### Notes

- The app uses PostgreSQL for durable persistence, configured via the `DATABASE_URL` environment variable.
- For local development, create a `.env` file based on `.env.example` to supply the local database connection string.
- The server listens on `process.env.PORT || 3000`.

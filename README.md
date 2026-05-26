# HijabBilling

Simple HijabBilling app with Express backend and SQLite persistence using `sql.js`.

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

- The app uses a local SQLite file (`orders.db`) for persistence.
- Container or cloud filesystem may be ephemeral; if you need durable storage, migrate to a managed database.
- The server listens on `process.env.PORT || 3000`.

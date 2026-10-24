# HydroMesh Operations Console (Next.js)

The official web frontend for the **HydroMesh** Himalayan Hydropower Decision Support System.

## Architecture

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4 + Mountain Fortress custom CSS design tokens (`--color-sky-deep`, `--color-cloud-rim`, `--color-arch-window-glow`)
- **Telemetry**: Native WebSockets connecting to FastAPI `/ws/stream`
- **Charts**: Recharts & High-contrast SVG arc gauges

## Getting Started

1. Ensure the Python FastAPI backend is running:
```bash
python -m hydromesh.api.app
```

2. Start the Next.js development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view the 4-phase user journey and operational mission control.

## Production Build

```bash
npm run build
npm run start
```


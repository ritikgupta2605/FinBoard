# FINBOARD

A customizable finance dashboard builder that lets you connect to any financial API and create real-time data widgets.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Features

- **Custom Widgets** - Create widgets from any finance API (stocks, crypto, forex, etc.)
- **Multiple Display Modes** - Cards, tables, line charts, and candlestick charts
- **Real-time Updates** - Auto-refresh with configurable intervals
- **Responsive Layout** - Drag-and-drop grid that adapts to all screen sizes
- **Data Caching** - Smart caching to reduce API calls
- **Theme Support** - Light and dark mode
- **Field Explorer** - Automatically discover and select data fields from API responses
- **Currency Detection** - Automatically detects currency from API responses
- **Persistent Storage** - Dashboard layouts and widget configurations auto-save to browser storage

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding a Widget

1. Click **"+ Add Widget"** or **"+ Add Your First Widget"**
2. Enter a name for your widget
3. Enter your API URL
4. (Optional) Add API key and header name if required for authentication
5. Click **"Test API"** to verify the connection and auto-detect currency
6. Select fields from the JSON explorer
7. Choose display mode (Card, Table, or Chart)
8. Set refresh interval (in seconds, 0 = disabled)
9. Click **"Add Widget"**

New widgets automatically appear side-by-side with existing widgets on the dashboard.

### Widget Types

**Card Widget** - Display key metrics in a card format
- Best for: Single values, price displays, key indicators

**Table Widget** - Show data in a sortable, filterable table
- Best for: Lists of stocks, market data, multiple records
- Features: Search, sorting, pagination, column filters

**Chart Widget** - Visualize time-series data
- Line Chart: Track trends over time
- Candlestick Chart: OHLC data visualization

### Managing Widgets

- **Drag & Drop** - Rearrange widgets by dragging the widget header
- **Resize** - Click and drag corners to resize
- **Edit** - Click the settings icon to modify widget configuration
- **Refresh** - Click the refresh icon for manual data update
- **Remove** - Click the delete icon to remove a widget from dashboard

### Widget Configuration

Each widget is automatically saved to browser storage with its:
- Position and size on the dashboard
- API connection settings
- Field selections and display configuration
- Refresh interval
- Detected currency information

Configurations persist across browser sessions, so your dashboard is always restored when you return.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Charts**: Recharts
- **Layout**: react-grid-layout
- **Storage**: LocalStorage

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   └── widgets/     # Widget components
├── hooks/           # Custom React hooks
├── store/           # Redux store and slices
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

## API Integration

FINBOARD works with any REST API that returns JSON. Common use cases:

- **Stock APIs**: Finnhub, Alpha Vantage, Yahoo Finance
- **Crypto APIs**: Coinbase, Binance, CoinGecko
- **Forex APIs**: ExchangeRate-API, Fixer.io
- **Economic Data**: FRED, World Bank API

### Authentication

Two methods supported:
1. **Query Parameters** - Add API key directly in URL (`?token=YOUR_KEY` or `?apikey=YOUR_KEY`)
2. **Header-based** - Provide API Key and custom header name (default: `x-api-key`)

The system will detect which authentication method works best for your API during testing.

### CORS Handling

If an API blocks browser requests, FINBOARD automatically uses a Next.js proxy route to fetch data server-side.

## Configuration

### Environment Variables

No environment variables required. All configuration is done through the UI.

### Cache Settings

- **Cache TTL**: How long to cache API responses (default: 30s)
- **Refresh Interval**: How often to fetch new data (0 = disabled)

## Tips

- Use the JSON field explorer to find the exact paths to your desired fields
- Set refresh interval based on your API rate limits (0 = no auto-refresh)
- Test your API connection before selecting fields to ensure proper authentication
- Detected currencies are automatically identified from API responses
- Drag widgets by their header (not the data area) to rearrange
- Refresh intervals are independent per widget - set different intervals for different data freshness needs
- Browser storage persists your dashboard configuration automatically


---


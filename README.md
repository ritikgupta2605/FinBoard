# FINBOARD

A Customizable Finance Dashboard where users can build their
own real-time finance monitoring dashboard by connecting to various financial APIs and displaying real-time data through customizable widgets.

## Features

- **Custom Widgets** - Users can create widgets from any finance API (stocks, crypto, forex, etc.)
- **Multiple Display Modes** - Cards, tables,charts.
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

Open (http://localhost:3000) in your browser.

## Usage

### Adding a Widget

1. Click on **"+ Add Widget"** or **"+ Add Your First Widget"**
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

 **Query Parameters** - Add API key directly in URL (`?token=YOUR_KEY` or `?apikey=YOUR_KEY`)

### CORS Handling

If an API blocks browser requests, FINBOARD automatically uses a Next.js proxy route to fetch data server-side.


- **Refresh Interval**: How often to fetch new data (0 = disabled)

---


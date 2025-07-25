# Bookmarks - Read Later App (Serverless + Supabase)

A Pocket-like bookmarking system for saving web pages to read later, built with serverless functions and Supabase PostgreSQL database for maximum affordability and ease of maintenance.

## Features

-   **Save Web Pages**: Add URLs and automatically extract title, description, and images
-   **Smart Metadata**: Uses web scraping to get page titles, descriptions, and preview images
-   **HTML Sanitization**: Automatically removes HTML tags from descriptions for clean, safe display
-   **Advanced Image Processing**: Automatic image optimization with WebP conversion and SVG support
-   **Tagging System**: Organize bookmarks with custom tags
-   **Search & Filter**: Find bookmarks by text, tags, read status, or favorites
-   **Read Status**: Mark bookmarks as read/unread
-   **Favorites**: Mark important bookmarks as favorites
-   **Responsive Design**: Works on desktop, tablet, and mobile devices
-   **Modern UI**: Clean, intuitive interface with smooth animations
-   **Serverless**: Zero server maintenance, automatic scaling
-   **PostgreSQL Database**: Robust, scalable data storage with Supabase

## Tech Stack

-   **Frontend**: Vanilla JavaScript with modern CSS, built with [Vite](https://vitejs.dev/)
-   **Backend**: Vercel Serverless Functions
-   **Database**: Supabase PostgreSQL (free tier)
-   **Web Scraping**: Cheerio for metadata extraction + open-graph-scraper with HTML sanitization
-   **Image Processing**: Sharp for WebP conversion, native SVG support
-   **Storage**: Supabase Storage for image thumbnails
-   **Testing**: Jest for unit tests with comprehensive URL resolution coverage and organized test output
-   **Deployment**: Vercel (free tier)

## Image Handling

The app includes sophisticated image processing capabilities:

### Supported Formats

-   **Raster Images**: JPG, PNG, WebP, GIF - automatically optimized and converted to WebP
-   **Vector Images**: SVG - stored natively for perfect scalability
-   **Fallback**: Generates placeholder images with dominant colors when no image is available

### Processing Features

-   **Automatic Optimization**: Images are resized, compressed, and converted to WebP for faster loading
-   **SVG Preservation**: SVG images are detected and stored as-is to maintain their scalable properties
-   **Smart Thumbnails**: Generates 360x240px thumbnails with 40% quality for optimal performance
-   **Universal URL Resolution**: Automatically converts relative image URLs to absolute URLs regardless of extraction method
-   **Error Handling**: Gracefully handles invalid or inaccessible images

## Quick Start

### Prerequisites

1. Install Vercel CLI:

    ```bash
    npm i -g vercel
    ```

2. Navigate to the bookmarks directory:

    ```bash
    cd bookmarks
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

### Supabase Setup

**Follow the complete setup guide**: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)

Quick steps:

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the database migration from `supabase/migrations/001_create_bookmarks_table.sql`
4. Get your API keys from Settings → API
5. Set environment variables (see setup guide)

### Development

1. Create `.env.local` file with your Supabase credentials:

    ```bash
    SUPABASE_URL=https://your-project-id.supabase.co
    SUPABASE_ANON_KEY=your-anon-key-here
    ```

2. Start the development servers (frontend + API):

    ```bash
    npm run watch
    ```

    - This runs both the Vite frontend (on port 4422) and the Vercel API dev server (on port 4433).
    - Vite proxies `/api` requests to the Vercel dev server.

3. Open your browser and go to `http://localhost:4422`

### Deployment

1. Deploy to Vercel:

    ```bash
    npm run deploy
    ```

2. Add environment variables in Vercel dashboard:

    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`

3. Your app will be live at `https://your-app-name.vercel.app`

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- urlResolver.test.js
npm test -- imageProcessor.test.js

# Run tests with visual output (generates test files)
IS_LOCAL=true npm test
```

Test output files are automatically organized in `test-results/` directory and ignored by git.

## File Structure

```
bookmarks/
├── api/                   # Serverless functions (Vercel API routes)
│   ├── bookmarks.js
│   ├── bookmarks/
│   │   └── [id].js
│   │   └── image/
│   │       └── [id].js
│   └── tags.js
├── lib/                   # Shared utilities (backend only)
│   ├── imageProcessor.js
│   ├── supabase.js
│   └── imageProcessor.test.js
├── index.html              # Main HTML page (Vite entry, at project root)
├── public/                # Static assets (favicon, manifest, sw.js, index.js, index.css)
├── src/                   # Vite entry point and frontend glue
│   └── main.js            # Vite entry (imports public/index.js and index.css)
├── supabase/              # Database migrations
│   └── migrations/
│       ├── 001_create_bookmarks_table.sql
│       └── 002_add_image_storage_url_to_bookmarks.sql
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── vercel.json            # Vercel configuration
├── SETUP_SUPABASE.md      # Supabase setup guide
└── README.md              # This file
```

## Available Scripts

-   `npm run watch` - Start both Vite frontend and Vercel API dev server concurrently
-   `npm run vite` - Start only the Vite frontend (for debugging)
-   `npm run vercel` - Start only the Vercel API dev server (for debugging)
-   `npm run deploy` - Deploy to Vercel production
-   `npm test` - Run backend tests with Jest

## API Endpoints

The application provides serverless API functions:

-   `GET /api/bookmarks` - Get all bookmarks (with optional filters)
-   `POST /api/bookmarks` - Create a new bookmark
-   `GET /api/bookmarks/[id]` - Get a specific bookmark
-   `PUT /api/bookmarks/[id]` - Update a bookmark
-   `DELETE /api/bookmarks/[id]` - Delete a bookmark
-   `GET /api/tags` - Get all available tags

## Database Schema

The Supabase PostgreSQL database uses the following schema:

```sql
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image TEXT,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_status INTEGER DEFAULT 0,
    favorite INTEGER DEFAULT 0
);
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**

    - Check your `.env.local` file for local development
    - Verify Vercel environment variables for production

2. **"Database error"**

    - Ensure the migration ran successfully in Supabase
    - Check your API keys are correct
    - Verify the table exists in Supabase dashboard

3. **"Function timeout"**: Increase `maxDuration` in vercel.json
4. **"CORS errors"**: Check that CORS headers are set in API functions

### Vercel Logs

Check function logs in the Vercel dashboard or via CLI:

```bash
vercel logs
```

### Supabase Logs

Check database logs in the Supabase dashboard:

1. Go to your project dashboard
2. Navigate to **Logs** → **Database**
3. Check for any errors

## Why This Stack?

-   **Cost**: Completely free for personal use
-   **Maintenance**: Zero server management
-   **Scalability**: Automatic scaling based on demand
-   **Reliability**: 99.9% uptime SLA from both Vercel and Supabase
-   **Global**: CDN distribution worldwide

# Bookmarks - Read Later App (Serverless + Supabase)

A Pocket-like bookmarking system for saving web pages to read later, built with serverless functions and Supabase PostgreSQL database for maximum affordability and ease of maintenance.

## Features

- **Save Web Pages**: Add URLs and automatically extract title, description, and images
- **Smart Metadata**: Uses web scraping to get page titles, descriptions, and preview images
- **Tagging System**: Organize bookmarks with custom tags
- **Search & Filter**: Find bookmarks by text, tags, read status, or favorites
- **Read Status**: Mark bookmarks as read/unread
- **Favorites**: Mark important bookmarks as favorites
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Serverless**: Zero server maintenance, automatic scaling
- **PostgreSQL Database**: Robust, scalable data storage with Supabase

## Tech Stack

- **Frontend**: Vanilla JavaScript with modern CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase PostgreSQL (free tier)
- **Web Scraping**: Cheerio for metadata extraction
- **Deployment**: Vercel (free tier)

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

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and go to `http://localhost:3000`

### Deployment

1. Deploy to Vercel:
   ```bash
   npm run deploy
   ```

2. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. Your app will be live at `https://your-app-name.vercel.app`

## Cost Analysis

### Vercel Free Tier
- **Bandwidth**: 100GB/month
- **Function Executions**: 100/day
- **Build Minutes**: 6,000/month
- **Cost**: $0/month

### Supabase Free Tier
- **Database**: 500MB storage
- **Database rows**: 50,000 rows
- **API requests**: 50,000 requests/month
- **Realtime connections**: 2 concurrent
- **Cost**: $0/month

**Total cost: $0/month** for most personal use cases!

## Usage

### Adding Bookmarks

1. Click the "Add Bookmark" button
2. Enter the URL of the page you want to save
3. Optionally add tags (comma-separated)
4. Click "Add Bookmark"

The system will automatically:
- Extract the page title and description
- Get the page's preview image (if available)
- Save the bookmark to your Supabase database

### Managing Bookmarks

- **Search**: Use the search bar to find bookmarks by title, description, or URL
- **Filter by Tags**: Select a tag to see only bookmarks with that tag
- **Filter by Status**: Show only read or unread bookmarks
- **Filter by Favorites**: Show only your favorite bookmarks
- **Sort**: Sort by date added, title, or last modified

### Editing Bookmarks

1. Click the edit button (pencil icon) on any bookmark
2. Modify the title, description, tags, read status, or favorite status
3. Click "Save Changes"

### Deleting Bookmarks

1. Click the delete button (trash icon) on any bookmark
2. Confirm the deletion

## API Endpoints

The application provides serverless API functions:

- `GET /api/bookmarks` - Get all bookmarks (with optional filters)
- `POST /api/bookmarks` - Create a new bookmark
- `GET /api/bookmarks/[id]` - Get a specific bookmark
- `PUT /api/bookmarks/[id]` - Update a bookmark
- `DELETE /api/bookmarks/[id]` - Delete a bookmark
- `GET /api/tags` - Get all available tags

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

## File Structure

```
bookmarks/
├── api/                   # Serverless functions
│   ├── bookmarks.js      # Main bookmarks API
│   ├── bookmarks/
│   │   └── [id].js       # Individual bookmark operations
│   └── tags.js           # Tags API
├── lib/                   # Shared utilities
│   └── supabase.js       # Supabase client configuration
├── supabase/              # Database migrations
│   └── migrations/
│       └── 001_create_bookmarks_table.sql
├── public/               # Frontend files
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styles
│   └── app.js           # JavaScript application
├── package.json          # Dependencies and scripts
├── vercel.json          # Vercel configuration
├── SETUP_SUPABASE.md    # Supabase setup guide
└── README.md            # This file
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Vercel production
- `npm start` - Start development server (alias for dev)

## Browser Extension Integration

To make this even more like Pocket, you could create a browser extension that adds a "Save to Bookmarks" button to your browser toolbar. The extension would:

1. Capture the current page URL
2. Send it to your bookmarks API
3. Show a success notification

## Future Enhancements

- **User Authentication**: Add user accounts with Supabase Auth
- **Categories**: Organize bookmarks into folders/categories
- **Import/Export**: Import bookmarks from Pocket, browser bookmarks, etc.
- **Reading View**: Built-in article reader with text extraction
- **Mobile App**: PWA features for mobile access
- **Sharing**: Share bookmarks with others
- **Analytics**: Track reading habits and statistics
- **Offline Support**: Service worker for offline access
- **Realtime Updates**: Use Supabase realtime for live updates

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

- **Cost**: Completely free for personal use
- **Maintenance**: Zero server management
- **Scalability**: Automatic scaling based on demand
- **Reliability**: 99.9% uptime SLA from both Vercel and Supabase
- **Global**: CDN distribution worldwide
- **Security**: Built-in DDoS protection and RLS
- **Database**: Full PostgreSQL with real-time capabilities

## License

This project is part of the Assistant experiments repository. 
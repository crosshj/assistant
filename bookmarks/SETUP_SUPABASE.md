# Supabase Setup Guide

This guide will help you set up Supabase as the database for your bookmarks app.

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up with GitHub
3. Create a new organization (free)

## Step 2: Create a New Project

1. Click "New Project"
2. Choose your organization
3. Enter project details:
   - **Name**: `bookmarks-app` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait for the project to be created (2-3 minutes)

## Step 3: Get Your API Keys

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## Step 4: Set Up the Database

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_create_bookmarks_table.sql`
4. Click "Run" to execute the migration

## Step 5: Configure Environment Variables

### For Local Development

Create a `.env.local` file in your bookmarks directory:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `SUPABASE_ANON_KEY` = `your-anon-key-here`

## Step 6: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try adding a bookmark through the web interface
3. Check your Supabase dashboard → **Table Editor** → **bookmarks** to see if the data appears

## Step 7: Deploy to Production

1. Deploy to Vercel:
   ```bash
   npm run deploy
   ```

2. Make sure your environment variables are set in Vercel
3. Test the production app

## Supabase Free Tier Limits

- **Database**: 500MB storage
- **Database rows**: 50,000 rows
- **API requests**: 50,000 requests/month
- **Realtime connections**: 2 concurrent connections
- **Edge Functions**: 500,000 invocations/month

For a personal bookmarking app, this should be more than enough!

## Security Considerations

The current setup allows all operations on the bookmarks table. For production, you might want to:

1. **Add authentication** with Supabase Auth
2. **Restrict access** with Row Level Security (RLS) policies
3. **Add rate limiting** to prevent abuse

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Make sure you've set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - For local dev, check your `.env.local` file
   - For production, check Vercel environment variables

2. **"Database error"**
   - Check if the migration ran successfully
   - Verify your API keys are correct
   - Check Supabase logs in the dashboard

3. **"Permission denied"**
   - Make sure RLS policies are set up correctly
   - Check if the table exists and has the right permissions

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Vercel Documentation](https://vercel.com/docs) 
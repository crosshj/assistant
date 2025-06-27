-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_read_status ON bookmarks(read_status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(favorite);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(to_tsvector('english', tags));

-- Enable Row Level Security (RLS)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for now - you can restrict this later)
CREATE POLICY "Allow all operations" ON bookmarks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_bookmarks_updated_at 
    BEFORE UPDATE ON bookmarks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 
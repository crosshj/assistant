import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all bookmarks with tags
    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('tags')
      .not('tags', 'is', null)
      .neq('tags', '');
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const tagSet = new Set();
    
    bookmarks.forEach(bookmark => {
      if (bookmark.tags) {
        bookmark.tags.split(',').forEach(tag => {
          tagSet.add(tag.trim());
        });
      }
    });
    
    const tags = Array.from(tagSet).sort();
    res.status(200).json(tags);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
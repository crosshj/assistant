import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get single bookmark
      const { data: bookmark, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Bookmark not found' });
        }
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(200).json(bookmark);
      
    } else if (req.method === 'PUT') {
      // Update bookmark
      const { title, description, tags, read_status, favorite } = req.body;
      
      const updates = {
        updated_at: new Date().toISOString()
      };
      
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (tags !== undefined) updates.tags = tags;
      if (read_status !== undefined) updates.read_status = read_status;
      if (favorite !== undefined) updates.favorite = favorite;
      
      const { data: bookmark, error } = await supabase
        .from('bookmarks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Bookmark not found' });
        }
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to update bookmark' });
      }
      
      res.status(200).json(bookmark);
      
    } else if (req.method === 'DELETE') {
      // Delete bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to delete bookmark' });
      }
      
      res.status(200).json({ message: 'Bookmark deleted successfully' });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
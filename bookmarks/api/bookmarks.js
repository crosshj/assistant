import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../lib/supabase.js';

// Helper function to extract metadata from URL
async function extractMetadata(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[name="twitter:image"]').attr('content') || '';
    
    return {
      title: title.trim(),
      description: description.trim(),
      image: image.trim()
    };
  } catch (error) {
    console.error('Error extracting metadata:', error.message);
    return {
      title: '',
      description: '',
      image: ''
    };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get all bookmarks with optional filtering
      const { search, tag, read, favorite, sort = 'created_at', order = 'DESC' } = req.query;
      
      let query = supabase
        .from('bookmarks')
        .select('*');
      
      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`);
      }
      
      if (tag) {
        query = query.ilike('tags', `%${tag}%`);
      }
      
      if (read !== undefined) {
        query = query.eq('read_status', parseInt(read));
      }
      
      if (favorite !== undefined) {
        query = query.eq('favorite', parseInt(favorite));
      }
      
      // Apply sorting
      query = query.order(sort, { ascending: order === 'ASC' });
      
      const { data: bookmarks, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(200).json(bookmarks || []);
      
    } else if (req.method === 'POST') {
      // Create new bookmark
      const { url, tags = '' } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      const metadata = await extractMetadata(url);
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const newBookmark = {
        id,
        url,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        tags,
        created_at: now,
        updated_at: now,
        read_status: 0,
        favorite: 0
      };
      
      const { data, error } = await supabase
        .from('bookmarks')
        .insert([newBookmark])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to create bookmark' });
      }
      
      res.status(201).json(data);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
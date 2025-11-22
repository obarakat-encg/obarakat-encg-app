/**
 * Cloudflare R2 Upload API Endpoint
 * 
 * This file can be deployed as:
 * 1. Cloudflare Worker
 * 2. Vercel Serverless Function
 * 3. Netlify Function
 * 4. Node.js Express endpoint
 * 
 * IMPORTANT: Never expose R2 credentials in client-side code!
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME;

/**
 * Upload file to R2
 */
export async function uploadToR2(file, path) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: file,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${path}`;

    return {
      success: true,
      url: publicUrl,
      path: path,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw error;
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(path) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await s3Client.send(command);

    return {
      success: true,
    };
  } catch (error) {
    console.error('R2 delete error:', error);
    throw error;
  }
}

// ============ Serverless Function Handlers ============

/**
 * Vercel/Netlify Serverless Function Handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication (implement your auth logic)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      // Handle file upload
      const { file, path } = req.body;
      
      if (!file || !path) {
        return res.status(400).json({ error: 'Missing file or path' });
      }

      const result = await uploadToR2(file, path);
      return res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      // Handle file deletion
      const { path } = req.body;
      
      if (!path) {
        return res.status(400).json({ error: 'Missing path' });
      }

      const result = await deleteFromR2(path);
      return res.status(200).json(result);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery } from '../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userName, userId, jsonData } = req.body;

    const result = await executeQuery({
      query: 'INSERT INTO UserData (UserName, json_data, UserID) VALUES (?, ?, ?)',
      values: [userName, JSON.stringify(jsonData), userId]
    });

    return res.status(200).json({ 
      message: 'Quiz data saved successfully',
      result 
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
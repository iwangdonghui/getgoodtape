import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface SubscriptionData {
  email: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'subscriptions.json');
    
    let subscribers: SubscriptionData[] = [];
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      subscribers = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist yet, return empty array
      subscribers = [];
    }

    // Sort by timestamp (newest first)
    subscribers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      count: subscribers.length,
      subscribers
    });

  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
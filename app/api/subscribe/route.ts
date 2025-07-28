import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface SubscriptionData {
  email: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email: string };
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Prepare subscription data
    const subscriptionData: SubscriptionData = {
      email: email.toLowerCase().trim(),
      timestamp: new Date().toISOString(),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Save to file (in production, you'd use a database)
    await saveSubscription(subscriptionData);

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to GetGoodTape updates!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function saveSubscription(data: SubscriptionData): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'subscriptions.json');

  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // Read existing subscriptions
    let subscriptions: SubscriptionData[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      subscriptions = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      subscriptions = [];
    }

    // Check if email already exists
    const existingSubscription = subscriptions.find(
      sub => sub.email === data.email
    );

    if (existingSubscription) {
      // Update existing subscription timestamp
      existingSubscription.timestamp = data.timestamp;
      existingSubscription.ip = data.ip;
      existingSubscription.userAgent = data.userAgent;
    } else {
      // Add new subscription
      subscriptions.push(data);
    }

    // Save updated subscriptions
    await fs.writeFile(filePath, JSON.stringify(subscriptions, null, 2));

    console.log(`New subscription: ${data.email} at ${data.timestamp}`);
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

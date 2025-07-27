export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    service: 'GetGoodTape Landing Page'
  });
}
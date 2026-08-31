import { seedDemoData } from '../../../db/seed';

export async function GET(_request: Request): Promise<Response> {
  try {
    await seedDemoData();
    return new Response(JSON.stringify({ seeded: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

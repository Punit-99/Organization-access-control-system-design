import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth-token');
  response.cookies.delete('refresh-token');
  return response;
}

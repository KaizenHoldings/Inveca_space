import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set({
    name: 'auth_token',
    value: '',
    path: '/',
    expires: new Date(0),
    maxAge: 0
  });
  
  response.cookies.delete('auth_token');
  
  return response;
}

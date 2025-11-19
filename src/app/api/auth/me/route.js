import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    const cookieStore = request.cookies;
    const token = cookieStore.get('auth')?.value || '';

    if (!token) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Best-effort decode. We avoid verifying since the secret is backend-owned.
    let user = null;
    try {
      // Prefer decode; do not verify signature here
      user = jwt.decode(token);
      if (user && user.id) {
        user = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name || '',
        };
      } else {
        user = null;
      }
    } catch {
      user = null;
    }

    return NextResponse.json({
      success: true,
      user: user || null,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



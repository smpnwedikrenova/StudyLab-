import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

const ADMIN_EMAIL = "irfandwi.hs@gmail.com"; "smpnwedikrenova@gmail.com";

export async function POST(request: Request) {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY.' }, { status: 500 });
    }

    const { uid, idToken } = await request.json();

    if (!uid || !idToken) {
      return NextResponse.json({ error: 'Missing uid or idToken' }, { status: 400 });
    }

    // Verify the requester is the admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (decodedToken.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the user from Authentication
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user from Auth:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

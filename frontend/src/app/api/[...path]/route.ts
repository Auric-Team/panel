import { NextRequest, NextResponse } from 'next/server';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://103.207.181.125:20067';
const BACKEND_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathStr = params.path ? params.path.join('/') : '';
  const url = `${BACKEND_URL}/${pathStr}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key !== 'host' && key !== 'content-length') {
      headers.set(key, value);
    }
  });

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;
    
    const backendRes = await fetch(url, {
      method: req.method,
      headers: headers,
      body: body,
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'content-encoding' && lowerKey !== 'content-length' && lowerKey !== 'transfer-encoding') {
        resHeaders.set(key, value);
      }
    });

    const resData = await backendRes.arrayBuffer();
    return new NextResponse(resData, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: 'Failed to communicate with remote backend server', details: String(error) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handleProxy(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

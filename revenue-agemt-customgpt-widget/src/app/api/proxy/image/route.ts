import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// In-memory cache for images (cleared on server restart)
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 100; // Max number of images to cache

/**
 * Image proxy to bypass COEP restrictions
 * GET /api/proxy/image?url=<encoded_url>
 *
 * Includes in-memory caching to speed up repeated image loads
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomGPT-Widget/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get the image buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Cache the image (evict oldest if cache is full)
    if (imageCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }
    imageCache.set(imageUrl, { buffer, contentType, timestamp: Date.now() });

    // Return the image with CORP header
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('[Image Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

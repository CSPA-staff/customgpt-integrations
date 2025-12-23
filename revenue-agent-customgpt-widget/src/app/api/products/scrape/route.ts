import { NextRequest, NextResponse } from 'next/server';

/**
 * Product metadata scraper API endpoint
 * Extracts product information from HTML including OG tags, meta tags, and structured data
 * Includes in-memory caching for faster repeated lookups
 */

// In-memory cache for product data (cleared on server restart)
const productCache = new Map<string, { data: ProductMetadata; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 200; // Max number of products to cache

interface ProductMetadata {
  title: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;
  rating?: string;
  reviewCount?: string;
  condition?: string;
  sku?: string;
  url: string;
}

/**
 * Extract Open Graph metadata from HTML
 */
function extractOGData(html: string): Partial<ProductMetadata> {
  const ogData: Partial<ProductMetadata> = {};

  // Extract OG tags
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const ogPrice = html.match(/<meta\s+property=["']og:price:amount["']\s+content=["']([^"']+)["']/i);
  const ogCurrency = html.match(/<meta\s+property=["']og:price:currency["']\s+content=["']([^"']+)["']/i);

  if (ogTitle) ogData.title = ogTitle[1];
  if (ogDesc) ogData.description = ogDesc[1];
  if (ogImage) ogData.image = ogImage[1];
  if (ogPrice) ogData.price = ogPrice[1];
  if (ogCurrency) ogData.currency = ogCurrency[1];

  return ogData;
}

/**
 * Extract Twitter Card metadata from HTML
 */
function extractTwitterData(html: string): Partial<ProductMetadata> {
  const twitterData: Partial<ProductMetadata> = {};

  const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
  const twitterDesc = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
  const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

  if (twitterTitle) twitterData.title = twitterTitle[1];
  if (twitterDesc) twitterData.description = twitterDesc[1];
  if (twitterImage) twitterData.image = twitterImage[1];

  return twitterData;
}

/**
 * Extract standard meta tags from HTML
 */
function extractMetaTags(html: string): Partial<ProductMetadata> {
  const metaData: Partial<ProductMetadata> = {};

  const metaTitle = html.match(/<title>([^<]+)<\/title>/i);
  const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  if (metaTitle) metaData.title = metaTitle[1];
  if (metaDesc) metaData.description = metaDesc[1];

  return metaData;
}

/**
 * Extract JSON-LD structured data (Product schema)
 */
function extractJSONLD(html: string): Partial<ProductMetadata> {
  const jsonldData: Partial<ProductMetadata> = {};

  // Find all JSON-LD script tags
  const jsonldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonldMatches) {
    try {
      const data = JSON.parse(match[1]);

      // Handle single Product or array of items
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Check if it's a Product type
        if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
          if (item.name) jsonldData.title = item.name;
          if (item.description) jsonldData.description = item.description;
          if (item.image) {
            // Handle image as string, array, or object
            if (typeof item.image === 'string') {
              jsonldData.image = item.image;
            } else if (Array.isArray(item.image)) {
              jsonldData.image = item.image[0];
            } else if (item.image?.url) {
              jsonldData.image = item.image.url;
            }
          }

          // Extract offer/price data
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer.price) jsonldData.price = offer.price.toString();
            if (offer.priceCurrency) jsonldData.currency = offer.priceCurrency;
            if (offer.availability) {
              const avail = offer.availability.split('/').pop() || offer.availability;
              jsonldData.availability = avail;
            }
          }

          // Extract brand
          if (item.brand) {
            jsonldData.brand = typeof item.brand === 'string' ? item.brand : item.brand?.name;
          }

          // Extract rating and reviews
          if (item.aggregateRating) {
            if (item.aggregateRating.ratingValue) {
              jsonldData.rating = item.aggregateRating.ratingValue.toString();
            }
            if (item.aggregateRating.reviewCount) {
              jsonldData.reviewCount = item.aggregateRating.reviewCount.toString();
            }
          }

          // Extract condition
          if (item.itemCondition) {
            const cond = item.itemCondition.split('/').pop() || item.itemCondition;
            jsonldData.condition = cond;
          }

          // Extract SKU
          if (item.sku) {
            jsonldData.sku = item.sku;
          }

          // If we found product data, stop looking
          if (jsonldData.title) break;
        }
      }

      if (jsonldData.title) break;
    } catch (e) {
      // Invalid JSON, continue to next script tag
      continue;
    }
  }

  return jsonldData;
}

/**
 * Merge metadata from multiple sources with priority
 * Priority: JSON-LD > OG tags > Twitter Cards > Meta tags
 */
function mergeMetadata(sources: Partial<ProductMetadata>[]): Partial<ProductMetadata> {
  const merged: Partial<ProductMetadata> = {};

  for (const source of sources.reverse()) {
    Object.assign(merged, source);
  }

  return merged;
}

/**
 * Make URL absolute if it's relative
 */
function makeAbsoluteURL(url: string, baseURL: string): string {
  try {
    return new URL(url, baseURL).href;
  } catch {
    return url;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedURL: URL;
    try {
      parsedURL = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = productCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductScraperBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract metadata from different sources
    const jsonld = extractJSONLD(html);
    const og = extractOGData(html);
    const twitter = extractTwitterData(html);
    const meta = extractMetaTags(html);

    // Merge with priority
    const merged = mergeMetadata([meta, twitter, og, jsonld]);

    // Make image URL absolute if needed and proxy it
    let proxiedImageUrl = merged.image;
    if (merged.image) {
      const absoluteImageUrl = makeAbsoluteURL(merged.image, parsedURL.origin);

      // Proxy external images to bypass COEP restrictions
      // Use the same proxy endpoint as avatars
      proxiedImageUrl = `/api/proxy/image?url=${encodeURIComponent(absoluteImageUrl)}`;
    }

    const productData: ProductMetadata = {
      url: url,
      title: merged.title || parsedURL.hostname,
      description: merged.description,
      image: proxiedImageUrl,
      price: merged.price,
      currency: merged.currency,
      availability: merged.availability,
      brand: merged.brand,
      rating: merged.rating,
      reviewCount: merged.reviewCount
    };

    // Cache the product data (evict oldest if cache is full)
    if (productCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = productCache.keys().next().value;
      if (oldestKey) productCache.delete(oldestKey);
    }
    productCache.set(url, { data: productData, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: productData
    });

  } catch (error: any) {
    console.error('Product scrape error:', error);

    return NextResponse.json(
      {
        error: 'Failed to scrape product data',
        details: error.message
      },
      { status: 500 }
    );
  }
}

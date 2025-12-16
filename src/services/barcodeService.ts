/**
 * Barcode lookup service
 * Fetches product details from barcode APIs
 */

export interface BarcodeProductInfo {
  barcode: string;
  name?: string;
  brand?: string;
  model?: string;
  imageUrl?: string;
  category?: string;
  description?: string;
  // Shoe-specific fields that can be mapped
  styleId?: string;
  color?: string;
  releaseDate?: string;
  retailValue?: number;
}

/**
 * Lookup product information using UPCitemdb API (free, no API key required)
 * API Documentation: https://www.upcitemdb.com/api
 */
export const lookupProductByBarcode = async (
  barcode: string
): Promise<BarcodeProductInfo | null> => {
  try {
    console.log('🔍 Looking up product for barcode:', barcode);
    
    // Clean the barcode (remove spaces, dashes)
    const cleanBarcode = barcode.replace(/[\s-]/g, '');
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      console.warn('Invalid barcode format:', barcode);
      return null;
    }

    // Try UPCitemdb API first (free, no key needed)
    const upcitemdbUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanBarcode}`;
    
    const response = await fetch(upcitemdbUrl);
    
    if (!response.ok) {
      console.warn('UPCitemdb API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.code !== 'OK' || !data.items || data.items.length === 0) {
      console.log('No product found for barcode:', barcode);
      return null;
    }

    const item = data.items[0];
    
    // Map API response to our product info format
    const productInfo: BarcodeProductInfo = {
      barcode: cleanBarcode,
      name: item.title || item.description,
      brand: item.brand,
      model: item.model,
      imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
      category: item.category,
      description: item.description,
      // Try to extract style ID from title/description (common in shoe barcodes)
      styleId: extractStyleId(item.title || item.description || ''),
      color: extractColor(item.title || item.description || ''),
    };

    console.log('✅ Product found:', productInfo);
    return productInfo;
  } catch (error) {
    console.error('Error looking up barcode:', error);
    return null;
  }
};

/**
 * Extract style ID from product title/description
 * Common patterns: "Style: XXX-XXX", "SKU: XXX", etc.
 */
const extractStyleId = (text: string): string | undefined => {
  if (!text) return undefined;
  
  // Look for patterns like: Style: XXX-XXX, SKU: XXX, Style ID: XXX
  const stylePatterns = [
    /style[:\s]+([A-Z0-9-]+)/i,
    /sku[:\s]+([A-Z0-9-]+)/i,
    /style\s*id[:\s]+([A-Z0-9-]+)/i,
  ];

  for (const pattern of stylePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
};

/**
 * Extract color from product title/description
 */
const extractColor = (text: string): string | undefined => {
  if (!text) return undefined;
  
  const colorPatterns = [
    /color[:\s]+([A-Za-z\s]+)/i,
    /colour[:\s]+([A-Za-z\s]+)/i,
  ];

  for (const pattern of colorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
};

/**
 * Fallback: Try alternative barcode lookup APIs
 * This can be extended with other APIs like Open Product Data, etc.
 */
export const lookupProductByBarcodeFallback = async (
  barcode: string
): Promise<BarcodeProductInfo | null> => {
  // TODO: Implement fallback API if needed
  // Examples:
  // - Open Product Data API
  // - Barcode Lookup API
  // - Your own product database
  
  return null;
};

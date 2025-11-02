// Type definitions for the app

export interface User {
  id: string;
  email?: string;
  name?: string;
}

export interface ShoeItem {
  id: string;
  name: string;
  brand: string;
  size: number;
  value: number;
  imageUrl?: string;
  barcode?: string;
}



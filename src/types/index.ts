export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  jobTitle?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  coordinates?: string | null;
  website?: string | null;
  instagram?: string | null;
  pix?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  cardId?: string | null;
  youtubeUrl?: string | null;
  headerColor?: string | null;
  createdAt: string;
  role?: string;
  shipping_address?: {
    zipcode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    email?: string;
    phone?: string;
  };
}

export interface CartItem {
  id: string;
  quantity: number;
  price: number;
  title: string;
  imageUrl: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  user_id: string;
  customerName: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  shipping_address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
    email?: string;
    phone?: string;
  };
}
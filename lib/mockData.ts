export interface Product {
  id: string;
  name: string;
  category: string;
  petType: string;
  brand: string;
  price: number;
  discountPrice?: number;
  stock: number;
  sku: string;
  weight?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  petType: string;
  productCount: number;
  status: 'Active' | 'Inactive';
  image: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  itemsCount: number;
  amount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  orderStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpend: number;
  status: 'Active' | 'Inactive';
  joinDate: string;
  petsCount: number;
}

export interface Doctor {
  id: string;
  name: string;
  photo: string;
  qualification: string;
  specialization: string;
  experience: string;
  phone: string;
  email: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  appointmentsCount: number;
}

export interface ClinicService {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  status: 'Active' | 'Inactive';
}

export interface Vaccination {
  id: string;
  name: string;
  petType: string;
  description: string;
  price: number;
  duration: string;
  ageRecommendation: string;
  status: 'Active' | 'Inactive';
}

export interface Appointment {
  id: string;
  petName: string;
  petType: string;
  ownerName: string;
  ownerPhone: string;
  service: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
}

export interface PetPatient {
  id: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Rabbit' | 'Bird';
  breed: string;
  age: string;
  ownerName: string;
  ownerPhone: string;
  photo: string;
  lastVisit: string;
  medicalNotes: string;
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'PRD-101',
    name: 'Chicken & Green Pea Recipe',
    category: 'Food',
    petType: 'Dog',
    brand: 'NutriPet Prime',
    price: 28.99,
    discountPrice: 24.99,
    stock: 45,
    sku: 'NP-CHK-25KG',
    weight: '2.5 kg',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&auto=format&fit=crop',
    description: 'Grain-free nutrition rich in real chicken protein and omega fatty acids.',
  },
  {
    id: 'PRD-102',
    name: 'Interactive Tug & Chew Toy',
    category: 'Toys',
    petType: 'Dog',
    brand: 'PawPlay Fun',
    price: 14.50,
    discountPrice: 12.00,
    stock: 8,
    sku: 'PP-TUG-M',
    weight: '350 g',
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=300&auto=format&fit=crop',
    description: 'Durable non-toxic natural rubber toy designed for active chewers.',
  },
  {
    id: 'PRD-103',
    name: 'Salmon Crunchy Treats',
    category: 'Treats',
    petType: 'Cat',
    brand: 'OceanBites',
    price: 9.99,
    stock: 120,
    sku: 'OB-SAL-250G',
    weight: '250 g',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop',
    description: 'Irresistible crispy treats loaded with wild salmon oil for skin & coat health.',
  },
  {
    id: 'PRD-104',
    name: 'Organic Oat Grooming Shampoo',
    category: 'Grooming',
    petType: 'All Pets',
    brand: 'PureGroom Organic',
    price: 18.25,
    stock: 3,
    sku: 'PG-OAT-500ML',
    weight: '500 ml',
    status: 'Low Stock',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300&auto=format&fit=crop',
    description: 'Soap-free soothing formula designed for sensitive pet skin.',
  },
  {
    id: 'PRD-105',
    name: 'Premium Leather Leash & Collar Set',
    category: 'Care',
    petType: 'Dog',
    brand: 'UrbanPaw Luxe',
    price: 32.00,
    discountPrice: 28.00,
    stock: 30,
    sku: 'UP-LEA-SET',
    weight: '450 g',
    status: 'In Stock',
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300&auto=format&fit=crop',
    description: 'Top-grain padded leather leash with zinc alloy quick-release hardware.',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'CAT-01',
    name: 'Nutritional Food',
    petType: 'Dog & Cat',
    productCount: 42,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200&auto=format&fit=crop',
  },
  {
    id: 'CAT-02',
    name: 'Interactive Toys',
    petType: 'Dog & Cat',
    productCount: 28,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=200&auto=format&fit=crop',
  },
  {
    id: 'CAT-03',
    name: 'Healthy Treats',
    petType: 'Dog & Cat',
    productCount: 19,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop',
  },
  {
    id: 'CAT-04',
    name: 'Grooming & Hygiene',
    petType: 'All Pets',
    productCount: 15,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=200&auto=format&fit=crop',
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-2026-8801',
    customerName: 'Rahul Verma',
    customerEmail: 'rahul.v@gmail.com',
    customerPhone: '+91 98765 43210',
    address: '104 Swaroop Nagar, Kanpur, UP',
    itemsCount: 2,
    amount: 43.49,
    paymentStatus: 'Paid',
    orderStatus: 'Delivered',
    date: '2026-09-28',
    items: [
      { name: 'Chicken & Green Pea Recipe (2.5kg)', quantity: 1, price: 28.99 },
      { name: 'Interactive Tug & Chew Toy', quantity: 1, price: 14.50 },
    ],
  },
  {
    id: 'ORD-2026-8802',
    customerName: 'Priya Sharma',
    customerEmail: 'priya.s@yahoo.com',
    customerPhone: '+91 98123 45678',
    address: 'B-12 Civil Lines, Kanpur, UP',
    itemsCount: 1,
    amount: 18.25,
    paymentStatus: 'Paid',
    orderStatus: 'Processing',
    date: '2026-09-29',
    items: [
      { name: 'Organic Oat Grooming Shampoo', quantity: 1, price: 18.25 },
    ],
  },
  {
    id: 'ORD-2026-8803',
    customerName: 'Amit Saxena',
    customerEmail: 'amit.saxena@outlook.com',
    customerPhone: '+91 97654 32109',
    address: '45 Kakadeo, Kanpur, UP',
    itemsCount: 3,
    amount: 51.98,
    paymentStatus: 'Pending',
    orderStatus: 'Processing',
    date: '2026-09-29',
    items: [
      { name: 'Salmon Crunchy Treats', quantity: 2, price: 19.98 },
      { name: 'Premium Leather Leash', quantity: 1, price: 32.00 },
    ],
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-01',
    name: 'Rahul Verma',
    email: 'rahul.v@gmail.com',
    phone: '+91 98765 43210',
    ordersCount: 5,
    totalSpend: 240.50,
    status: 'Active',
    joinDate: '2025-11-12',
    petsCount: 2,
  },
  {
    id: 'CUST-02',
    name: 'Priya Sharma',
    email: 'priya.s@yahoo.com',
    phone: '+91 98123 45678',
    ordersCount: 3,
    totalSpend: 115.00,
    status: 'Active',
    joinDate: '2026-01-20',
    petsCount: 1,
  },
  {
    id: 'CUST-03',
    name: 'Amit Saxena',
    email: 'amit.saxena@outlook.com',
    phone: '+91 97654 32109',
    ordersCount: 2,
    totalSpend: 84.90,
    status: 'Active',
    joinDate: '2026-04-05',
    petsCount: 1,
  },
];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'DOC-101',
    name: 'Dr. Ananya Sharma',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop',
    qualification: 'BVSc & AH, MVSc (Surgery)',
    specialization: 'Small Animal Surgery & Wellness',
    experience: '8 Years',
    phone: '+91 94150 11223',
    email: 'ananya.sharma@petcare.in',
    status: 'Active',
    appointmentsCount: 142,
  },
  {
    id: 'DOC-102',
    name: 'Dr. Vikram Singh',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop',
    qualification: 'BVSc, PG Dip Dermatology',
    specialization: 'Feline Medicine & Dermatology',
    experience: '12 Years',
    phone: '+91 94501 22334',
    email: 'vikram.singh@petcare.in',
    status: 'Active',
    appointmentsCount: 198,
  },
];

export const INITIAL_SERVICES: ClinicService[] = [
  {
    id: 'SER-01',
    name: 'Comprehensive Vaccination',
    category: 'Preventive Care',
    description: 'Core 7-in-1 rabies and anti-viral vaccination package for dogs & cats.',
    price: 35.00,
    duration: '30 mins',
    image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=200&auto=format&fit=crop',
    status: 'Active',
  },
  {
    id: 'SER-02',
    name: 'General Health Checkup',
    category: 'Consultation',
    description: 'Complete physical exam including vitals, heart sound, temperature & coat evaluation.',
    price: 25.00,
    duration: '20 mins',
    image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=200&auto=format&fit=crop',
    status: 'Active',
  },
  {
    id: 'SER-03',
    name: 'Deworming & Parasite Care',
    category: 'Preventive Care',
    description: 'Broad-spectrum oral deworming and topical tick/flea treatment.',
    price: 20.00,
    duration: '15 mins',
    image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop',
    status: 'Active',
  },
  {
    id: 'SER-04',
    name: 'Pet Spa & Grooming',
    category: 'Grooming',
    description: 'Warm medicated bath, fur blow-dry, nail trimming and ear cleaning.',
    price: 45.00,
    duration: '60 mins',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=200&auto=format&fit=crop',
    status: 'Active',
  },
];

export const INITIAL_VACCINATIONS: Vaccination[] = [
  {
    id: 'VAC-01',
    name: 'DHPP / 7-in-1 Canine Vaccine',
    petType: 'Dog',
    description: 'Protects against Distemper, Hepatitis, Parvovirus, and Parainfluenza.',
    price: 30.00,
    duration: '15 mins',
    ageRecommendation: '6 Weeks & above',
    status: 'Active',
  },
  {
    id: 'VAC-02',
    name: 'Anti-Rabies Vaccine',
    petType: 'Dog & Cat',
    description: 'Mandatory annual immunization against Rabies virus.',
    price: 15.00,
    duration: '15 mins',
    ageRecommendation: '3 Months & above',
    status: 'Active',
  },
  {
    id: 'VAC-03',
    name: 'FVRCP Tri-Cat Vaccine',
    petType: 'Cat',
    description: 'Protects cats against Rhinotracheitis, Calicivirus, and Panleukopenia.',
    price: 28.00,
    duration: '15 mins',
    ageRecommendation: '8 Weeks & above',
    status: 'Active',
  },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-901',
    petName: 'Max',
    petType: 'Dog (Golden Retriever)',
    ownerName: 'Rahul Verma',
    ownerPhone: '+91 98765 43210',
    service: 'Comprehensive Vaccination',
    doctorName: 'Dr. Ananya Sharma',
    date: '2026-09-30',
    time: '10:30 AM',
    status: 'Confirmed',
  },
  {
    id: 'APT-902',
    petName: 'Luna',
    petType: 'Cat (Persian)',
    ownerName: 'Priya Sharma',
    ownerPhone: '+91 98123 45678',
    service: 'General Health Checkup',
    doctorName: 'Dr. Vikram Singh',
    date: '2026-09-30',
    time: '11:45 AM',
    status: 'Pending',
  },
  {
    id: 'APT-903',
    petName: 'Rocky',
    petType: 'Dog (Beagle)',
    ownerName: 'Amit Saxena',
    ownerPhone: '+91 97654 32109',
    service: 'Pet Spa & Grooming',
    doctorName: 'Dr. Ananya Sharma',
    date: '2026-09-29',
    time: '04:00 PM',
    status: 'Completed',
  },
];

export const INITIAL_PETS: PetPatient[] = [
  {
    id: 'PET-101',
    name: 'Max',
    type: 'Dog',
    breed: 'Golden Retriever',
    age: '2 Years 4 Months',
    ownerName: 'Rahul Verma',
    ownerPhone: '+91 98765 43210',
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&auto=format&fit=crop',
    lastVisit: '2026-08-14',
    medicalNotes: 'Up to date on DHPP. Healthy weight: 28 kg. No allergies noted.',
  },
  {
    id: 'PET-102',
    name: 'Luna',
    type: 'Cat',
    breed: 'Persian White',
    age: '1 Year 8 Months',
    ownerName: 'Priya Sharma',
    ownerPhone: '+91 98123 45678',
    photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop',
    lastVisit: '2026-09-01',
    medicalNotes: 'Sensitive skin formula recommended. Routine hairball control treats.',
  },
];

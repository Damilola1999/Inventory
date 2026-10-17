require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

const products = [
  {
    name: 'Samsung Galaxy S24',
    sku: 'SAMS-S24-128',
    category: 'phones',
    price: 799.99,
    stock: 50,
    description: '128GB, 8GB RAM, Phantom Black',
    lowStockThreshold: 5,
  },
  {
    name: 'iPhone 15 Pro',
    sku: 'APPL-IP15P-256',
    category: 'phones',
    price: 999.99,
    stock: 35,
    description: '256GB, Titanium, Natural',
    lowStockThreshold: 5,
  },
  {
    name: 'Sony WH-1000XM5',
    sku: 'SONY-WHXM5-001',
    category: 'audio',
    price: 349.99,
    stock: 25,
    description: 'Industry-leading noise canceling headphones',
    lowStockThreshold: 3,
  },
  {
    name: 'MacBook Air M3',
    sku: 'APPL-MBA-M3-512',
    category: 'laptops',
    price: 1099.0,
    stock: 20,
    description: '13.6-inch, 8GB RAM, 512GB SSD, Starlight',
    lowStockThreshold: 3,
  },
  {
    name: 'Dell XPS 13',
    sku: 'DELL-XPS13-512',
    category: 'laptops',
    price: 1149.0,
    stock: 15,
    description: '13.4-inch FHD+, 16GB RAM, 512GB SSD',
    lowStockThreshold: 3,
  },
  {
    name: 'Nintendo Switch OLED',
    sku: 'NTND-SWO-001',
    category: 'gaming',
    price: 349.99,
    stock: 40,
    description: '7-inch OLED screen, 64GB storage',
    lowStockThreshold: 5,
  },
  {
    name: 'PlayStation 5 Slim',
    sku: 'SONY-PS5S-001',
    category: 'gaming',
    price: 449.99,
    stock: 18,
    description: '1TB SSD, disc edition',
    lowStockThreshold: 3,
  },
  {
    name: 'Kindle Paperwhite',
    sku: 'AMZN-KPW-8GB',
    category: 'ereaders',
    price: 139.99,
    stock: 30,
    description: '6.8-inch, 8GB, waterproof',
    lowStockThreshold: 5,
  },
  {
    name: 'Apple Watch Series 9',
    sku: 'APPL-AW9-41',
    category: 'wearables',
    price: 399.0,
    stock: 28,
    description: '41mm, GPS, Aluminum, Starlight',
    lowStockThreshold: 5,
  },
  {
    name: 'Bose QuietComfort Ultra Earbuds',
    sku: 'BOSE-QCUE-001',
    category: 'audio',
    price: 299.99,
    stock: 22,
    description: 'True wireless earbuds with immersive audio',
    lowStockThreshold: 4,
  },
];

(async () => {
  await connectDB();

  for (const p of products) {
    await Product.updateOne({ sku: p.sku }, p, { upsert: true, setDefaultsOnInsert: true });
  }

  const count = await Product.countDocuments();
  console.log(`Seeded products. Total active products: ${count}`);

  await mongoose.disconnect();
})();

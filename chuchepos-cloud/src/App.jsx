import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Truck,
  Store,
  Users,
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Copy,
  Upload,
  X,
  LogOut,
  Sparkles,
  ShoppingBag,
  Eye,
  EyeOff,
  Receipt,
  ShieldCheck,
  Database,
  Layers,
  Wand2,
  Check,
  Phone,
  BarChart3,
  AlertCircle,
  Settings,
  Lock,
  GitBranch,
  History,
  Palette,
  UserCheck
} from 'lucide-react';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE (COMPATIBLE CON CLOUDFLARE PAGES Y VISTA PREVIA)
// ============================================================================
const getViteEnv = () => {
  try {
    return new Function('return import.meta.env')() || {};
  } catch (e) {
    return {};
  }
};

const viteEnv = getViteEnv();
const envFirebaseConfig = viteEnv.VITE_FIREBASE_API_KEY
  ? {
      apiKey: viteEnv.VITE_FIREBASE_API_KEY,
      authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: viteEnv.VITE_FIREBASE_PROJECT_ID,
      storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: viteEnv.VITE_FIREBASE_APP_ID
    }
  : null;

const firebaseConfig =
  envFirebaseConfig || JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'chuchepos-prod-v3';

// ============================================================================
// GENERADOR DE ILUSTRACIONES PNG/SVG TRANSPARENTES POR CATEGORÍA
// ============================================================================
const createSnackSvgDataUri = (bg1, bg2, label, accent) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <filter id="sh" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.16"/>
      </filter>
    </defs>
    <rect x="44" y="28" width="152" height="184" rx="22" fill="url(#g)" filter="url(#sh)"/>
    <path d="M44 48 Q120 36 196 48" stroke="rgba(255,255,255,0.45)" stroke-width="4" fill="none"/>
    <path d="M44 192 Q120 204 196 192" stroke="rgba(0,0,0,0.2)" stroke-width="4" fill="none"/>
    <circle cx="120" cy="110" r="46" fill="${accent}" opacity="0.95"/>
    <text x="120" y="116" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#0f172a" text-anchor="middle">${label}</text>
    <rect x="70" y="166" width="100" height="12" rx="6" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const CATEGORY_VISUALS = {
  'Gomitas y Caramelos': ['#ec4899', '#9d174d', '#fbcfe8'],
  'Snacks Salados': ['#f97316', '#c2410c', '#fef08a'],
  'Galletas': ['#2563eb', '#1e3a8a', '#dbeafe'],
  'Chocolates': ['#dc2626', '#7f1d1d', '#fde047'],
  'Ponqués y Dulces': ['#8b5cf6', '#4c1d95', '#ede9fe'],
  'Cereales y Snacks': ['#eab308', '#a16207', '#fef9c3'],
  'Chicles y Mentas': ['#10b981', '#065f46', '#d1fae5'],
  'Otros': ['#475569', '#1e293b', '#f1f5f9']
};

const getProductPlaceholderImage = (name, category) => {
  const [c1, c2, acc] = CATEGORY_VISUALS[category] || CATEGORY_VISUALS['Otros'];
  const shortLabel = (name || 'CHU').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  return createSnackSvgDataUri(c1, c2, shortLabel, acc);
};

// ============================================================================
// BASE DE DATOS MAESTRA EXTRAÍDA DE "EXCEL MADRE.xlsx" (35 SKUs + 144 CLIENTES)
// ============================================================================
const EXCEL_MADRE_PRODUCTS = [
  { sku: 'CHU-001', name: 'GOMITAS', category: 'Gomitas y Caramelos', packLabel: 'Bulto x 24 und', unitsPerPack: 24, stock: 22, minStock: 8, costUsd: 0.43, priceUsd: 1.00, aliases: 'gomitas play, gomita, trululu, gomitas' },
  { sku: 'CHU-002', name: 'DORITOS', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 23, minStock: 6, costUsd: 0.89, priceUsd: 1.70, aliases: 'doritos mega queso, dorito, tira doritos, doritos 2,12, doritos' },
  { sku: 'CHU-003', name: 'PRINGLES PEQ', category: 'Snacks Salados', packLabel: 'Caja x 24 und', unitsPerPack: 24, stock: 0, minStock: 6, costUsd: 0.95, priceUsd: 2.00, aliases: 'pringles pequenas, pringles peq, pringle, pringles' },
  { sku: 'CHU-004', name: 'OREO', category: 'Galletas', packLabel: 'Caja x 24 und', unitsPerPack: 24, stock: 24, minStock: 8, costUsd: 0.38, priceUsd: 1.00, aliases: 'oreo americana, oreo pequena, oreo azul, galleta oreo, oreo' },
  { sku: 'CHU-005', name: 'CHESSE TRIS', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.69, priceUsd: 1.50, aliases: 'cheese tris, chesse tris, chesetris' },
  { sku: 'CHU-006', name: 'CLUB SOCIAL', category: 'Galletas', packLabel: 'Paquete x 30 und', unitsPerPack: 30, stock: 30, minStock: 10, costUsd: 0.24, priceUsd: 0.50, aliases: 'club social, clubs social, club' },
  { sku: 'CHU-007', name: 'ANI POP', category: 'Gomitas y Caramelos', packLabel: 'Bolsa x 15 und', unitsPerPack: 15, stock: 0, minStock: 6, costUsd: 0.25, priceUsd: 0.50, aliases: 'ani pop, anipop, chupeta ani' },
  { sku: 'CHU-008', name: 'FLAQUITO', category: 'Chocolates', packLabel: 'Caja x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.44, priceUsd: 1.00, aliases: 'flaquito mini, flaquito, st moritz flaquito' },
  { sku: 'CHU-009', name: 'CHIPS AHOY', category: 'Galletas', packLabel: 'Caja x 24 und', unitsPerPack: 24, stock: 24, minStock: 8, costUsd: 0.42, priceUsd: 0.80, aliases: 'chips ahoy, chip ahoy, galleta chips' },
  { sku: 'CHU-010', name: 'RAQUETY', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.46, priceUsd: 1.00, aliases: 'tira de raquety, raquety, raqueti' },
  { sku: 'CHU-011', name: '11 BOTECITO', category: 'Gomitas y Caramelos', packLabel: 'Caja x 24 und', unitsPerPack: 24, stock: 0, minStock: 6, costUsd: 0.51, priceUsd: 1.00, aliases: 'once once botecito, 11 11, botecitos 11, once, 11 botecito' },
  { sku: 'CHU-012', name: 'CARAMELOS CHAOS', category: 'Gomitas y Caramelos', packLabel: 'Bolsa x 30 und', unitsPerPack: 30, stock: 30, minStock: 10, costUsd: 0.25, priceUsd: 0.60, aliases: 'chaos menta, chao xtreme, cmls xtrem, caramelos chaos, chaos' },
  { sku: 'CHU-013', name: 'PIRUETAS', category: 'Gomitas y Caramelos', packLabel: 'Caja x 96 und', unitsPerPack: 96, stock: 96, minStock: 20, costUsd: 0.23, priceUsd: 0.40, aliases: 'piruleta, piruetas, chupeta pirueta' },
  { sku: 'CHU-014', name: 'COCOSETE', category: 'Galletas', packLabel: 'Caja x 18 und', unitsPerPack: 18, stock: 18, minStock: 6, costUsd: 0.77, priceUsd: 1.60, aliases: 'cocosete waffer, cocosete sandwich, cocosete caja, cocosete' },
  { sku: 'CHU-015', name: 'DETODITO', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.85, priceUsd: 1.70, aliases: 'tira detodito, tiira detodito, de todito, detodito' },
  { sku: 'CHU-016', name: 'HONEY BRAND', category: 'Galletas', packLabel: 'Bulto x 54 und', unitsPerPack: 54, stock: 54, minStock: 12, costUsd: 0.30, priceUsd: 0.60, aliases: 'honey brand, honey bran, galleta honey' },
  { sku: 'CHU-017', name: 'SALSERITOS', category: 'Snacks Salados', packLabel: 'Bulto x 35 und', unitsPerPack: 35, stock: 34, minStock: 10, costUsd: 0.91, priceUsd: 1.70, aliases: 'salseritos, salserito' },
  { sku: 'CHU-018', name: 'SUSSY', category: 'Galletas', packLabel: 'Caja x 18 und', unitsPerPack: 18, stock: 16, minStock: 6, costUsd: 0.77, priceUsd: 1.60, aliases: 'sussy, susy, galleta sussy' },
  { sku: 'CHU-019', name: 'NUCITA WAFFER', category: 'Chocolates', packLabel: 'Caja x 32 und', unitsPerPack: 32, stock: 0, minStock: 8, costUsd: 0.14, priceUsd: 0.30, aliases: 'nucita waffer, nucita' },
  { sku: 'CHU-020', name: 'GOLPE RANCHERO', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 0, minStock: 6, costUsd: 0.25, priceUsd: 0.50, aliases: 'golpe ranchero, golpe' },
  { sku: 'CHU-021', name: 'PINGUINITOS P', category: 'Ponqués y Dulces', packLabel: 'Caja x 24 und', unitsPerPack: 24, stock: 24, minStock: 6, costUsd: 0.43, priceUsd: 0.80, aliases: 'pinguinitos mini, pinguinitos, pinguinito' },
  { sku: 'CHU-022', name: 'FLIPS PEQ', category: 'Cereales y Snacks', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.51, priceUsd: 1.00, aliases: 'flips lonchera, flips peq, flips' },
  { sku: 'CHU-023', name: 'CHOCOLATE PEQ', category: 'Chocolates', packLabel: 'Caja x 40 und', unitsPerPack: 40, stock: 0, minStock: 8, costUsd: 0.60, priceUsd: 2.00, aliases: 'chocolate peq, savoy, chocolate' },
  { sku: 'CHU-024', name: 'SAMBA', category: 'Chocolates', packLabel: 'Caja x 20 und', unitsPerPack: 20, stock: 20, minStock: 6, costUsd: 0.83, priceUsd: 1.60, aliases: 'samba, samba fresa, samba chocolate' },
  { sku: 'CHU-025', name: 'RUFFLES', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 0, minStock: 6, costUsd: 0.80, priceUsd: 1.60, aliases: 'ruffles, rufles, papas ruffles' },
  { sku: 'CHU-026', name: 'PEPITO', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 0, minStock: 6, costUsd: 0.50, priceUsd: 1.00, aliases: 'pepito, pepitos' },
  { sku: 'CHU-027', name: 'DANIS', category: 'Galletas', packLabel: 'Caja x 36 und', unitsPerPack: 36, stock: 0, minStock: 10, costUsd: 0.10, priceUsd: 0.20, aliases: 'danis, galleta danis' },
  { sku: 'CHU-028', name: 'GOMITAS CHOCOLATE', category: 'Chocolates', packLabel: 'Bolsa x 24 und', unitsPerPack: 24, stock: 0, minStock: 6, costUsd: 0.50, priceUsd: 1.00, aliases: 'gomitas chocolate, gomita choc' },
  { sku: 'CHU-029', name: 'BOMBONES BIANCHI', category: 'Chocolates', packLabel: 'Bolsa x 120 und', unitsPerPack: 120, stock: 120, minStock: 25, costUsd: 0.09, priceUsd: 0.50, aliases: 'bombo bianchi, bombones bianchi, bianchi' },
  { sku: 'CHU-030', name: 'CHICHARRON JACK', category: 'Snacks Salados', packLabel: 'Tira x 24 und', unitsPerPack: 24, stock: 0, minStock: 6, costUsd: 0.85, priceUsd: 1.70, aliases: 'chicharron jack, chicarron jack, jack' },
  { sku: 'CHU-031', name: 'CHUPETAS BOMBOMBUM', category: 'Gomitas y Caramelos', packLabel: 'Bolsa x 24 und', unitsPerPack: 24, stock: 0, minStock: 8, costUsd: 0.28, priceUsd: 0.60, aliases: 'chupetas bombombum, bombombum, bon bon bum' },
  { sku: 'CHU-032', name: 'ISELITAS YUCA CHIPS', category: 'Snacks Salados', packLabel: 'Bulto x 40 und', unitsPerPack: 40, stock: 40, minStock: 10, costUsd: 1.44, priceUsd: 2.50, aliases: 'iselitas yuca chips, iselitas, yuca chips' },
  { sku: 'CHU-033', name: 'TRIDENT', category: 'Chicles y Mentas', packLabel: 'Caja x 36 und', unitsPerPack: 36, stock: 36, minStock: 10, costUsd: 1.67, priceUsd: 2.50, aliases: 'trident, chicle trident' },
  { sku: 'CHU-034', name: 'MANI SALADO', category: 'Snacks Salados', packLabel: 'Tira x 48 und', unitsPerPack: 48, stock: 48, minStock: 12, costUsd: 0.31, priceUsd: 0.80, aliases: 'mani salado peq, mani salado, mani' },
  { sku: 'CHU-035', name: 'CHEETOS AZUL', category: 'Snacks Salados', packLabel: 'Tira x 12 und', unitsPerPack: 12, stock: 12, minStock: 6, costUsd: 0.52, priceUsd: 1.00, aliases: 'cheetos azul, cheetos, chetos' }
];

const RAW_CUSTOMER_NAMES = [
  'ADRIANNA', 'ADRIANNY', 'ALEXIS', 'ANERAYS', 'DOUGLEISY', 'CARLOS', 'CARLOS MORALES P3', 'CESAR', 'CHRISTIAN', 'CLEVER',
  'CYNTHIA', 'DANI', 'EDGAR', 'EDGARDO', 'EDUARDO', 'ERWIN', 'GERMAN', 'GREINI', 'JESI', 'JHON GREINI',
  'LEANDRA', 'LENYER', 'MARIALE', 'MARIBEL', 'MEBER', 'OSMEL', 'VALERIA', 'VERONICA', 'WILBER', 'YANIS',
  'FERNANDO', 'WINDER', 'SCARLET', 'MARIA FRANCIA', 'YARETZI', 'ANGY', 'GERONIMO', 'MANUEL', 'JOHANA', 'JHON CONTRERAS',
  'KRIS', 'SINAI', 'YUSMARY', 'REINA', 'DANIEL', 'ANDREA', 'VICTOR', 'GABRIELA', 'LUIS', 'JOSE',
  'MARIA', 'CARMEN', 'PATRICIA', 'MIGUEL', 'RAFAEL', 'JUAN', 'PEDRO', 'ANTONIO', 'FRANCISCO', 'ALEJANDRO',
  'RICARDO', 'ROBERTO', 'FERNANDA', 'SOFIA', 'CAMILA', 'VALENTINA', 'ISABELLA', 'PAULA', 'DANIELA', 'NATALIA',
  'CAROLINA', 'ANDRES', 'SANTIAGO', 'SEBASTIAN', 'MATEO', 'NICOLAS', 'DIEGO', 'GABRIEL', 'SAMUEL', 'DAVID',
  'JONATHAN', 'KEVIN', 'BRAYAN', 'DEIVIS', 'YEFERSON', 'JHONATAN', 'WILMER', 'ENDERSON', 'YOHAN', 'ALEXANDER',
  'GENESIS', 'YORGELIS', 'YULIMAR', 'NAYELIS', 'ORIANA', 'FABIANA', 'MARIANGEL', 'ELIZABETH', 'ROSA', 'ANA',
  'LAURA', 'MONICA', 'CLAUDIA', 'SANDRA', 'DIANA', 'LILIANA', 'MARISOL', 'YELITZA', 'ZULEIMA', 'MIREYA',
  'HECTOR', 'OSCAR', 'JAVIER', 'GUILLERMO', 'ALBERTO', 'ENRIQUE', 'ERNESTO', 'GUSTAVO', 'HUGO', 'IVAN',
  'LEONARDO', 'MAURICIO', 'NELSON', 'ORLANDO', 'RAMON', 'RAUL', 'RENE', 'RODRIGO', 'RUBEN', 'SERGIO',
  'CARLOS P4', 'MARIA MZ', 'PEDRO PH', 'LUIS AG', 'ANA P3', 'JOSE P4', 'SOFIA MZ', 'MIGUEL PH', 'LAURA AG', 'DAVID P3',
  'ELENA P4', 'JORGE MZ', 'SILVIA PH', 'RAUL AG'
];

const CATEGORIES = [
  'Todas',
  'Snacks Salados',
  'Galletas',
  'Chocolates',
  'Gomitas y Caramelos',
  'Ponqués y Dulces',
  'Cereales y Snacks',
  'Chicles y Mentas',
  'Otros'
];

const ACCENT_PRESETS = [
  { name: 'Índigo Pro', hex: '#4f46e5', ring: 'ring-indigo-500' },
  { name: 'Esmeralda BCV', hex: '#059669', ring: 'ring-emerald-500' },
  { name: 'Ámbar Caramelo', hex: '#d97706', ring: 'ring-amber-500' },
  { name: 'Fucsia Chuche', hex: '#db2777', ring: 'ring-pink-500' },
  { name: 'Cian Caribe', hex: '#0284c7', ring: 'ring-sky-500' },
  { name: 'Violeta Real', hex: '#7c3aed', ring: 'ring-violet-500' }
];

const FIRESTORE_RLS_RULES_TEMPLATE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function getUserRole(ownerId) {
      return get(/databases/$(database)/documents/artifacts/$(appId)/users/$(ownerId)/profiles/$(request.auth.uid)).data.role;
    }

    function isAdmin(ownerId) {
      return isSignedIn() && (
        request.auth.uid == ownerId ||
        getUserRole(ownerId) == 'Administrador'
      );
    }

    function isSupervisorOrAdmin(ownerId) {
      return isSignedIn() && (
        isAdmin(ownerId) ||
        getUserRole(ownerId) == 'Supervisor'
      );
    }

    match /artifacts/{appId}/users/{ownerId}/{document=**} {
      allow read: if isSupervisorOrAdmin(ownerId);

      match /settings/{docId} {
        allow read: if isSupervisorOrAdmin(ownerId);
        allow write: if isAdmin(ownerId);
      }

      match /profiles/{profileId} {
        allow read: if isSupervisorOrAdmin(ownerId);
        allow write: if isAdmin(ownerId);
      }

      match /audit_logs/{logId} {
        allow read: if isSupervisorOrAdmin(ownerId);
        allow create: if isSupervisorOrAdmin(ownerId);
        allow update, delete: if false;
      }

      match /products/{productId} {
        allow read: if isSupervisorOrAdmin(ownerId);
        allow create, delete: if isAdmin(ownerId);
        allow update: if isAdmin(ownerId) || (
          isSupervisorOrAdmin(ownerId) &&
          request.resource.data.costUsd == resource.data.costUsd
        );
      }

      match /customers/{customerId} {
        allow read, create, update: if isSupervisorOrAdmin(ownerId);
        allow delete: if isAdmin(ownerId);
      }

      match /orders/{orderId} {
        allow read, create, update: if isSupervisorOrAdmin(ownerId);
        allow delete: if isAdmin(ownerId);
      }

      match /purchases/{purchaseId} {
        allow read, create, update: if isSupervisorOrAdmin(ownerId);
        allow delete: if isAdmin(ownerId);
      }
    }
  }
}`;

const GITHUB_FILES_BLUEPRINT = {
  'package.json': `{
  "name": "chuchepos-cloud-v3",
  "private": true,
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^11.6.1",
    "lucide-react": "^0.460.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}`,
  'firestore.rules': FIRESTORE_RLS_RULES_TEMPLATE,
  '.github/workflows/deploy.yml': `name: Deploy ChuchePOS Cloud v3.0

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production bundle
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: \${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: \${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: \${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: \${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: \${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: \${{ secrets.VITE_FIREBASE_APP_ID }}`,
  'README.md': `# ChuchePOS Cloud v3.0

Sistema ERP multi-dispositivo (PC, Tablet y Móvil) para gestión de chucherías, inventario, créditos a 15 días con tasa Euro BCV, trazabilidad de pedidos y cobranzas.`
};

const formatBs = (val) => {
  const num = Number(val) || 0;
  return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatUsd = (val) => {
  const num = Number(val) || 0;
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatDate = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const getDaysDiff = (dueDateIso) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateIso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
};

const normalizeText = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const compressImagePreservingPng = (file, maxWidth = 420) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        const dataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const matchProductByQuery = (queryText, products) => {
  const q = normalizeText(queryText);
  if (!q) return null;

  let exact = products.find(
    (p) => normalizeText(p.sku) === q || normalizeText(p.name) === q
  );
  if (exact) return exact;

  let bestMatch = null;
  let bestScore = 0;

  for (const p of products) {
    const aliasList = (p.aliases || '')
      .split(',')
      .map((a) => normalizeText(a))
      .filter(Boolean);
    aliasList.push(normalizeText(p.name));

    for (const alias of aliasList) {
      if (!alias) continue;
      if (q === alias) return p;
      if (q.includes(alias) && alias.length > bestScore) {
        bestScore = alias.length;
        bestMatch = p;
      } else if (alias.includes(q) && q.length >= 4 && q.length > bestScore) {
        bestScore = q.length;
        bestMatch = p;
      }
    }
  }
  return bestMatch;
};

// ============================================================================
// COMPONENTE PRINCIPAL: APP (CHUCHEPOS CLOUD v3.0)
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState('connecting');
  const [bcvLoading, setBcvLoading] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [hideCosts, setHideCosts] = useState(false);

  const [currentRole, setCurrentRole] = useState('Administrador');
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [settings, setSettings] = useState({
    bcvUsd: 52.50,
    bcvEur: 57.80,
    billingRate: 57.80,
    billingRateMode: 'euro_bcv',
    bcvLastUpdated: null,
    bcvSource: 'Manual / Inicial',
    bcvAutoRefresh: true,
    monthlyGoalUsd: 800,
    defaultCreditDays: 15,
    supervisorCanSeeCosts: false,
    supervisorCanReceiveTicket: true,
    requireOrderDeletionAdmin: true,
    storeName: 'Chucherías Express Caracas',
    storePhone: '+58 412-0000000',
    brandLogo: '',
    accentColor: '#4f46e5',
    surfaceTheme: 'light',
    cardDensity: 'comfortable',
    borderRadius: 'rounded-2xl',
    currencyDisplay: 'both',
    whatsappCollectionTemplate:
      '🧾 *ESTADO DE CUENTA {{orden}}*\n*{{negocio}}*\n\n👤 Cliente: *{{cliente}}* ({{cedula}})\n📅 Entregado: {{fecha_entrega}}\n⏰ Vencimiento ({{dias}}d): {{fecha_vence}}\n\n*Detalle:*\n{{items}}\n\n💵 *Total Divisas:* {{total_usd}}\n💱 *Tasa Euro BCV Hoy:* {{tasa_bcv}}\n🇻🇪 *Total a Transferir en Bs:* *{{total_bs}}*\n\nPor favor envíanos tu comprobante para validar tu pago. ¡Gracias!',
    whatsappOrderTemplate:
      '🍬 *PEDIDO CONFIRMADO {{orden}}*\n👤 Cliente: {{cliente}} ({{cedula}})\n💳 Modalidad: {{modalidad}}\n\n{{items}}\n\n💵 *Total USD:* {{total_usd}}\n🇻🇪 *Ref. Bs (€ BCV):* {{total_bs}}'
  });

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const isAdmin = currentRole === 'Administrador';
  const canViewCosts = isAdmin || Boolean(settings.supervisorCanSeeCosts);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3600 ? null : prev));
    }, 3700);
  };

  const recordAuditEvent = async (action, moduleName, details, activeUser = user, activeRole = currentRole) => {
    if (!activeUser) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', activeUser.uid, 'audit_logs'), {
        action,
        module: moduleName,
        details,
        actorEmail: activeUser.email || `sesion-${activeUser.uid.slice(0, 6)}`,
        actorUid: activeUser.uid,
        role: activeRole,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Error registrando auditoría:', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!envFirebaseConfig) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Error auth:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setSyncStatus('connecting');
    const base = ['artifacts', appId, 'users', user.uid];

    const unsubSettings = onSnapshot(
      doc(db, ...base, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.data() }));
        } else {
          setDoc(doc(db, ...base, 'settings', 'general'), settings).catch(console.error);
        }
        setSyncStatus('synced');
      },
      () => setSyncStatus('error')
    );

    const unsubProfiles = onSnapshot(collection(db, ...base, 'profiles'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeamProfiles(list);
      const myProfile = list.find((p) => p.uid === user.uid || p.email === user.email);
      if (myProfile?.role) {
        setCurrentRole(myProfile.role);
      }
    });

    const unsubAudit = onSnapshot(collection(db, ...base, 'audit_logs'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAuditLogs(list.slice(0, 100));
    });

    const unsubProducts = onSnapshot(collection(db, ...base, 'products'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
      setProducts(list);
    });

    const unsubCustomers = onSnapshot(collection(db, ...base, 'customers'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(list);
    });

    const unsubOrders = onSnapshot(collection(db, ...base, 'orders'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);
    });

    const unsubPurchases = onSnapshot(collection(db, ...base, 'purchases'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPurchases(list);
    });

    return () => {
      unsubSettings();
      unsubProfiles();
      unsubAudit();
      unsubProducts();
      unsubCustomers();
      unsubOrders();
      unsubPurchases();
    };
  }, [user]);

  const handleUpdateSettings = async (updates, logLabel = 'Actualización de configuración') => {
    if (!user) return;
    if (!isAdmin) {
      showToast('Acceso denegado por RLS: Solo el rol Administrador puede modificar la configuración', 'error');
      return;
    }
    const next = { ...settings, ...updates };
    setSettings(next);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), next, { merge: true });
      await recordAuditEvent('CONFIG_UPDATE', 'Configuración', `${logLabel}: ${Object.keys(updates).join(', ')}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchRole = async (nextRole) => {
    setCurrentRole(nextRole);
    if (user) {
      try {
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', user.uid),
          {
            uid: user.uid,
            email: user.email || 'operador-cloud@chuchepos.ve',
            role: nextRole,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
        await recordAuditEvent('ROLE_SWITCH', 'Seguridad RBAC', `Sesión cambiada a rol: ${nextRole}`, user, nextRole);
      } catch (e) {
        console.warn(e);
      }
    }
    showToast(`Rol activo: ${nextRole}`);
  };

  const fetchLiveBcvRates = async (silent = false) => {
    setBcvLoading(true);
    try {
      let fetchedUsd = null;
      let fetchedEur = null;
      let sourceLabel = 'BCV Oficial en Vivo';

      try {
        const [resUsd, resEur] = await Promise.all([
          fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
          fetch('https://ve.dolarapi.com/v1/euros/oficial')
        ]);
        if (resUsd.ok) {
          const dataUsd = await resUsd.json();
          if (dataUsd?.promedio) fetchedUsd = Number(dataUsd.promedio);
        }
        if (resEur.ok) {
          const dataEur = await resEur.json();
          if (dataEur?.promedio) fetchedEur = Number(dataEur.promedio);
        }
      } catch (e) {
        console.warn('Fallback API BCV 1:', e);
      }

      if (!fetchedUsd || !fetchedEur) {
        try {
          const resBackup = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
          if (resBackup.ok) {
            const json = await resBackup.json();
            if (!fetchedUsd && json?.monitors?.usd?.price) fetchedUsd = Number(json.monitors.usd.price);
            if (!fetchedEur && json?.monitors?.eur?.price) fetchedEur = Number(json.monitors.eur.price);
          }
        } catch (e) {
          console.warn('Fallback API BCV 2:', e);
        }
      }

      if (fetchedUsd && !fetchedEur) {
        fetchedEur = Number((fetchedUsd * 1.085).toFixed(2));
        sourceLabel = 'BCV USD Oficial + Paridad EUR';
      }

      if (fetchedUsd && fetchedEur) {
        const nowStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        const targetBilling =
          settings.billingRateMode === 'usd_bcv'
            ? Number(fetchedUsd.toFixed(2))
            : settings.billingRateMode === 'custom'
            ? Number(settings.billingRate)
            : Number(fetchedEur.toFixed(2));

        const next = {
          ...settings,
          bcvUsd: Number(fetchedUsd.toFixed(2)),
          bcvEur: Number(fetchedEur.toFixed(2)),
          billingRate: targetBilling,
          bcvLastUpdated: `Hoy ${nowStr}`,
          bcvSource: sourceLabel
        };
        setSettings(next);
        if (user) {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), next, { merge: true });
          await recordAuditEvent('BCV_SYNC', 'Tasas BCV', `USD: ${next.bcvUsd} | EUR: ${next.bcvEur} | Cobro: ${next.billingRate}`);
        }
        if (!silent) {
          showToast(`Tasas BCV actualizadas: $ ${fetchedUsd.toFixed(2)} | € ${fetchedEur.toFixed(2)}`);
        }
      } else if (!silent) {
        showToast('No se pudo conectar con BCV en este instante. Puedes editar la tasa manualmente.', 'error');
      }
    } catch (err) {
      if (!silent) showToast('Error consultando tasa BCV', 'error');
    } finally {
      setBcvLoading(false);
    }
  };

  useEffect(() => {
    if (user && settings.bcvAutoRefresh !== false) {
      fetchLiveBcvRates(true);
    }
  }, [user]);

  const handleImportExcelMadre = async () => {
    if (!user) return;
    if (!isAdmin) {
      showToast('Política RLS: Solo el Administrador puede ejecutar la importación base de Excel Madre', 'error');
      return;
    }
    setImportingExcel(true);
    try {
      const base = ['artifacts', appId, 'users', user.uid];
      const existingSkus = new Set(products.map((p) => p.sku));
      const existingNames = new Set(customers.map((c) => normalizeText(c.name)));

      let addedProducts = 0;
      const batch1 = writeBatch(db);
      for (const item of EXCEL_MADRE_PRODUCTS) {
        if (!existingSkus.has(item.sku)) {
          const ref = doc(collection(db, ...base, 'products'));
          batch1.set(ref, {
            ...item,
            image: getProductPlaceholderImage(item.name, item.category),
            createdAt: new Date().toISOString()
          });
          addedProducts++;
        }
      }
      if (addedProducts > 0) await batch1.commit();

      let addedCustomers = 0;
      const batch2 = writeBatch(db);
      let krisCustomerId = null;

      RAW_CUSTOMER_NAMES.forEach((rawName, idx) => {
        const cleanName = rawName.trim();
        if (!existingNames.has(normalizeText(cleanName))) {
          const ref = doc(collection(db, ...base, 'customers'));
          const zoneMatch = cleanName.match(/\b(P3|P4|MZ|PH|AG)\b/i);
          const tempCedula = `TEMP-${String(idx + 1).padStart(3, '0')}`;
          batch2.set(ref, {
            cedula: tempCedula,
            name: cleanName,
            phone: '',
            zone: zoneMatch ? zoneMatch[1].toUpperCase() : 'Oficina / General',
            creditLimitUsd: 30,
            notes: 'Importado desde EXCEL MADRE.xlsx',
            createdAt: new Date().toISOString()
          });
          if (cleanName === 'KRIS') krisCustomerId = ref.id;
          addedCustomers++;
        }
      });
      if (addedCustomers > 0) await batch2.commit();

      if (orders.length === 0) {
        const now = new Date();
        const due15 = new Date(now);
        due15.setDate(due15.getDate() + 15);
        const rate = Number(settings.billingRate) || Number(settings.bcvEur) || 57.80;

        await addDoc(collection(db, ...base, 'orders'), {
          orderNumber: 'ORD-EXCEL-001',
          customerId: krisCustomerId || 'kris-excel',
          customerCedula: 'TEMP-041',
          customerName: 'KRIS',
          status: 'delivered',
          paymentType: 'credit',
          creditDays: 15,
          dueDate: due15.toISOString(),
          items: [
            { sku: 'CHU-018', name: 'SUSSY', qty: 2, priceUsd: 1.60, costUsd: 0.77 },
            { sku: 'CHU-017', name: 'SALSERITOS', qty: 1, priceUsd: 1.70, costUsd: 0.91 },
            { sku: 'CHU-001', name: 'GOMITAS', qty: 2, priceUsd: 1.00, costUsd: 0.43 }
          ],
          totalUsd: 6.90,
          profitUsd: 3.51,
          paidUsd: 0,
          billingRateAtCreation: rate,
          historyLog: [
            { status: 'received', at: now.toISOString(), note: 'Importado desde pestaña VENTA (Excel Madre)' },
            { status: 'delivered', at: now.toISOString(), note: 'Mercancía entregada - Crédito 15 días activo' }
          ],
          createdAt: now.toISOString()
        });
      }

      showToast(`¡Excel Madre importado! +${addedProducts} productos y +${addedCustomers} clientes cargados.`);
      await recordAuditEvent('EXCEL_IMPORT', 'Base Excel Madre', `Importados +${addedProducts} productos y +${addedCustomers} clientes`);
    } catch (err) {
      console.error(err);
      showToast('Error importando datos del Excel Madre', 'error');
    } finally {
      setImportingExcel(false);
    }
  };

  const navBadges = useMemo(() => {
    const pendingPipeline = orders.filter((o) => o.status !== 'paid').length;
    const lowStock = products.filter((p) => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length;
    return { pendingPipeline, lowStock };
  }, [orders, products]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-base font-bold tracking-wide">Iniciando ChuchePOS Cloud v3.0...</p>
        <p className="text-xs text-slate-400 mt-1">Conectando base de datos, RBAC/RLS y tasas BCV en vivo</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        settings={settings}
        onLoggedIn={(u, role) => {
          setUser(u);
          setCurrentRole(role);
          recordAuditEvent('LOGIN', 'Autenticación', `Inicio de sesión como ${role}`, u, role);
        }}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Indicadores BI', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pedidos y Cobros', icon: Layers, badge: navBadges.pendingPipeline || null },
    { id: 'restock', label: 'Reposición / Ticket', icon: Receipt, badge: navBadges.lowStock || null },
    { id: 'inventory', label: 'Fichas Productos', icon: Package },
    { id: 'customers', label: 'Clientes (Cédula)', icon: Users },
    { id: 'storefront', label: 'Catálogo Web', icon: Store },
    { id: 'settings', label: 'Configuración y RLS', icon: Settings }
  ];

  const isDarkSurface = settings.surfaceTheme === 'dark' || settings.surfaceTheme === 'midnight';
  const mainBgClass =
    settings.surfaceTheme === 'midnight'
      ? 'bg-slate-950 text-slate-100'
      : settings.surfaceTheme === 'dark'
      ? 'bg-slate-900 text-slate-100'
      : 'bg-[#F4F6F9] text-slate-800';

  return (
    <div className={`min-h-screen ${mainBgClass} flex flex-col md:flex-row font-sans transition-colors duration-200`}>
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* SIDEBAR ESCRITORIO */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950 text-slate-100 border-r border-slate-800 z-30">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
          {settings.brandLogo ? (
            <img src={settings.brandLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 shrink-0" />
          ) : (
            <div
              style={{ backgroundColor: settings.accentColor || '#4f46e5' }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0"
            >
              C3
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm tracking-tight text-white truncate">{settings.storeName}</h1>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span>{currentRole} • Cloud v3.0</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={isActive ? { backgroundColor: settings.accentColor || '#4f46e5' } : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-emerald-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 mx-3 mb-2 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Rol RBAC:
            </span>
            <select
              value={currentRole}
              onChange={(e) => handleSwitchRole(e.target.value)}
              className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg border border-slate-700 cursor-pointer"
            >
              <option value="Administrador">Administrador</option>
              <option value="Supervisor">Supervisor</option>
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={handleImportExcelMadre}
              disabled={importingExcel}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{importingExcel ? 'Importando...' : 'Importar Excel Madre'}</span>
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="truncate font-mono text-[10px]">UID: {user.uid.slice(0, 10)}...</span>
          <button
            onClick={() => {
              recordAuditEvent('LOGOUT', 'Autenticación', `Cierre de sesión (${currentRole})`);
              signOut(auth);
            }}
            title="Cerrar sesión"
            className="p-1.5 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DERECHA */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-0">
        <header
          className={`sticky top-0 z-20 backdrop-blur-md border-b px-4 py-2.5 shadow-2xs ${
            isDarkSurface ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: settings.accentColor || '#4f46e5' }}
                  className="md:hidden w-8 h-8 rounded-lg text-white font-black flex items-center justify-center text-sm"
                >
                  C3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold">
                      {navItems.find((i) => i.id === activeTab)?.label}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    {settings.bcvSource} {settings.bcvLastUpdated ? `• ${settings.bcvLastUpdated}` : ''}
                  </p>
                </div>
              </div>

              <select
                value={currentRole}
                onChange={(e) => handleSwitchRole(e.target.value)}
                className="md:hidden px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-300"
              >
                <option value="Administrador">Admin</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-slate-50 text-slate-900 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">USD BCV:</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={settings.bcvUsd}
                  onChange={(e) => handleUpdateSettings({ bcvUsd: parseFloat(e.target.value) || 0 }, 'Tasa USD BCV')}
                  className="w-16 text-xs font-bold text-slate-800 text-right focus:outline-none disabled:opacity-70"
                />
                <span className="text-[10px] text-slate-400">Bs</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                <span className="text-[10px] font-extrabold uppercase text-indigo-600">EUR BCV:</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={settings.bcvEur}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleUpdateSettings(
                      { bcvEur: val, billingRate: settings.billingRateMode === 'euro_bcv' ? val : settings.billingRate },
                      'Tasa EUR BCV'
                    );
                  }}
                  className="w-16 text-xs font-bold text-indigo-700 text-right focus:outline-none disabled:opacity-70"
                />
                <span className="text-[10px] text-slate-400">Bs</span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-extrabold uppercase text-emerald-800">Cobro:</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={settings.billingRate}
                  onChange={(e) => handleUpdateSettings({ billingRate: parseFloat(e.target.value) || 0 }, 'Tasa de Cobro')}
                  className="w-16 text-xs font-black text-emerald-900 bg-transparent text-right focus:outline-none disabled:opacity-70"
                />
                <span className="text-[10px] font-bold text-emerald-700">Bs/$</span>
              </div>

              <button
                onClick={() => fetchLiveBcvRates(false)}
                disabled={bcvLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${bcvLoading ? 'animate-spin' : ''}`} />
                <span>{bcvLoading ? 'Consultando...' : 'Actualizar BCV en Vivo'}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {activeTab === 'dashboard' && (
            <DashboardBiView
              products={products}
              customers={customers}
              orders={orders}
              purchases={purchases}
              settings={settings}
              canViewCosts={canViewCosts}
              isAdmin={isAdmin}
              onUpdateSettings={handleUpdateSettings}
              onImportExcel={handleImportExcelMadre}
              importingExcel={importingExcel}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'pipeline' && (
            <OrderPipelineView
              products={products}
              customers={customers}
              orders={orders}
              settings={settings}
              isAdmin={isAdmin}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}

          {activeTab === 'restock' && (
            <RestockTicketView
              products={products}
              purchases={purchases}
              settings={settings}
              isAdmin={isAdmin}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}

          {activeTab === 'inventory' && (
            <ProductSheetsView
              products={products}
              settings={settings}
              canViewCosts={canViewCosts}
              isAdmin={isAdmin}
              hideCosts={hideCosts}
              setHideCosts={setHideCosts}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}

          {activeTab === 'customers' && (
            <Customers360View
              customers={customers}
              orders={orders}
              settings={settings}
              isAdmin={isAdmin}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}

          {activeTab === 'storefront' && (
            <StorefrontCatalogView
              products={products}
              customers={customers}
              settings={settings}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsSecurityGitHubView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              currentRole={currentRole}
              onSwitchRole={handleSwitchRole}
              isAdmin={isAdmin}
              teamProfiles={teamProfiles}
              auditLogs={auditLogs}
              user={user}
              showToast={showToast}
              recordAuditEvent={recordAuditEvent}
            />
          )}
        </main>
      </div>

      {/* BARRA DE NAVEGACIÓN INFERIOR MÓVIL */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950 text-slate-400 border-t border-slate-800 flex justify-around items-center py-2 px-1 z-30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={isActive ? { color: settings.accentColor || '#34d399' } : undefined}
              className={`relative flex flex-col items-center justify-center p-1 rounded-lg min-w-[46px] ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold mt-0.5 truncate max-w-[52px]">{item.label.split(' ')[0]}</span>
              {item.badge && (
                <span className="absolute top-0.5 right-1.5 px-1 min-w-[15px] h-4 text-[9px] font-black flex items-center justify-center rounded-full bg-indigo-600 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ============================================================================
// PANTALLA DE INICIO DE SESIÓN CON ROLES (ADMINISTRADOR VS SUPERVISOR)
// ============================================================================
function AuthScreen({ settings, onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Administrador');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickRoleAccess = async (roleName) => {
    setLoading(true);
    setError('');
    try {
      const cred = await signInAnonymously(auth);
      await setDoc(
        doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profiles', cred.user.uid),
        {
          uid: cred.user.uid,
          email: `${roleName.toLowerCase()}@chuchepos.ve`,
          role: roleName,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      onLoggedIn(cred.user, roleName);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = isRegister
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      await setDoc(
        doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profiles', cred.user.uid),
        {
          uid: cred.user.uid,
          email: cred.user.email,
          role: selectedRole,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      onLoggedIn(cred.user, selectedRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-7 text-center text-white">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center font-black text-2xl mb-3">
            C3
          </div>
          <h1 className="text-xl font-extrabold">{settings.storeName || 'ChuchePOS Cloud v3.0'}</h1>
          <p className="text-xs text-slate-400 mt-1">Acceso Multi-Dispositivo • RBAC & Seguridad RLS</p>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleQuickRoleAccess('Administrador')}
              disabled={loading}
              className="py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Entrar como Admin</span>
            </button>
            <button
              onClick={() => handleQuickRoleAccess('Supervisor')}
              disabled={loading}
              className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs cursor-pointer flex flex-col items-center gap-1"
            >
              <UserCheck className="w-4 h-4" />
              <span>Entrar como Supervisor</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-100">
            <input
              type="email"
              required
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Perfil de Acceso (RBAC):</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
              >
                <option value="Administrador">Administrador (Control Total + Costos + RLS + Config)</option>
                <option value="Supervisor">Supervisor (Operación + Pedidos/Cobros + Catálogo)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm cursor-pointer"
            >
              {isRegister ? 'Crear Cuenta y Asignar Rol' : 'Iniciar Sesión'}
            </button>
          </form>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-center text-xs text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            {isRegister ? 'Ya tengo cuenta registrada' : 'Registrar nueva cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO 1: DASHBOARD DE INDICADORES (BI DEL NEGOCIO)
// ============================================================================
function DashboardBiView({
  products,
  customers,
  orders,
  settings,
  canViewCosts,
  isAdmin,
  onUpdateSettings,
  onImportExcel,
  importingExcel,
  onNavigate
}) {
  const [periodFilter, setPeriodFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalVal, setGoalVal] = useState(settings.monthlyGoalUsd || 800);

  const billingRate = Number(settings.billingRate) || Number(settings.bcvEur) || 1;

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.status === 'received') return false;
      const d = new Date(o.createdAt);
      if (periodFilter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (periodFilter === '7d') {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      }
      if (periodFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, periodFilter]);

  const analytics = useMemo(() => {
    let salesUsd = 0;
    let profitUsd = 0;
    const categoryStats = {};
    const productStats = {};

    const prodMap = {};
    products.forEach((p) => {
      prodMap[p.sku] = p;
    });

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const prod = prodMap[item.sku];
        const cat = prod?.category || 'Otros';
        if (categoryFilter !== 'Todas' && cat !== categoryFilter) return;

        const lineRev = (Number(item.priceUsd) || 0) * (Number(item.qty) || 0);
        const lineProfit = ((Number(item.priceUsd) || 0) - (Number(item.costUsd) || 0)) * (Number(item.qty) || 0);

        salesUsd += lineRev;
        profitUsd += lineProfit;

        if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, profit: 0 };
        categoryStats[cat].revenue += lineRev;
        categoryStats[cat].profit += lineProfit;

        if (!productStats[item.name]) {
          productStats[item.name] = { name: item.name, sku: item.sku, qty: 0, revenue: 0, profit: 0 };
        }
        productStats[item.name].qty += Number(item.qty) || 0;
        productStats[item.name].revenue += lineRev;
        productStats[item.name].profit += lineProfit;
      });
    });

    let onTimeUsd = 0;
    let dueSoonUsd = 0;
    let overdueUsd = 0;
    let onTimeCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    orders.forEach((o) => {
      if (o.status === 'received' || o.status === 'paid') return;
      const bal = Math.max(0, (Number(o.totalUsd) || 0) - (Number(o.paidUsd) || 0));
      if (bal <= 0.01) return;
      const daysLeft = getDaysDiff(o.dueDate);
      if (daysLeft < 0) {
        overdueUsd += bal;
        overdueCount++;
      } else if (daysLeft <= 4) {
        dueSoonUsd += bal;
        dueSoonCount++;
      } else {
        onTimeUsd += bal;
        onTimeCount++;
      }
    });

    let invCostUsd = 0;
    let invRetailUsd = 0;
    const stagnantProducts = [];

    products.forEach((p) => {
      const st = Number(p.stock) || 0;
      invCostUsd += st * (Number(p.costUsd) || 0);
      invRetailUsd += st * (Number(p.priceUsd) || 0);
      if (st > 15 && !productStats[p.name]) {
        stagnantProducts.push(p);
      }
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const categoryArray = Object.entries(categoryStats)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.revenue - a.revenue);

    const avgMargin = salesUsd > 0 ? (profitUsd / salesUsd) * 100 : 0;

    return {
      salesUsd,
      profitUsd,
      avgMargin,
      invCostUsd,
      invRetailUsd,
      totalReceivableUsd: onTimeUsd + dueSoonUsd + overdueUsd,
      onTimeUsd,
      dueSoonUsd,
      overdueUsd,
      onTimeCount,
      dueSoonCount,
      overdueCount,
      topProducts,
      categoryArray,
      stagnantProducts: stagnantProducts.slice(0, 6)
    };
  }, [filteredOrders, orders, products, categoryFilter]);

  const goalPct = Math.min(100, Math.round((analytics.salesUsd / (settings.monthlyGoalUsd || 800)) * 100));

  return (
    <div className="space-y-6">
      {products.length === 0 && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Migración Lista desde EXCEL MADRE.xlsx
            </span>
            <h3 className="text-lg font-extrabold">Carga tus 35 SKUs, Costos Reales y 144 Clientes con 1 Clic</h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Hemos extraído y normalizado tu inventario real (731 unidades), precios vigentes, alias de reconocimiento y tu cartera de 144 clientes (incluyendo saldo de KRIS).
            </p>
          </div>
          <button
            onClick={onImportExcel}
            disabled={importingExcel}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Database className="w-4 h-4" />
            <span>{importingExcel ? 'Cargando Base de Datos...' : 'Importar Excel Madre Ahora'}</span>
          </button>
        </div>
      )}

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'today', label: 'Hoy' },
            { id: '7d', label: 'Últimos 7 días' },
            { id: 'month', label: 'Este Mes' },
            { id: 'all', label: 'Histórico Total' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                periodFilter === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Categoría:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Ventas del Período</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatUsd(analytics.salesUsd)}</p>
          <p className="text-xs font-semibold text-indigo-600 mt-0.5">{formatBs(analytics.salesUsd * billingRate)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Utilidad Bruta Real</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {canViewCosts ? (
            <>
              <p className="text-2xl font-black text-emerald-700 mt-2">{formatUsd(analytics.profitUsd)}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Margen promedio: <strong className="text-emerald-700">{analytics.avgMargin.toFixed(1)}%</strong>
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-slate-400 mt-3 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Restringido por RLS (Supervisor)
            </p>
          )}
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Inventario Almacén</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatUsd(analytics.invRetailUsd)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {canViewCosts ? (
              <>
                Costo invertido: <strong className="text-slate-700">{formatUsd(analytics.invCostUsd)}</strong>
              </>
            ) : (
              <span>{products.length} SKUs activos</span>
            )}
          </p>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Cuentas por Cobrar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{formatUsd(analytics.totalReceivableUsd)}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">{formatBs(analytics.totalReceivableUsd * billingRate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Meta de Ventas Mensual</h3>
              <p className="text-xs text-slate-500">Objetivo configurado: {formatUsd(settings.monthlyGoalUsd || 800)}</p>
            </div>
            {isAdmin && (
              editingGoal ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={goalVal}
                    onChange={(e) => setGoalVal(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ monthlyGoalUsd: goalVal || 800 }, 'Meta mensual');
                      setEditingGoal(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setGoalVal(settings.monthlyGoalUsd || 800);
                    setEditingGoal(true);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Editar Meta
                </button>
              )
            )}
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div style={{ width: `${goalPct}%` }} className="h-full bg-indigo-600 rounded-full transition-all" />
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>{goalPct}% completado</span>
            <span>{formatUsd(analytics.salesUsd)} / {formatUsd(settings.monthlyGoalUsd || 800)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">Semáforo de Cartera a {settings.defaultCreditDays || 15} Días</h3>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Al Día ({analytics.onTimeCount})</span>
              <span className="text-sm font-black text-emerald-900">{formatUsd(analytics.onTimeUsd)}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Por Vencer ({analytics.dueSoonCount})</span>
              <span className="text-sm font-black text-amber-900">{formatUsd(analytics.dueSoonUsd)}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-extrabold uppercase text-rose-700 block">Vencida ({analytics.overdueCount})</span>
              <span className="text-sm font-black text-rose-900">{formatUsd(analytics.overdueUsd)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Top Chucherías por Ingresos</span>
          </h3>
          {analytics.topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Aún no hay ventas despachadas en este período.</p>
          ) : (
            <div className="space-y-2.5">
              {analytics.topProducts.map((tp) => (
                <div key={tp.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{tp.name}</p>
                    <span className="text-[10px] text-slate-500">{tp.qty} uds vendidas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-indigo-700 block">{formatUsd(tp.revenue)}</span>
                    {canViewCosts && (
                      <span className="text-[10px] font-bold text-emerald-600">+{formatUsd(tp.profit)} ganancia</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Alertas de Capital Estancado</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">Productos con stock alto (&gt;15 uds) y 0 rotación en el período</p>
          {analytics.stagnantProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 font-semibold">
              ¡Excelente rotación! No hay inventario estancado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {analytics.stagnantProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <span className="text-[10px] text-slate-500">{p.sku} • {p.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-amber-800 block">{p.stock} uds paradas</span>
                    {canViewCosts && (
                      <span className="text-[10px] text-slate-500">Costo: {formatUsd(p.stock * p.costUsd)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO 2: FLUJO TRAZABLE DE PEDIDOS, VENTAS Y COBRANZAS (PIPELINE 4 ESTADOS)
// ============================================================================
function OrderPipelineView({ products, customers, orders, settings, isAdmin, user, showToast, recordAuditEvent }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showListParser, setShowListParser] = useState(false);
  const [rawWhatsappText, setRawWhatsappText] = useState('');
  const [parsedOrdersPreview, setParsedOrdersPreview] = useState([]);

  const [showQuickPos, setShowQuickPos] = useState(false);
  const [posCustomerId, setPosCustomerId] = useState('');
  const [posCart, setPosCart] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posPaymentType, setPosPaymentType] = useState('credit');

  const [reportPayModal, setReportPayModal] = useState(null);
  const [payRef, setPayRef] = useState('');
  const [payMethod, setPayMethod] = useState('Pago Móvil (Bs)');

  const billingRate = Number(settings.billingRate) || Number(settings.bcvEur) || 1;

  const analyzeWhatsappList = (text) => {
    setRawWhatsappText(text);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const results = [];

    lines.forEach((line) => {
      let customerPart = '';
      let itemsPart = line;

      if (line.includes(':')) {
        const idx = line.indexOf(':');
        customerPart = line.slice(0, idx).trim();
        itemsPart = line.slice(idx + 1).trim();
      }

      const matchedCustomer = customers.find(
        (c) => normalizeText(c.name) === normalizeText(customerPart) || normalizeText(c.cedula) === normalizeText(customerPart)
      );

      const rawTokens = itemsPart.split(/,|\by\b/i).map((t) => t.trim()).filter(Boolean);
      const matchedItems = [];

      rawTokens.forEach((token) => {
        const qtyMatch = token.match(/^(\d+)\s*(?:x|unds?|paq|tira)?\s*(.+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const prodQuery = qtyMatch ? qtyMatch[2].trim() : token;
        const prod = matchProductByQuery(prodQuery, products);
        if (prod) {
          matchedItems.push({
            id: prod.id,
            sku: prod.sku,
            name: prod.name,
            qty,
            priceUsd: Number(prod.priceUsd),
            costUsd: Number(prod.costUsd),
            rawQuery: token
          });
        }
      });

      if (matchedItems.length > 0) {
        results.push({
          customerName: matchedCustomer ? matchedCustomer.name : customerPart || 'Cliente General',
          customerId: matchedCustomer?.id || 'whatsapp-guest',
          customerCedula: matchedCustomer?.cedula || 'SIN-CI',
          items: matchedItems
        });
      }
    });

    setParsedOrdersPreview(results);
  };

  const handleConfirmParsedOrders = async () => {
    if (!user || parsedOrdersPreview.length === 0) return;
    try {
      const base = ['artifacts', appId, 'users', user.uid];
      const now = new Date();
      const due15 = new Date(now);
      due15.setDate(due15.getDate() + (settings.defaultCreditDays || 15));

      for (const ord of parsedOrdersPreview) {
        const totalUsd = ord.items.reduce((acc, i) => acc + i.priceUsd * i.qty, 0);
        const profitUsd = ord.items.reduce((acc, i) => acc + (i.priceUsd - i.costUsd) * i.qty, 0);
        await addDoc(collection(db, ...base, 'orders'), {
          orderNumber: `PED-${Math.floor(10000 + Math.random() * 90000)}`,
          customerId: ord.customerId,
          customerCedula: ord.customerCedula,
          customerName: ord.customerName,
          status: 'received',
          paymentType: 'credit',
          creditDays: settings.defaultCreditDays || 15,
          dueDate: due15.toISOString(),
          items: ord.items,
          totalUsd: Number(totalUsd.toFixed(2)),
          profitUsd: Number(profitUsd.toFixed(2)),
          paidUsd: 0,
          billingRateAtCreation: billingRate,
          historyLog: [
            { status: 'received', at: now.toISOString(), note: 'Pedido convertido automáticamente desde lista de WhatsApp' }
          ],
          createdAt: now.toISOString()
        });
      }

      await recordAuditEvent('ORDER_PARSE', 'Pedidos', `Convertidos ${parsedOrdersPreview.length} pedido(s) desde lista WhatsApp`);
      showToast(`${parsedOrdersPreview.length} pedido(s) estandarizados en la bandeja "Pedido Recibido"`);
      setShowListParser(false);
      setRawWhatsappText('');
      setParsedOrdersPreview([]);
    } catch (err) {
      showToast('Error guardando pedidos interpretados', 'error');
    }
  };

  const handleValidateDelivery = async (order) => {
    if (!user) return;
    try {
      const base = ['artifacts', appId, 'users', user.uid];
      const now = new Date();
      const due15 = new Date(now);
      due15.setDate(due15.getDate() + (order.creditDays || settings.defaultCreditDays || 15));

      for (const item of order.items || []) {
        const prod = products.find((p) => p.sku === item.sku || p.id === item.id);
        if (prod) {
          const newStock = Math.max(0, (Number(prod.stock) || 0) - (Number(item.qty) || 0));
          await updateDoc(doc(db, ...base, 'products', prod.id), { stock: newStock });
        }
      }

      const nextStatus = order.paymentType === 'cash' ? 'paid' : 'delivered';
      await updateDoc(doc(db, ...base, 'orders', order.id), {
        status: nextStatus,
        deliveredAt: now.toISOString(),
        dueDate: due15.toISOString(),
        paidUsd: order.paymentType === 'cash' ? order.totalUsd : order.paidUsd || 0,
        historyLog: [
          ...(order.historyLog || []),
          {
            status: nextStatus,
            at: now.toISOString(),
            note: order.paymentType === 'cash' ? 'Entregado y pagado de contado' : 'Entrega validada • Stock descontado • Crédito activo'
          }
        ]
      });

      await recordAuditEvent('ORDER_DELIVERED', 'Pedidos', `Entrega validada para ${order.orderNumber} (${order.customerName})`);
      showToast('Entrega validada: stock actualizado y cuenta por cobrar activa');
    } catch (err) {
      showToast('Error al validar entrega', 'error');
    }
  };

  const handleReportPayment = async (e) => {
    e.preventDefault();
    if (!user || !reportPayModal) return;
    try {
      const now = new Date();
      const amountBs = Number((reportPayModal.totalUsd * billingRate).toFixed(2));
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'orders', reportPayModal.id), {
        status: 'payment_reported',
        reportedPayment: {
          reference: payRef.trim() || 'S/R',
          method: payMethod,
          amountBs,
          rateUsed: billingRate,
          reportedAt: now.toISOString()
        },
        historyLog: [
          ...(reportPayModal.historyLog || []),
          {
            status: 'payment_reported',
            at: now.toISOString(),
            note: `Pago reportado (${payMethod} • Ref: ${payRef || 'N/A'}) por ${formatBs(amountBs)} a tasa € BCV ${formatBs(billingRate)}`
          }
        ]
      });
      await recordAuditEvent('PAYMENT_REPORTED', 'Cobranzas', `Pago reportado en ${reportPayModal.orderNumber} por ${formatBs(amountBs)}`);
      showToast('Pago reportado en Bs. Listo para validación final en banco.');
      setReportPayModal(null);
      setPayRef('');
    } catch (err) {
      showToast('Error reportando pago', 'error');
    }
  };

  const handleConfirmBankPayment = async (order) => {
    if (!user) return;
    try {
      const now = new Date();
      const amountBs = order.reportedPayment?.amountBs || Number((order.totalUsd * billingRate).toFixed(2));
      const rateUsed = order.reportedPayment?.rateUsed || billingRate;

      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'orders', order.id), {
        status: 'paid',
        paidUsd: Number(order.totalUsd),
        paidBs: amountBs,
        paidRateUsed: rateUsed,
        paidAt: now.toISOString(),
        historyLog: [
          ...(order.historyLog || []),
          {
            status: 'paid',
            at: now.toISOString(),
            note: `Pago validado en banco (${formatBs(amountBs)} @ € BCV ${formatBs(rateUsed)}) • Factura cerrada`
          }
        ]
      });
      await recordAuditEvent('PAYMENT_VALIDATED', 'Cobranzas', `Cobro validado para ${order.orderNumber} (${formatUsd(order.totalUsd)})`);
      showToast(`¡Cobro validado! Factura ${order.orderNumber} liquidada.`);
    } catch (err) {
      showToast('Error al confirmar pago', 'error');
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!user || !isAdmin) {
      showToast('Política RLS: Solo el Administrador puede eliminar órdenes', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'orders', order.id));
      await recordAuditEvent('ORDER_DELETED', 'Pedidos', `Orden eliminada: ${order.orderNumber}`);
      showToast('Orden eliminada');
    } catch (e) {
      showToast('Error eliminando orden', 'error');
    }
  };

  const handleCreateQuickPosOrder = async () => {
    if (!user || posCart.length === 0) return;
    const cust = customers.find((c) => c.id === posCustomerId);
    if (posPaymentType === 'credit' && !cust) {
      showToast('Selecciona un cliente para ventas a crédito', 'error');
      return;
    }

    try {
      const base = ['artifacts', appId, 'users', user.uid];
      const now = new Date();
      const creditDays = settings.defaultCreditDays || 15;
      const due15 = new Date(now);
      due15.setDate(due15.getDate() + creditDays);

      const totalUsd = posCart.reduce((acc, i) => acc + i.priceUsd * i.qty, 0);
      const profitUsd = posCart.reduce((acc, i) => acc + (i.priceUsd - i.costUsd) * i.qty, 0);
      const status = posPaymentType === 'cash' ? 'paid' : 'delivered';

      await addDoc(collection(db, ...base, 'orders'), {
        orderNumber: `POS-${Math.floor(10000 + Math.random() * 90000)}`,
        customerId: cust?.id || 'contado',
        customerCedula: cust?.cedula || 'CONTADO',
        customerName: cust?.name || 'Cliente Contado',
        status,
        paymentType: posPaymentType,
        creditDays: posPaymentType === 'credit' ? creditDays : 0,
        dueDate: due15.toISOString(),
        items: posCart.map((i) => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          priceUsd: i.priceUsd,
          costUsd: i.costUsd
        })),
        totalUsd: Number(totalUsd.toFixed(2)),
        profitUsd: Number(profitUsd.toFixed(2)),
        paidUsd: posPaymentType === 'cash' ? Number(totalUsd.toFixed(2)) : 0,
        billingRateAtCreation: billingRate,
        historyLog: [
          {
            status,
            at: now.toISOString(),
            note: posPaymentType === 'cash' ? 'Venta POS de Contado' : `Venta POS Despachada • Crédito ${creditDays} días`
          }
        ],
        createdAt: now.toISOString()
      });

      for (const item of posCart) {
        const newStock = Math.max(0, (Number(item.stock) || 0) - item.qty);
        await updateDoc(doc(db, ...base, 'products', item.id), { stock: newStock });
      }

      await recordAuditEvent('POS_SALE', 'Ventas POS', `Venta registrada para ${cust?.name || 'Contado'} por ${formatUsd(totalUsd)}`);
      showToast('Venta POS registrada y stock descontado');
      setPosCart([]);
      setShowQuickPos(false);
    } catch (err) {
      showToast('Error en POS', 'error');
    }
  };

  const copyWhatsAppCobro = (order) => {
    const balUsd = Math.max(0, (Number(order.totalUsd) || 0) - (Number(order.paidUsd) || 0));
    const balBs = balUsd * billingRate;
    const itemsStr = (order.items || []).map((i) => `• ${i.qty}x ${i.name} (${formatUsd(i.qty * i.priceUsd)})`).join('\n');
    const tpl =
      settings.whatsappCollectionTemplate ||
      '🧾 *ESTADO DE CUENTA {{orden}}*\n*{{negocio}}*\n\n👤 Cliente: *{{cliente}}* ({{cedula}})\n⏰ Vencimiento ({{dias}}d): {{fecha_vence}}\n\n{{items}}\n\n💵 *Total Divisas:* {{total_usd}}\n💱 *Tasa Euro BCV:* {{tasa_bcv}}\n🇻🇪 *Total Bs:* *{{total_bs}}*';

    const msg = tpl
      .replace(/{{orden}}/g, order.orderNumber || '')
      .replace(/{{negocio}}/g, settings.storeName || '')
      .replace(/{{cliente}}/g, order.customerName || '')
      .replace(/{{cedula}}/g, order.customerCedula || '')
      .replace(/{{fecha_entrega}}/g, formatDate(order.deliveredAt || order.createdAt))
      .replace(/{{dias}}/g, String(order.creditDays || settings.defaultCreditDays || 15))
      .replace(/{{fecha_vence}}/g, formatDate(order.dueDate))
      .replace(/{{items}}/g, itemsStr)
      .replace(/{{total_usd}}/g, formatUsd(balUsd))
      .replace(/{{tasa_bcv}}/g, formatBs(billingRate))
      .replace(/{{total_bs}}/g, formatBs(balBs));

    navigator.clipboard.writeText(msg);
    showToast('Nota de cobro copiada con tasa vigente');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.customerCedula || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  const STATUS_META = {
    received: { label: '1. Pedido Recibido', badge: 'bg-sky-100 text-sky-800 border-sky-200' },
    delivered: { label: '2. Despachado / Crédito', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    payment_reported: { label: '3. Pago Reportado (Bs)', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    paid: { label: '4. Cobrado y Validado', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowListParser(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            <span>Convertir Lista WhatsApp (Alias → SKU)</span>
          </button>

          <button
            onClick={() => setShowQuickPos(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>Venta Directa POS</span>
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente, cédula o #orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `Todos (${orders.length})` },
          { id: 'received', label: `1. Recibidos (${orders.filter((o) => o.status === 'received').length})` },
          { id: 'delivered', label: `2. Por Cobrar (${orders.filter((o) => o.status === 'delivered').length})` },
          { id: 'payment_reported', label: `3. Pago Reportado (${orders.filter((o) => o.status === 'payment_reported').length})` },
          { id: 'paid', label: `4. Validados (${orders.filter((o) => o.status === 'paid').length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No hay pedidos en este estado</h3>
          <p className="text-xs text-slate-500 mt-1">
            Usa "Convertir Lista WhatsApp" o comparte el Catálogo Web para recibir pedidos estandarizados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const meta = STATUS_META[order.status] || STATUS_META.received;
            const totalBsToday = (Number(order.totalUsd) || 0) * billingRate;
            const daysLeft = getDaysDiff(order.dueDate);
            const isOverdue = order.status === 'delivered' && daysLeft < 0;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-slate-500">{order.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${meta.badge}`}>
                          {meta.label}
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                            Vencido ({Math.abs(daysLeft)}d)
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 text-base mt-1">{order.customerName}</h4>
                      <span className="text-[11px] font-mono text-slate-500">CI: {order.customerCedula || 'N/A'}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900 block">{formatUsd(order.totalUsd)}</span>
                      <span className="text-xs font-bold text-emerald-700">{formatBs(totalBsToday)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {it.qty}x {it.name} <span className="text-[10px] font-mono text-slate-400">({it.sku})</span>
                        </span>
                        <span className="font-bold text-slate-900">{formatUsd(it.qty * it.priceUsd)}</span>
                      </div>
                    ))}
                  </div>

                  {order.historyLog && order.historyLog.length > 0 && (
                    <div className="text-[11px] text-slate-500 space-y-0.5 border-l-2 border-indigo-200 pl-2.5">
                      {order.historyLog.slice(-2).map((h, i) => (
                        <p key={i}>
                          <strong className="text-slate-700">{formatDateTime(h.at)}:</strong> {h.note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'received' && (
                      <button
                        onClick={() => handleValidateDelivery(order)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" /> Validar Entrega
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <>
                        <button
                          onClick={() => copyWhatsAppCobro(order)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" /> Cobrar WhatsApp
                        </button>
                        <button
                          onClick={() => setReportPayModal(order)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Reportar Pago Bs
                        </button>
                      </>
                    )}

                    {order.status === 'payment_reported' && (
                      <button
                        onClick={() => handleConfirmBankPayment(order)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validar Pago en Banco
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteOrder(order)}
                      title="Eliminar orden (Solo Admin)"
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showListParser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span>Convertidor Inteligente de Listas WhatsApp → SKUs</span>
              </h3>
              <button onClick={() => setShowListParser(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Pega la lista enviada por tus clientes (ej. <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">KRIS: 2 oreo americana, 1 doritos mega queso, 3 gomitas</code>). El motor asociará cada alias con su SKU oficial.
              </p>
              <textarea
                rows={5}
                value={rawWhatsappText}
                onChange={(e) => analyzeWhatsappList(e.target.value)}
                placeholder={'KRIS: 2 oreo americana, 1 doritos\nSINAI: 1 sussy, 2 club social'}
                className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-mono"
              />

              {parsedOrdersPreview.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-extrabold uppercase text-indigo-700 block">
                    Vista Previa Estandarizada ({parsedOrdersPreview.length} pedido/s):
                  </span>
                  {parsedOrdersPreview.map((ord, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                      <p className="font-extrabold text-slate-900">
                        {ord.customerName} ({ord.customerCedula})
                      </p>
                      <div className="mt-1 space-y-0.5 text-slate-600">
                        {ord.items.map((it, k) => (
                          <p key={k}>
                            • {it.qty}x <strong>{it.name}</strong> ({it.sku}) — {formatUsd(it.qty * it.priceUsd)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowListParser(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={parsedOrdersPreview.length === 0}
                  onClick={handleConfirmParsedOrders}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Crear Pedidos en Bandeja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickPos && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Punto de Venta Rápido (POS)</h3>
              <button onClick={() => setShowQuickPos(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Buscar chuchería..."
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {products
                    .filter((p) => normalizeText(p.name).includes(normalizeText(posSearch)) || normalizeText(p.sku).includes(normalizeText(posSearch)))
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPosCart((prev) => {
                            const found = prev.find((i) => i.id === p.id);
                            if (found) {
                              return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
                            }
                            return [...prev, { ...p, qty: 1 }];
                          });
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 flex items-center justify-between text-left text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{p.name}</span>
                          <span className="text-[10px] text-slate-500">Stock: {p.stock} uds</span>
                        </div>
                        <span className="font-black text-indigo-700">{formatUsd(p.priceUsd)}</span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cliente</label>
                    <select
                      value={posCustomerId}
                      onChange={(e) => setPosCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
                    >
                      <option value="">-- Seleccionar Cliente --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cedula})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosPaymentType('credit')}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        posPaymentType === 'credit' ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200'
                      }`}
                    >
                      Crédito ({settings.defaultCreditDays || 15}d)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPaymentType('cash')}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        posPaymentType === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200'
                      }`}
                    >
                      Contado
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {posCart.map((it) => (
                      <div key={it.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <span className="truncate font-semibold">{it.qty}x {it.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold">{formatUsd(it.qty * it.priceUsd)}</span>
                          <button
                            type="button"
                            onClick={() => setPosCart((prev) => prev.filter((x) => x.id !== it.id))}
                            className="text-rose-500 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs font-black">
                    <span>Total USD:</span>
                    <span>{formatUsd(posCart.reduce((acc, i) => acc + i.qty * i.priceUsd, 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-700">
                    <span>Total Bs (Cobro):</span>
                    <span>{formatBs(posCart.reduce((acc, i) => acc + i.qty * i.priceUsd, 0) * billingRate)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateQuickPosOrder}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Confirmar Despacho
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Reportar Pago en Bolívares</h3>
              <button onClick={() => setReportPayModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReportPayment} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-slate-800">Cliente: {reportPayModal.customerName}</p>
                <p>Monto Divisas: <strong>{formatUsd(reportPayModal.totalUsd)}</strong></p>
                <p className="text-sm font-black text-emerald-800">
                  Total a Transferir ({formatBs(billingRate)}/USD): {formatBs(reportPayModal.totalUsd * billingRate)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                  <option value="Transferencia Bancaria (Bs)">Transferencia Bancaria (Bs)</option>
                  <option value="Efectivo USD / Zelle">Efectivo USD / Zelle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Referencia</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 00458912"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportPayModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Registrar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MÓDULO 3: REPOSICIÓN INTELIGENTE POR TICKET FISCAL Y ALIAS DE PROVEEDOR
// ============================================================================
function RestockTicketView({ products, purchases, settings, isAdmin, user, showToast, recordAuditEvent }) {
  const [ticketText, setTicketText] = useState('');
  const [ticketCurrency, setTicketCurrency] = useState('BS');
  const [parsedLines, setParsedLines] = useState([]);
  const [saving, setSaving] = useState(false);

  const bcvUsd = Number(settings.bcvUsd) || 1;
  const lowStockProducts = useMemo(
    () => products.filter((p) => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)),
    [products]
  );

  const parseFiscalTicket = (raw) => {
    setTicketText(raw);
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const items = [];

    lines.forEach((line) => {
      const m = line.match(/^(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)$/);
      if (m) {
        const packsQty = parseInt(m[1], 10);
        const desc = m[2].trim();
        const rawAmount = parseFloat(m[3].replace(',', '.'));
        const matched = matchProductByQuery(desc, products);
        const unitsPerPack = matched?.unitsPerPack || 1;
        const totalUnits = packsQty * unitsPerPack;
        const lineUsd = ticketCurrency === 'BS' ? rawAmount / bcvUsd : rawAmount;
        const newUnitCostUsd = totalUnits > 0 ? Number((lineUsd / totalUnits).toFixed(3)) : 0;

        items.push({
          rawLine: line,
          packsQty,
          desc,
          rawAmount,
          matchedProduct: matched || null,
          unitsPerPack,
          totalUnits,
          lineUsd: Number(lineUsd.toFixed(2)),
          newUnitCostUsd
        });
      }
    });

    setParsedLines(items);
  };

  const handleApplyRestock = async () => {
    if (!user || parsedLines.length === 0) return;
    if (!isAdmin && !settings.supervisorCanReceiveTicket) {
      showToast('Política RLS: El Administrador deshabilitó la recepción de tickets para Supervisor', 'error');
      return;
    }
    setSaving(true);
    try {
      const base = ['artifacts', appId, 'users', user.uid];
      let updatedCount = 0;

      for (const line of parsedLines) {
        if (!line.matchedProduct) continue;
        const prod = line.matchedProduct;
        const nextStock = (Number(prod.stock) || 0) + line.totalUnits;
        const updates = { stock: nextStock };
        if (isAdmin && line.newUnitCostUsd > 0) {
          updates.costUsd = Number(line.newUnitCostUsd.toFixed(2));
        }
        await updateDoc(doc(db, ...base, 'products', prod.id), updates);
        updatedCount++;
      }

      const totalPurchaseUsd = parsedLines.reduce((acc, l) => acc + l.lineUsd, 0);
      await addDoc(collection(db, ...base, 'purchases'), {
        currency: ticketCurrency,
        bcvUsdUsed: bcvUsd,
        totalUsd: Number(totalPurchaseUsd.toFixed(2)),
        itemsCount: updatedCount,
        rawText: ticketText,
        createdAt: new Date().toISOString()
      });

      await recordAuditEvent('TICKET_RESTOCK', 'Reposición', `Procesado ticket por ${formatUsd(totalPurchaseUsd)} (${updatedCount} SKUs)`);
      showToast(`¡Inventario repuesto! ${updatedCount} productos sumados al stock.`);
      setTicketText('');
      setParsedLines([]);
    } catch (err) {
      showToast('Error aplicando reposición', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <span>Lector Inteligente de Ticket Fiscal del Proveedor</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pega el texto del ticket fiscal (ej. <code className="font-mono bg-slate-100 px-1 rounded">2 TIRA DORITOS 980.00</code>). Convierte bultos/tiras a unidades y actualiza costos en USD.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTicketCurrency('BS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                ticketCurrency === 'BS' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Ticket en Bs (BCV {formatBs(bcvUsd)})
            </button>
            <button
              type="button"
              onClick={() => setTicketCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                ticketCurrency === 'USD' ? 'bg-emerald-600 text-white' : 'text-slate-600'
              }`}
            >
              Ticket en USD ($)
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={ticketText}
          onChange={(e) => parseFiscalTicket(e.target.value)}
          placeholder={'1 TIRA DORITOS MEGA QUESO 488.25\n2 OREO PEQUENA 576.45\n1 BULTO GOMITAS PLAY 682.50'}
          className="w-full p-4 rounded-2xl border border-slate-300 text-xs font-mono"
        />

        {parsedLines.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold">
                  <tr>
                    <th className="p-3">Línea Ticket</th>
                    <th className="p-3">SKU Reconocido</th>
                    <th className="p-3">Unidades (+Stock)</th>
                    {isAdmin && <th className="p-3">Nuevo Costo/Und</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedLines.map((l, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-mono">{l.packsQty}x {l.desc}</td>
                      <td className="p-3">
                        {l.matchedProduct ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {l.matchedProduct.sku} • {l.matchedProduct.name}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Sin coincidencia</span>
                        )}
                      </td>
                      <td className="p-3 font-black text-indigo-700">+{l.totalUnits} uds</td>
                      {isAdmin && <td className="p-3 font-bold">{formatUsd(l.newUnitCostUsd)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleApplyRestock}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
              >
                {saving ? 'Procesando...' : 'Confirmar Ingreso al Inventario'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Productos Agotados o en Punto de Reorden ({lowStockProducts.length})
            </h3>
            <p className="text-xs text-slate-500">Artículos de tu catálogo con stock actual ≤ stock mínimo</p>
          </div>
          {lowStockProducts.length > 0 && (
            <button
              onClick={() => {
                const txt = lowStockProducts.map((p) => `• 1x ${p.packLabel} de ${p.name} (${p.sku})`).join('\n');
                navigator.clipboard.writeText(`📦 *PEDIDO REPOSICIÓN - ${settings.storeName}*\n\n${txt}`);
                showToast('Lista de reposición copiada para el proveedor');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" /> Copiar Lista Proveedor
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lowStockProducts.map((p) => (
            <div key={p.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-slate-400">{p.sku}</span>
                <p className="text-xs font-extrabold text-slate-900 truncate">{p.name}</p>
                <span className="text-[11px] text-slate-500">{p.packLabel}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                  p.stock <= 0 ? 'bg-rose-600 text-white' : 'bg-amber-400 text-slate-950'
                }`}
              >
                {p.stock} uds
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO 4: FICHAS TÉCNICAS DE PRODUCTOS (CATÁLOGO MAESTRO + MODO PRIVADO)
// ============================================================================
function ProductSheetsView({ products, settings, canViewCosts, isAdmin, hideCosts, setHideCosts, user, showToast, recordAuditEvent }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'Snacks Salados',
    packLabel: 'Tira x 12 und',
    unitsPerPack: 12,
    costUsd: '',
    priceUsd: '',
    stock: '',
    minStock: 6,
    aliases: '',
    image: ''
  });

  const billingRate = Number(settings.billingRate) || Number(settings.bcvEur) || 1;
  const effectiveShowCosts = canViewCosts && !hideCosts;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = normalizeText(search);
      const matchSearch =
        !q ||
        normalizeText(p.sku).includes(q) ||
        normalizeText(p.name).includes(q) ||
        normalizeText(p.aliases).includes(q);
      const matchCat = catFilter === 'Todas' || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  const openModal = (prod = null) => {
    if (!isAdmin) {
      showToast('Política RLS: Solo el Administrador puede crear o editar fichas de productos', 'error');
      return;
    }
    if (prod) {
      setEditingProd(prod);
      setForm({
        sku: prod.sku || '',
        name: prod.name || '',
        category: prod.category || 'Snacks Salados',
        packLabel: prod.packLabel || 'Tira x 12 und',
        unitsPerPack: prod.unitsPerPack || 12,
        costUsd: prod.costUsd || '',
        priceUsd: prod.priceUsd || '',
        stock: prod.stock ?? 0,
        minStock: prod.minStock ?? 6,
        aliases: prod.aliases || '',
        image: prod.image || ''
      });
    } else {
      setEditingProd(null);
      setForm({
        sku: `CHU-${String(products.length + 1).padStart(3, '0')}`,
        name: '',
        category: 'Snacks Salados',
        packLabel: 'Tira x 12 und',
        unitsPerPack: 12,
        costUsd: '',
        priceUsd: '',
        stock: 0,
        minStock: 6,
        aliases: '',
        image: ''
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !form.name.trim() || !isAdmin) return;
    try {
      const payload = {
        sku: form.sku.trim().toUpperCase(),
        name: form.name.trim().toUpperCase(),
        category: form.category,
        packLabel: form.packLabel.trim(),
        unitsPerPack: Number(form.unitsPerPack) || 1,
        costUsd: Number((parseFloat(form.costUsd) || 0).toFixed(2)),
        priceUsd: Number((parseFloat(form.priceUsd) || 0).toFixed(2)),
        stock: parseInt(form.stock, 10) || 0,
        minStock: parseInt(form.minStock, 10) || 0,
        aliases: form.aliases.trim(),
        image: form.image || getProductPlaceholderImage(form.name, form.category),
        updatedAt: new Date().toISOString()
      };

      if (editingProd) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', editingProd.id), payload);
        await recordAuditEvent('PRODUCT_UPDATE', 'Productos', `Ficha actualizada: ${payload.sku} (${payload.name})`);
        showToast('Ficha de producto actualizada');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        await recordAuditEvent('PRODUCT_CREATE', 'Productos', `Producto creado: ${payload.sku} (${payload.name})`);
        showToast('Producto agregado al catálogo');
      }
      setModalOpen(false);
    } catch (err) {
      showToast('Error guardando ficha', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por SKU, nombre o alias (ej. oreo americana)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canViewCosts && (
            <button
              onClick={() => setHideCosts(!hideCosts)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                hideCosts
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Oculta tus costos y márgenes cuando muestras la pantalla a un cliente"
            >
              {hideCosts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{hideCosts ? 'Costos Ocultos' : 'Ocultar Costos'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva Ficha
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const marginUsd = (Number(p.priceUsd) || 0) - (Number(p.costUsd) || 0);
          const marginPct = p.priceUsd > 0 ? Math.round((marginUsd / p.priceUsd) * 100) : 0;

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden">
              <div className="relative h-40 bg-gradient-to-b from-slate-50 to-slate-100/70 flex items-center justify-center p-4 border-b border-slate-100">
                <img src={p.image} alt={p.name} className="max-h-32 max-w-full object-contain drop-shadow-sm" />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-extrabold text-slate-700">
                  {p.sku}
                </span>
                <span
                  className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                    p.stock <= 0
                      ? 'bg-rose-600 text-white'
                      : p.stock <= p.minStock
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {p.stock} uds
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600">{p.category}</span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{p.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Empaque: {p.packLabel}</p>
                  {p.aliases && (
                    <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1" title={p.aliases}>
                      Alias: {p.aliases}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black text-slate-900">{formatUsd(p.priceUsd)}</span>
                      <span className="text-xs font-bold text-indigo-600 block">
                        {formatBs(p.priceUsd * billingRate)}
                      </span>
                    </div>

                    {effectiveShowCosts && (
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">Costo: {formatUsd(p.costUsd)}</span>
                        <span className="text-[11px] font-extrabold text-emerald-600">+{marginPct}% margen</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => openModal(p)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar Ficha / Foto PNG
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProd ? `Ficha Técnica: ${editingProd.sku}` : 'Nueva Ficha de Producto'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
                <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shrink-0">
                  {form.image ? (
                    <img src={form.image} alt="PNG" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Package className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">Imagen PNG Transparente</p>
                  <p className="text-[11px] text-slate-500">Conserva fondo transparente de alta nitidez.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const uri = await compressImagePreservingPng(f, 420);
                        setForm({ ...form, image: uri });
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir PNG
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Interno</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidad Empaque</label>
                  <input
                    type="text"
                    placeholder="Tira x 12 und"
                    value={form.packLabel}
                    onChange={(e) => setForm({ ...form, packLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Uds por Empaque</label>
                  <input
                    type="number"
                    min="1"
                    value={form.unitsPerPack}
                    onChange={(e) => setForm({ ...form, unitsPerPack: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.costUsd}
                    onChange={(e) => setForm({ ...form, costUsd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.priceUsd}
                    onChange={(e) => setForm({ ...form, priceUsd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Mín.</label>
                  <input
                    type="number"
                    required
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alias de Reconocimiento (para Tickets Fiscales y Pedidos de Clientes)
                </label>
                <input
                  type="text"
                  placeholder="Ej. oreo americana, oreo pequena, oreo azul"
                  value={form.aliases}
                  onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MÓDULO 5: EXPEDIENTE 360° DE CLIENTES (CÉDULA COMO CÓDIGO ÚNICO)
// ============================================================================
function Customers360View({ customers, orders, settings, user, showToast }) {
  const [search, setSearch] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCedula, setEditingCedula] = useState(false);
  const [cedulaInput, setCedulaInput] = useState('');

  const [newForm, setNewForm] = useState({
    cedula: '',
    name: '',
    phone: '',
    zone: 'P3',
    creditLimitUsd: 30
  });

  const billingRate = Number(settings.billingRate) || Number(settings.bcvEur) || 1;

  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custOrders = orders.filter(
        (o) =>
          o.customerId === c.id ||
          (c.cedula && o.customerCedula === c.cedula) ||
          normalizeText(o.customerName) === normalizeText(c.name)
      );

      let debtUsd = 0;
      let totalBoughtUsd = 0;
      const prodFreq = {};

      custOrders.forEach((o) => {
        if (o.status === 'received') return;
        totalBoughtUsd += Number(o.totalUsd) || 0;
        if (o.status !== 'paid') {
          debtUsd += Math.max(0, (Number(o.totalUsd) || 0) - (Number(o.paidUsd) || 0));
        }
        (o.items || []).forEach((it) => {
          prodFreq[it.name] = (prodFreq[it.name] || 0) + (Number(it.qty) || 0);
        });
      });

      const topProducts = Object.entries(prodFreq)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      return {
        ...c,
        debtUsd,
        totalBoughtUsd,
        ordersCount: custOrders.length,
        topProducts,
        history: custOrders
      };
    });
  }, [customers, orders]);

  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      if (onlyDebtors && c.debtUsd <= 0.01) return false;
      const q = normalizeText(search);
      if (!q) return true;
      return (
        normalizeText(c.name).includes(q) ||
        normalizeText(c.cedula).includes(q) ||
        normalizeText(c.zone).includes(q)
      );
    });
  }, [enrichedCustomers, search, onlyDebtors]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!user || !newForm.cedula.trim() || !newForm.name.trim()) return;
    const cleanCi = newForm.cedula.trim().toUpperCase();
    if (customers.some((c) => normalizeText(c.cedula) === normalizeText(cleanCi))) {
      showToast('Ya existe un cliente registrado con esta Cédula', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'), {
        cedula: cleanCi,
        name: newForm.name.trim().toUpperCase(),
        phone: newForm.phone.trim(),
        zone: newForm.zone.trim(),
        creditLimitUsd: Number(newForm.creditLimitUsd) || 30,
        createdAt: new Date().toISOString()
      });
      showToast('Cliente registrado con Cédula única');
      setShowNewModal(false);
      setNewForm({ cedula: '', name: '', phone: '', zone: 'P3', creditLimitUsd: 30 });
    } catch (err) {
      showToast('Error al registrar cliente', 'error');
    }
  };

  const handleUpdateCedula = async () => {
    if (!user || !selectedCustomer || !cedulaInput.trim()) return;
    try {
      const cleanCi = cedulaInput.trim().toUpperCase();
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', selectedCustomer.id), {
        cedula: cleanCi
      });
      setSelectedCustomer((prev) => ({ ...prev, cedula: cleanCi }));
      setEditingCedula(false);
      showToast('Cédula actualizada');
    } catch (err) {
      showToast('Error actualizando cédula', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Cédula (V-...), Nombre o Piso/Zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => setOnlyDebtors(!onlyDebtors)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
              onlyDebtors ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            Con Deuda
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">No se encontraron clientes</div>
          ) : (
            filteredCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setEditingCedula(false);
                }}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  selectedCustomer?.id === c.id ? 'bg-indigo-50/70' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                      {c.cedula}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{c.zone}</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm mt-1 truncate">{c.name}</p>
                </div>

                <div className="text-right shrink-0">
                  {c.debtUsd > 0.01 ? (
                    <>
                      <span className="text-xs font-black text-rose-600 block">Debe: {formatUsd(c.debtUsd)}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{formatBs(c.debtUsd * billingRate)}</span>
                    </>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      Solvente
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        {!selectedCustomer ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center sticky top-24">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Expediente 360° del Cliente</h3>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona un cliente de la lista para ver su Cédula, deuda actual en USD/Bs, top productos comprados e historial auditado.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-24 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                {editingCedula ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={cedulaInput}
                      onChange={(e) => setCedulaInput(e.target.value)}
                      placeholder="V-12345678"
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                    <button
                      onClick={handleUpdateCedula}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCedulaInput(selectedCustomer.cedula);
                      setEditingCedula(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 cursor-pointer"
                    title="Clic para asignar o editar Cédula real"
                  >
                    <span>CI: {selectedCustomer.cedula}</span>
                    <Edit3 className="w-3 h-3 text-indigo-600" />
                  </button>
                )}

                <span className="text-xs font-semibold text-slate-500">{selectedCustomer.zone}</span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mt-2">{selectedCustomer.name}</h3>
              {selectedCustomer.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800 block">Deuda Actual</span>
                <span className="text-lg font-black text-rose-700">{formatUsd(selectedCustomer.debtUsd)}</span>
                <span className="text-[11px] font-semibold text-rose-600 block">
                  {formatBs(selectedCustomer.debtUsd * billingRate)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block">Histórico Compras</span>
                <span className="text-lg font-black text-slate-900">{formatUsd(selectedCustomer.totalBoughtUsd)}</span>
                <span className="text-[11px] text-slate-500 block">{selectedCustomer.ordersCount} orden(es)</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-2">Top Chucherías Favoritas</h4>
              {selectedCustomer.topProducts.length === 0 ? (
                <p className="text-xs text-slate-400">Sin compras registradas aún</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCustomer.topProducts.map((tp) => (
                    <span
                      key={tp.name}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-100"
                    >
                      {tp.name} ({tp.qty})
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-2">Historial de Operaciones</h4>
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {selectedCustomer.history.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin movimientos</p>
                ) : (
                  selectedCustomer.history.map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-700">{h.orderNumber}</span>
                        <span className="text-[11px] text-slate-500 block">{formatDate(h.createdAt)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatUsd(h.totalUsd)}</span>
                        <span
                          className={`text-[10px] font-bold ${
                            h.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {h.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Cliente (Cédula Única)</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cédula de Identidad (Código Único) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. V-24567890"
                  value={newForm.cedula}
                  onChange={(e) => setNewForm({ ...newForm, cedula: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. MARIA PEREZ"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0412-0000000"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ubicación / Piso</label>
                  <input
                    type="text"
                    placeholder="P3, P4, MZ..."
                    value={newForm.zone}
                    onChange={(e) => setNewForm({ ...newForm, zone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MÓDULO 6: TIENDA E-COMMERCE ESTANDARIZADA PARA CLIENTES FINALES
// ============================================================================
function StorefrontCatalogView({ products, customers, settings, user, showToast, recordAuditEvent }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [cart, setCart] = useState([]);
  const [cedulaInput, setCedulaInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState('credit');
  const [submitting, setSubmitting] = useState(false);

  const billingRate = Number(settings.billingRate) || Number(settings.bcvEur) || 1;

  const handleCedulaLookup = (val) => {
    setCedulaInput(val);
    const found = customers.find((c) => normalizeText(c.cedula) === normalizeText(val));
    if (found) {
      setCustomerName(found.name);
    }
  };

  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      if ((Number(p.stock) || 0) <= 0) return false;
      const q = normalizeText(search);
      const matchQ = !q || normalizeText(p.name).includes(q) || normalizeText(p.sku).includes(q);
      const matchCat = catFilter === 'Todas' || p.category === catFilter;
      return matchQ && matchCat;
    });
  }, [products, search, catFilter]);

  const addToCart = (prod) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === prod.id);
      if (existing) {
        if (existing.qty >= prod.stock) return prev;
        return prev.map((i) => (i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const totalUsd = cart.reduce((acc, i) => acc + i.priceUsd * i.qty, 0);

  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (!user || cart.length === 0 || !customerName.trim()) return;
    setSubmitting(true);
    try {
      const base = ['artifacts', appId, 'users', user.uid];
      const now = new Date();
      const due15 = new Date(now);
      due15.setDate(due15.getDate() + (settings.defaultCreditDays || 15));
      const matchedCust = customers.find((c) => normalizeText(c.cedula) === normalizeText(cedulaInput));

      const profitUsd = cart.reduce((acc, i) => acc + (i.priceUsd - i.costUsd) * i.qty, 0);
      const orderNum = `WEB-${Math.floor(10000 + Math.random() * 90000)}`;

      await addDoc(collection(db, ...base, 'orders'), {
        orderNumber: orderNum,
        customerId: matchedCust?.id || 'web-client',
        customerCedula: cedulaInput.trim().toUpperCase() || 'SIN-CI',
        customerName: customerName.trim().toUpperCase(),
        status: 'received',
        paymentType: paymentMode,
        creditDays: paymentMode === 'credit' ? settings.defaultCreditDays || 15 : 0,
        dueDate: due15.toISOString(),
        items: cart.map((i) => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          priceUsd: i.priceUsd,
          costUsd: i.costUsd
        })),
        totalUsd: Number(totalUsd.toFixed(2)),
        profitUsd: Number(profitUsd.toFixed(2)),
        paidUsd: 0,
        billingRateAtCreation: billingRate,
        historyLog: [
          { status: 'received', at: now.toISOString(), note: 'Pedido enviado desde Catálogo Web Estandarizado' }
        ],
        createdAt: now.toISOString()
      });

      await recordAuditEvent('WEB_ORDER', 'Catálogo Web', `Pedido ${orderNum} recibido de ${customerName.toUpperCase()}`);
      showToast(`¡Pedido ${orderNum} enviado! Validaremos y despacharemos pronto.`);
      setCart([]);
      setCedulaInput('');
      setCustomerName('');
    } catch (err) {
      showToast('Error enviando pedido', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar chucherías disponibles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {availableProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-28 bg-slate-50 rounded-xl flex items-center justify-center p-2 mb-2.5">
                  <img src={p.image} alt={p.name} className="max-h-24 object-contain" />
                </div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">{p.category}</span>
                <h4 className="text-xs font-black text-slate-900 line-clamp-1">{p.name}</h4>
                <span className="text-[10px] text-slate-500">{p.stock} disponibles</span>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900 block">{formatUsd(p.priceUsd)}</span>
                  <span className="text-[10px] font-bold text-emerald-700">{formatBs(p.priceUsd * billingRate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4">
        <form onSubmit={handleSendOrder} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sticky top-24 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Tu Pedido ({cart.reduce((a, b) => a + b.qty, 0)})</span>
            </h3>
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])} className="text-[11px] text-rose-600 font-bold">
                Vaciar
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Selecciona chucherías del catálogo para armar tu pedido.</p>
            ) : (
              cart.map((it) => (
                <div key={it.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                  <span className="font-bold text-slate-800 truncate pr-2">{it.qty}x {it.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black">{formatUsd(it.qty * it.priceUsd)}</span>
                    <button
                      type="button"
                      onClick={() => setCart((prev) => prev.filter((x) => x.id !== it.id))}
                      className="text-rose-500 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Tu Cédula (ej. V-12345678)"
              value={cedulaInput}
              onChange={(e) => handleCedulaLookup(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
            />
            <input
              type="text"
              required
              placeholder="Tu Nombre y Apellido *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('credit')}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  paymentMode === 'credit' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Crédito ({settings.defaultCreditDays || 15}d)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  paymentMode === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Pago Contado
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Divisas:</span>
              <span className="font-black text-base">{formatUsd(totalUsd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Ref. Bs (Tasa Cobro):</span>
              <span className="font-bold text-emerald-400">{formatBs(totalUsd * billingRate)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
          >
            {submitting ? 'Enviando Pedido...' : 'Enviar Pedido Estandarizado'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO 7: CONFIGURACIÓN VISUAL/OPERATIVA, SEGURIDAD RLS Y GITHUB BLUEPRINT
// ============================================================================
function SettingsSecurityGitHubView({
  settings,
  onUpdateSettings,
  currentRole,
  onSwitchRole,
  isAdmin,
  auditLogs,
  showToast
}) {
  const [subTab, setSubTab] = useState('visual');
  const [simRole, setSimRole] = useState('Supervisor');
  const [simCollection, setSimCollection] = useState('products');
  const [simAction, setSimAction] = useState('delete');
  const [selectedGhFile, setSelectedGhFile] = useState('firestore.rules');
  const logoInputRef = useRef(null);

  const [localForm, setLocalForm] = useState({ ...settings });

  useEffect(() => {
    setLocalForm({ ...settings });
  }, [settings]);

  const handleSaveVisualAndOps = async (e) => {
    e.preventDefault();
    await onUpdateSettings(localForm, 'Configuración Visual y Operativa v3.0');
    showToast('Configuración guardada y sincronizada en la nube');
  };

  const rlsEvaluation = useMemo(() => {
    if (simRole === 'Administrador') {
      return {
        allowed: true,
        ruleRef: 'isAdmin(ownerId) == true',
        reason: 'El rol Administrador tiene control total sobre lectura, escritura y eliminación en el espacio de trabajo.'
      };
    }

    if (simCollection === 'audit_logs' && (simAction === 'update' || simAction === 'delete')) {
      return {
        allowed: false,
        ruleRef: 'match /audit_logs/{logId} -> allow update, delete: if false',
        reason: 'La bitácora de auditoría es estrictamente inmutable para garantizar trazabilidad forense.'
      };
    }

    if (simCollection === 'settings' || simCollection === 'profiles') {
      if (simAction === 'read') {
        return {
          allowed: true,
          ruleRef: 'isSupervisorOrAdmin(ownerId)',
          reason: 'El Supervisor puede leer parámetros operativos generales pero no modificar configuración ni roles.'
        };
      }
      return {
        allowed: false,
        ruleRef: 'allow write: if isAdmin(ownerId)',
        reason: 'Solo el Administrador puede cambiar configuración del sistema, tasas o asignar roles.'
      };
    }

    if (simAction === 'delete') {
      return {
        allowed: false,
        ruleRef: 'allow delete: if isAdmin(ownerId)',
        reason: 'La eliminación de productos, clientes, pedidos o compras está bloqueada para Supervisor.'
      };
    }

    return {
      allowed: true,
      ruleRef: 'isSupervisorOrAdmin(ownerId)',
      reason: 'Operación operativa permitida para el rol Supervisor dentro del flujo de despacho y cobranza.'
    };
  }, [simRole, simCollection, simAction]);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado al portapapeles`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'visual', label: '1. Visual, Tienda y Reglas Operativas', icon: Palette },
          { id: 'rls', label: '2. Seguridad RLS, Roles y Auditoría', icon: ShieldCheck },
          { id: 'github', label: '3. Repositorio GitHub y Despliegue', icon: GitBranch }
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={active ? { backgroundColor: settings.accentColor || '#4f46e5' } : undefined}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                active ? 'text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'visual' && (
        <form onSubmit={handleSaveVisualAndOps} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Personalización Visual y Reglas del Negocio</h3>
              <p className="text-xs text-slate-500">
                Adapta la apariencia, identidad, monedas y plantillas de WhatsApp en PC, tablet o teléfono.
              </p>
            </div>
            {!isAdmin && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                Modo Lectura (Solo Admin guarda)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="md:col-span-2 flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2">
                {localForm.brandLogo ? (
                  <img src={localForm.brandLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-2xl font-black text-indigo-600">C3</span>
                )}
              </div>
            </div>
            <div className="md:col-span-6 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Nombre de tu Emprendimiento</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={localForm.storeName || ''}
                onChange={(e) => setLocalForm({ ...localForm, storeName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold"
              />
            </div>
            <div className="md:col-span-4 flex flex-col items-start md:items-end gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const uri = await compressImagePreservingPng(f, 300);
                    setLocalForm({ ...localForm, brandLogo: uri });
                  }
                }}
              />
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => logoInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> Subir Logo PNG
              </button>
              {localForm.brandLogo && isAdmin && (
                <button
                  type="button"
                  onClick={() => setLocalForm({ ...localForm, brandLogo: '' })}
                  className="text-[11px] text-rose-600 font-bold"
                >
                  Restablecer emblema
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-extrabold text-slate-800 block">Color Principal</label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setLocalForm({ ...localForm, accentColor: p.hex })}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer ${
                      localForm.accentColor === p.hex ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                    }`}
                  >
                    {localForm.accentColor === p.hex && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                disabled={!isAdmin}
                value={localForm.accentColor || '#4f46e5'}
                onChange={(e) => setLocalForm({ ...localForm, accentColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-extrabold text-slate-800 block">Tema de Superficie</label>
              {[
                { id: 'light', label: 'Claro Editorial' },
                { id: 'dark', label: 'Oscuro Grafito' },
                { id: 'midnight', label: 'Noche Profunda' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setLocalForm({ ...localForm, surfaceTheme: t.id })}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    localForm.surfaceTheme === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-extrabold text-slate-800 block">Regla de Tasa de Cobro</label>
              {[
                { id: 'euro_bcv', label: 'Igualar a Euro BCV (€)' },
                { id: 'usd_bcv', label: 'Igualar a Dólar BCV ($)' },
                { id: 'custom', label: 'Tasa Personalizada' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() =>
                    setLocalForm({
                      ...localForm,
                      billingRateMode: m.id,
                      billingRate:
                        m.id === 'euro_bcv'
                          ? localForm.bcvEur
                          : m.id === 'usd_bcv'
                          ? localForm.bcvUsd
                          : localForm.billingRate
                    })
                  }
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    localForm.billingRateMode === m.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-extrabold text-slate-800 block">Parámetros Operativos</label>
              <div>
                <span className="text-[11px] text-slate-500 block">Plazo Crédito (días)</span>
                <input
                  type="number"
                  min="1"
                  max="90"
                  disabled={!isAdmin}
                  value={localForm.defaultCreditDays || 15}
                  onChange={(e) => setLocalForm({ ...localForm, defaultCreditDays: Number(e.target.value) || 15 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={Boolean(localForm.supervisorCanSeeCosts)}
                  onChange={(e) => setLocalForm({ ...localForm, supervisorCanSeeCosts: e.target.checked })}
                />
                <span>Permitir ver costos a Supervisor</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Plantilla de Mensaje de Cobranza WhatsApp
            </label>
            <p className="text-[11px] text-slate-500">
              Variables disponibles: {'{{orden}}'}, {'{{negocio}}'}, {'{{cliente}}'}, {'{{cedula}}'}, {'{{dias}}'}, {'{{fecha_vence}}'}, {'{{items}}'}, {'{{total_usd}}'}, {'{{tasa_bcv}}'}, {'{{total_bs}}'}
            </p>
            <textarea
              rows={5}
              disabled={!isAdmin}
              value={localForm.whatsappCollectionTemplate || ''}
              onChange={(e) => setLocalForm({ ...localForm, whatsappCollectionTemplate: e.target.value })}
              className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-mono"
            />
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                style={{ backgroundColor: localForm.accentColor || '#4f46e5' }}
                className="px-6 py-3 rounded-xl text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Guardar Toda la Configuración
              </button>
            </div>
          )}
        </form>
      )}

      {subTab === 'rls' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Simulador de Políticas RBAC & Reglas RLS</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Verifica cómo se evalúan los permisos entre Administrador y Supervisor sobre cada colección.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Cambiar mi rol ahora:</span>
                <button
                  onClick={() => onSwitchRole(currentRole === 'Administrador' ? 'Supervisor' : 'Administrador')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Cambiar a {currentRole === 'Administrador' ? 'Supervisor' : 'Administrador'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Rol Evaluado</label>
                <select
                  value={simRole}
                  onChange={(e) => setSimRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Colección Firestore</label>
                <select
                  value={simCollection}
                  onChange={(e) => setSimCollection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
                >
                  <option value="products">products (Fichas y Costos)</option>
                  <option value="orders">orders (Pedidos y Cobranzas)</option>
                  <option value="customers">customers (Clientes / Cédula)</option>
                  <option value="purchases">purchases (Tickets Reposición)</option>
                  <option value="settings">settings (Configuración / Tasas)</option>
                  <option value="audit_logs">audit_logs (Bitácora Inmutable)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Acción Solicitada</label>
                <select
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
                >
                  <option value="read">read (Leer / Consultar)</option>
                  <option value="create">create (Crear Registro)</option>
                  <option value="update">update (Actualizar Estado / Stock)</option>
                  <option value="delete">delete (Eliminar Registro)</option>
                </select>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                rlsEvaluation.allowed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              {rlsEvaluation.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-black">
                  {rlsEvaluation.allowed ? 'PERMITIDO (ALLOW)' : 'DENEGADO POR POLÍTICA RLS (DENY)'}
                </p>
                <p>{rlsEvaluation.reason}</p>
                <p className="font-mono text-[11px] opacity-80">Regla: {rlsEvaluation.ruleRef}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Bitácora de Auditoría ({auditLogs.length})</span>
                </h3>
                <p className="text-xs text-slate-500">Registro cronológico de accesos, cambios de rol, BCV, compras y cobros.</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {auditLogs.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">Aún no hay eventos registrados en la bitácora.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-800">{log.module}</span>
                        <span className="text-[11px] text-indigo-600 font-semibold">• {log.role}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.details}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 shrink-0">
                      <span className="block font-mono">{log.actorEmail}</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'github' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <span>Blueprint de Repositorio GitHub para ChuchePOS Cloud v3.0</span>
              </h3>
              <p className="text-xs text-slate-500">
                Copia estos archivos a tu repositorio en GitHub para publicar la app en Cloudflare Pages y editarla desde cualquier dispositivo.
              </p>
            </div>
            <button
              onClick={() => copyText(GITHUB_FILES_BLUEPRINT[selectedGhFile], selectedGhFile)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" /> Copiar {selectedGhFile}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.keys(GITHUB_FILES_BLUEPRINT).map((fname) => (
              <button
                key={fname}
                onClick={() => setSelectedGhFile(fname)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                  selectedGhFile === fname ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {fname}
              </button>
            ))}
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
            {GITHUB_FILES_BLUEPRINT[selectedGhFile]}
          </pre>
        </div>
      )}
    </div>
  );
}
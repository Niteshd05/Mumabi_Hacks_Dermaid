import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function parseIngredientsCell(cell: string): string[] {
  const trimmed = (cell || '').trim();
  const noQuotes = trimmed.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
  const inside = noQuotes.replace(/^\[/, '').replace(/\]$/, '');
  const parts = inside.split(',').map(s => s.trim()).filter(Boolean);
  return parts.map(p => p.toLowerCase());
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'product_info.csv');
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ products: [] });
    }
    // Robust CSV split with quotes
    const splitCSV = (row: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
          cur += ch;
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out;
    };
    const header = splitCSV(lines[0]);
    const idx = {
      product_id: header.indexOf('product_id'),
      product_name: header.indexOf('product_name'),
      brand_name: header.indexOf('brand_name'),
      ingredients: header.indexOf('ingredients'),
      price_usd: header.indexOf('price_usd'),
      primary_category: header.indexOf('primary_category'),
      secondary_category: header.indexOf('secondary_category'),
    };
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const row = splitCSV(lines[i]);
      products.push({
        product_id: row[idx.product_id] ?? '',
        product_name: row[idx.product_name] ?? '',
        ingredients: parseIngredientsCell(row[idx.ingredients] ?? ''),
        price_usd: Number(row[idx.price_usd] ?? '') || undefined,
        brand_name: row[idx.brand_name] ?? undefined,
        primary_category: row[idx.primary_category] ?? undefined,
        secondary_category: row[idx.secondary_category] ?? undefined,
      });
    }
    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}



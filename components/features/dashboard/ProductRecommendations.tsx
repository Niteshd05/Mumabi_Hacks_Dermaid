'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Product {
  product_id: string;
  product_name: string;
  link?: string;
}

interface ProductRecommendationsProps {
  products: Product[];
}

export function ProductRecommendations({ products }: ProductRecommendationsProps) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const top = useMemo(() => (Array.isArray(products) ? products.slice(0, 5) : []), [products]);
  const queries = useMemo(() => top.map((p) => p.product_name), [top]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (queries.length === 0) return;
      setLoading(true);
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries, market: 'in' }),
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const map: Record<string, string> = {};
        Object.entries<any>(data?.results || {}).forEach(([q, r]) => {
          if (r?.link) map[q] = r.link;
        });
        if (mounted) setLinks(map);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [queries.join('|')]);

  if (!top.length) return null;

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Recommended Products</h3>
        </div>
        <div className="space-y-2">
          {top.map((p, i) => {
            const link = links[p.product_name];
            return (
              <motion.div
                key={p.product_id || p.product_name || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between gap-3"
              >
                <div className="text-sm truncate">{p.product_name}</div>
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer">
                    <Button size="sm" className="text-xs">View</Button>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs" disabled={loading}>
                    {loading ? 'Fetching...' : 'Link coming soon'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Phone, Clock, Star, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileContainer, TopBar, BottomNav } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Dermatologist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  distance: string;
  address: string;
  phone: string;
  hours: string;
  available: boolean;
}

// Mock data - in production, fetch from Google Maps/Places API
const MOCK_DERMATOLOGISTS: Dermatologist[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Dermatology & Cosmetic Surgery',
    rating: 4.8,
    reviews: 234,
    distance: '0.8 km',
    address: '123 Medical Plaza, Downtown',
    phone: '+1 (555) 123-4567',
    hours: 'Open until 6 PM',
    available: true,
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialty: 'Clinical Dermatology',
    rating: 4.9,
    reviews: 456,
    distance: '1.2 km',
    address: '456 Health Center, Midtown',
    phone: '+1 (555) 234-5678',
    hours: 'Open until 7 PM',
    available: true,
  },
  {
    id: '3',
    name: 'Dr. Priya Patel',
    specialty: 'Pediatric & Adult Dermatology',
    rating: 4.7,
    reviews: 189,
    distance: '2.1 km',
    address: '789 Clinic Street, Uptown',
    phone: '+1 (555) 345-6789',
    hours: 'Closed • Opens 9 AM',
    available: false,
  },
];

export default function FindDermatologistPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dermatologists] = useState<Dermatologist[]>(MOCK_DERMATOLOGISTS);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleDirections = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  return (
    <>
      <TopBar />
      <MobileContainer className="pb-24 pt-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold mb-2">Find a Dermatologist</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {location ? 'Showing nearby specialists' : 'Enable location for nearby results'}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {dermatologists.map((derm, index) => (
              <motion.div
                key={derm.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{derm.name}</h3>
                        <p className="text-xs text-muted-foreground">{derm.specialty}</p>
                      </div>
                      <div className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        derm.available 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      )}>
                        {derm.distance}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{derm.rating}</span>
                        <span className="text-muted-foreground">({derm.reviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">{derm.hours}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      {derm.address}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCall(derm.phone)}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      <Button
                        onClick={() => handleDirections(derm.address)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Powered by notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center py-4"
            >
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <ExternalLink className="w-3 h-3" />
                Results powered by Google Maps
              </p>
            </motion.div>
          </div>
        )}
      </MobileContainer>
      <BottomNav />
    </>
  );
}


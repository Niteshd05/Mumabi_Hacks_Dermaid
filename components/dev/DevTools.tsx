'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, 
  Sun, 
  Droplets, 
  Wind,
  Calendar,
  User,
  Sparkles,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useWeather, useSimulation, useUser, useAgent } from '@/lib/contexts';
import { cn } from '@/lib/utils';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const { weather, toggleHighUV, toggleHighHumidity, toggleDryWeather, resetWeather } = useWeather();
  const { simulation, simulateWeek, resetSimulation } = useSimulation();
  const { loadMockUser } = useUser();
  const { activeAgent, toggleAgent } = useAgent();

  return (
    <>
      {/* Floating Dev Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            className={cn(
              'fixed bottom-20 right-4 z-50',
              'w-10 h-10 rounded-full',
              'bg-gradient-to-br from-orange-400 to-amber-500',
              'flex items-center justify-center',
              'shadow-lg shadow-orange-500/25',
              'hover:shadow-xl hover:shadow-orange-500/30',
              'transition-shadow'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Settings2 className="w-5 h-5 text-white" />
          </motion.button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-orange-500" />
              Dev Controls
            </SheetTitle>
            <SheetDescription>
              Hackathon demo controls for simulating conditions
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 overflow-y-auto pb-8">
            {/* Agent Toggle */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Active Agent
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={activeAgent === 'cosmetic' ? 'default' : 'outline'}
                  onClick={() => activeAgent !== 'cosmetic' && toggleAgent()}
                  className={cn(
                    'flex-1',
                    activeAgent === 'cosmetic' && 'bg-orange-500 hover:bg-orange-600'
                  )}
                >
                  Cosmetic
                </Button>
                <Button
                  variant={activeAgent === 'medical' ? 'default' : 'outline'}
                  onClick={() => activeAgent !== 'medical' && toggleAgent()}
                  className={cn(
                    'flex-1',
                    activeAgent === 'medical' && 'bg-teal-400 hover:bg-teal-500'
                  )}
                >
                  Medical
                </Button>
              </div>
            </section>

            {/* Environmental Toggles */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Environment Simulation
              </h3>
              <div className="space-y-2">
                <ToggleRow
                  icon={<Sun className="w-4 h-4" />}
                  label="High UV"
                  description={`UV Index: ${weather.uvIndex}`}
                  isActive={weather.isHighUV}
                  onToggle={toggleHighUV}
                  activeColor="bg-amber-500"
                />
                <ToggleRow
                  icon={<Droplets className="w-4 h-4" />}
                  label="High Humidity"
                  description={`Humidity: ${weather.humidity}%`}
                  isActive={weather.isHighHumidity}
                  onToggle={toggleHighHumidity}
                  activeColor="bg-blue-500"
                />
                <ToggleRow
                  icon={<Wind className="w-4 h-4" />}
                  label="Dry Weather"
                  description={`Low humidity conditions`}
                  isActive={weather.isDryWeather}
                  onToggle={toggleDryWeather}
                  activeColor="bg-orange-500"
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetWeather}
                className="mt-2 text-muted-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Weather
              </Button>
            </section>

            {/* Time Travel */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Time Travel (Week Simulation)
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Current: Week {simulation.currentWeek}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 4, 8, 12].map((week) => (
                  <Button
                    key={week}
                    variant={simulation.currentWeek === week ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => simulateWeek(week as 1 | 4 | 8 | 12)}
                    className={cn(
                      simulation.currentWeek === week && 'bg-violet-500 hover:bg-violet-600'
                    )}
                  >
                    Week {week}
                  </Button>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetSimulation}
                className="mt-2 text-muted-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Timeline
              </Button>
            </section>

            {/* Mock User Presets */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Load Mock User
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => loadMockUser('acne-dark')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-700" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Sarah (Acne + Dark Skin)</p>
                      <p className="text-xs text-muted-foreground">Fitzpatrick V, Oily, PIH concerns</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => loadMockUser('eczema')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-200" />
                    <div className="text-left">
                      <p className="text-sm font-medium">James (Eczema)</p>
                      <p className="text-xs text-muted-foreground">Fitzpatrick III, Sensitive skin</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => loadMockUser('default')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Default User</p>
                      <p className="text-xs text-muted-foreground">Fitzpatrick IV, Combination</p>
                    </div>
                  </div>
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => loadMockUser('default')}
                className="mt-2 text-muted-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset User
              </Button>
            </section>

            {/* Current State Display */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Current State</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Agent: {activeAgent}</Badge>
                <Badge variant="outline">Week: {simulation.currentWeek}</Badge>
                <Badge variant={weather.isHighUV ? 'destructive' : 'outline'}>
                  UV: {weather.uvIndex}
                </Badge>
                <Badge variant={weather.isHighHumidity || weather.isDryWeather ? 'secondary' : 'outline'}>
                  Humidity: {weather.humidity}%
                </Badge>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Helper component for toggle rows
interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  isActive: boolean;
  onToggle: () => void;
  activeColor: string;
}

function ToggleRow({ icon, label, description, isActive, onToggle, activeColor }: ToggleRowProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-xl',
        'border transition-all',
        isActive 
          ? 'border-transparent bg-gradient-to-r from-background to-muted' 
          : 'border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isActive ? activeColor : 'bg-muted'
        )}>
          <span className={isActive ? 'text-white' : 'text-muted-foreground'}>
            {icon}
          </span>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={cn(
        'w-10 h-6 rounded-full p-1 transition-colors',
        isActive ? activeColor : 'bg-muted'
      )}>
        <motion.div
          className="w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: isActive ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}


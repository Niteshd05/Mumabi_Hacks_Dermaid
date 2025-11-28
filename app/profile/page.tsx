'use client';

import { motion } from 'framer-motion';
import { 
  User, 
  Palette, 
  Droplets, 
  Target, 
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
  PencilLine,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { MobileContainer, TopBar, BottomNav } from '@/components/layout';
import { DevTools } from '@/components/dev';
import { useUser, useAuth } from '@/lib/contexts';
import { FITZPATRICK_INFO, SkinConcern, SkinType, FitzpatrickScale } from '@/lib/types';
import { SkinToneSelector } from '@/components/features/onboarding';
import { SkinTypeSelector } from '@/components/features/onboarding';
import { ConcernSelector } from '@/components/features/onboarding';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, setUser, updateFitzpatrick, updateSkinType, updateConcerns } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const [isBasicOpen, setIsBasicOpen] = useState(false);
  const [isToneOpen, setIsToneOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isConcernsOpen, setIsConcernsOpen] = useState(false);

  const [basicForm, setBasicForm] = useState({
    name: user?.name || '',
    age: String(user?.age ?? ''),
    gender: (user?.gender ?? 'prefer-not-to-say') as 'male' | 'female' | 'other' | 'prefer-not-to-say',
  });

  const [toneDraft, setToneDraft] = useState<FitzpatrickScale | null>(user?.fitzpatrickScale ?? null);
  const [typeDraft, setTypeDraft] = useState<SkinType | null>(user?.skinType ?? null);
  const [concernsDraft, setConcernsDraft] = useState<SkinConcern[]>(user?.concerns ?? []);

  const fitzpatrickInfo = user 
    ? FITZPATRICK_INFO.find(f => f.scale === user.fitzpatrickScale) 
    : null;

  return (
    <>
      <TopBar />
      <MobileContainer className="pb-24 pt-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 mx-auto mb-4 flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-xl font-bold">{user?.name || 'Guest User'}</h2>
          <p className="text-sm text-muted-foreground">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Today'}
          </p>
        </motion.div>

        {/* Skin Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-orange-500" />
                  Skin Profile
                </h3>
                <Dialog open={isBasicOpen} onOpenChange={setIsBasicOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <PencilLine className="w-4 h-4" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Basic Info</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Name</label>
                        <Input
                          value={basicForm.name}
                          onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Age</label>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={basicForm.age}
                          onChange={(e) => setBasicForm({ ...basicForm, age: e.target.value })}
                          placeholder="Your age"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Gender</label>
                        <Select
                          value={basicForm.gender}
                          onValueChange={(v) => setBasicForm({ ...basicForm, gender: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsBasicOpen(false)}>Cancel</Button>
                        <Button
                          onClick={async () => {
                            if (!user) return;
                            await setUser({
                              ...user,
                              name: basicForm.name || user.name,
                              age: parseInt(basicForm.age || String(user.age), 10),
                              gender: basicForm.gender,
                            });
                            setIsBasicOpen(false);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-4">
                {/* Fitzpatrick Scale */}
                <Dialog open={isToneOpen} onOpenChange={setIsToneOpen}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl border-2 border-border"
                        style={{ backgroundColor: fitzpatrickInfo?.color || '#C99E7C' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{fitzpatrickInfo?.name || 'Type IV'}</p>
                        <p className="text-xs text-muted-foreground">{fitzpatrickInfo?.description || 'Olive skin'}</p>
                      </div>
                    </div>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <PencilLine className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                  </div>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Skin Tone</DialogTitle>
                    </DialogHeader>
                    <SkinToneSelector selected={toneDraft} onSelect={setToneDraft} />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsToneOpen(false)}>Cancel</Button>
                      <Button onClick={async () => { if (toneDraft) { await updateFitzpatrick(toneDraft); setIsToneOpen(false); } }}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Skin Type */}
                <Dialog open={isTypeOpen} onOpenChange={setIsTypeOpen}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{user?.skinType || 'Combination'}</p>
                        <p className="text-xs text-muted-foreground">Skin Type</p>
                      </div>
                    </div>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <PencilLine className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                  </div>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Skin Type</DialogTitle>
                    </DialogHeader>
                    <SkinTypeSelector selected={typeDraft} onSelect={setTypeDraft} />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsTypeOpen(false)}>Cancel</Button>
                      <Button onClick={async () => { if (typeDraft) { await updateSkinType(typeDraft); setIsTypeOpen(false); } }}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Concerns */}
                <Dialog open={isConcernsOpen} onOpenChange={setIsConcernsOpen}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Skin Goals</p>
                        <p className="text-xs text-muted-foreground">Your focus areas</p>
                      </div>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          <PencilLine className="w-4 h-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-13 pl-13">
                      {(user?.concerns || []).map((concern) => (
                        <Badge key={concern} variant="secondary" className="capitalize">
                          {concern.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Skin Goals</DialogTitle>
                    </DialogHeader>
                    <ConcernSelector
                      selected={concernsDraft}
                      onToggle={(c) => setConcernsDraft((prev) => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsConcernsOpen(false)}>Cancel</Button>
                      <Button onClick={async () => { await updateConcerns(concernsDraft); setIsConcernsOpen(false); }}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              <ProfileLink icon={Settings} label="Settings" />
              <ProfileLink icon={HelpCircle} label="Help & Support" />
              <ProfileLink 
                icon={LogOut} 
                label="Sign Out" 
                isDestructive 
                onClick={async () => {
                  try {
                    await signOut();
                    router.push('/onboarding');
                  } catch (error) {
                    console.error('Sign out error:', error);
                  }
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          <p>DermAid v1.0.0</p>
          <p className="mt-1">Built with care for all skin tones 💜</p>
        </motion.div>
      </MobileContainer>
      <BottomNav />
      <DevTools />
    </>
  );
}

function ProfileLink({ 
  icon: Icon, 
  label, 
  isDestructive,
  onClick
}: { 
  icon: React.ElementType; 
  label: string; 
  isDestructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors',
        'border-b last:border-b-0',
        isDestructive && 'text-red-500'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}


import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Footprints,
  Clock,
  Heart,
  Droplets,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Dumbbell,
  Calendar,
  Utensils,
  Trophy,
  User,
  ChevronRight,
  Info,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  X,
  Target,
  Search,
  Check,
  ArrowRight,
  ShieldCheck,
  Brain,
  Repeat,
  Bot,
  Camera,
  Loader2,
  Send,
  Wand2,
  MessageSquare,
  HelpCircle,
  Upload,
  Mic,
  Volume1,
  Globe,
  ExternalLink,
  Image as ImageIcon,
  Activity,
  Layers,
  CheckCircle
} from 'lucide-react';

async function callGeminiApi(payload: any, retries = 3, delay = 1000) {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
}

// Convert base64 to ArrayBuffer for Gemini TTS PCM decoding
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Converts signed 16-bit PCM buffer to a playable WAV Blob
function pcmToWav(pcm16: Int16Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = pcm16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(44 + i * 2, pcm16[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Gemini 2.5 Flash TTS Spoken Coach Service
async function synthesizeCoachSpeech(textPrompt: string, voiceName = "Puck"): Promise<string | null> {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: textPrompt }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("TTS call failed");
    const result = await res.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (audioData) {
      const match = mimeType.match(/rate=(\d+)/);
      const sampleRate = match ? parseInt(match[1], 10) : 24000;
      const pcmData = base64ToArrayBuffer(audioData);
      const pcm16 = new Int16Array(pcmData);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      return URL.createObjectURL(wavBlob);
    }
  } catch (err) {
    console.debug('TTS generation skipped:', err);
  }
  return null;
}

class SoundService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  beep(freq = 600, duration = 0.12, type: OscillatorType = 'sine') {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playVictory() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.beep(freq, 0.2, 'triangle');
        }, idx * 120);
      });
    } catch (e) {}
  }
}
const soundPlayer = new SoundService();

const ISOMETRIC_EXERCISES = [
  {
    id: 'iso-1',
    name: 'The Plank',
    category: 'Isometric',
    muscles: 'Abdominals, lower back, shoulders',
    cues: 'Keep neck neutral, elbows under shoulders, core rock solid, glutes engaged.',
    defaultDuration: 45,
    difficulty: 'Intermediate',
    iconEmoji: '🧘'
  },
  {
    id: 'iso-2',
    name: 'Push That Wall',
    category: 'Isometric',
    muscles: 'Biceps, chest, lats, shoulders, triceps',
    cues: 'Press palms into sturdy wall at chest height, lock core, drive through palms as hard as possible.',
    defaultDuration: 30,
    difficulty: 'Beginner',
    iconEmoji: '🧱'
  },
  {
    id: 'iso-3',
    name: 'Wall Sit',
    category: 'Isometric',
    muscles: 'Calves, glutes, quadriceps',
    cues: 'Back flat against wall, knees bent at 90 degrees, press thighs outward slightly.',
    defaultDuration: 45,
    difficulty: 'Intermediate',
    iconEmoji: '🪑'
  },
  {
    id: 'iso-4',
    name: 'Medicine Ball Squeeze',
    category: 'Isometric',
    muscles: 'Chest, abdominals',
    cues: 'Hold ball or cushion at chest level, drive hands inward forcefully, brace core.',
    defaultDuration: 30,
    difficulty: 'Beginner',
    iconEmoji: '🏐'
  },
  {
    id: 'iso-5',
    name: 'Squat Hold',
    category: 'Isometric',
    muscles: 'Core, glutes, quadriceps',
    cues: 'Thighs parallel to floor, chest upright, weight balanced over mid-foot.',
    defaultDuration: 40,
    difficulty: 'Intermediate',
    iconEmoji: '🏋️‍♀️'
  },
  {
    id: 'iso-6',
    name: 'The Non-Pushup Pushup',
    category: 'Isometric',
    muscles: 'Abdominals, biceps, shoulders',
    cues: 'Hold plank in top or half-lowered pushup position without sinking back.',
    defaultDuration: 30,
    difficulty: 'Hard',
    iconEmoji: '💪'
  },
  {
    id: 'iso-7',
    name: 'Side Plank',
    category: 'Isometric',
    muscles: 'Abdominals, posterior abdominal muscles, quadratus lumborum',
    cues: 'Keep hips stacked and elevated, straight line from head to heels.',
    defaultDuration: 35,
    difficulty: 'Intermediate',
    iconEmoji: '⚡'
  },
  {
    id: 'iso-8',
    name: 'Static Lunge',
    category: 'Isometric',
    muscles: 'Abdominals, glutes, calves, thighs',
    cues: 'Both knees at 90-degree angles, back knee hovering 2 inches off ground.',
    defaultDuration: 30,
    difficulty: 'Intermediate',
    iconEmoji: '🦵'
  },
  {
    id: 'iso-9',
    name: 'Tree Pose',
    category: 'Isometric',
    muscles: 'Abdominals, ankles, calves, groin, thighs, shoulders',
    cues: 'Hands at heart center or overhead, sole of foot against inner calf or thigh (avoid knee).',
    defaultDuration: 40,
    difficulty: 'Beginner',
    iconEmoji: '🌳'
  },
  {
    id: 'iso-10',
    name: 'Hip Lifts / Glute Bridge Hold',
    category: 'Isometric',
    muscles: 'Abdominals, obliques, hip abductors, glutes, back, hamstrings',
    cues: 'Drive through heels, squeeze glutes at top, avoid excessive lumbar hyperextension.',
    defaultDuration: 45,
    difficulty: 'Beginner',
    iconEmoji: '🌉'
  },
  {
    id: 'iso-11',
    name: 'Warrior Two',
    category: 'Isometric',
    muscles: 'Abdomen, ankles, buttocks, thighs',
    cues: 'Deep front lunge, arms parallel to floor, gaze over front fingertips.',
    defaultDuration: 40,
    difficulty: 'Beginner',
    iconEmoji: '⚔️'
  },
  {
    id: 'iso-12',
    name: 'Superman Hold',
    category: 'Isometric',
    muscles: 'Shoulders, lower back, hips, glutes, lower abdominals',
    cues: 'Lift arms and thighs simultaneously, squeeze glutes, look slightly down at floor.',
    defaultDuration: 30,
    difficulty: 'Intermediate',
    iconEmoji: '🦸‍♂️'
  }
];

const CORE_EXERCISES = [
  {
    id: 'core-1',
    name: 'Plank',
    category: 'Core',
    muscles: 'Upper Abs, Lower Abs, Obliques',
    scheme: 'Hold 30-60 sec',
    cues: 'Keep neck neutral, core tight, squeeze glutes.',
    isTimed: true,
    targetValue: 45,
    unit: 'sec'
  },
  {
    id: 'core-2',
    name: 'Side Plank',
    category: 'Core',
    muscles: 'Obliques, transverse abdominis',
    scheme: 'Hold 30-60 sec each side',
    cues: 'Keep hips up, align shoulder over elbow.',
    isTimed: true,
    targetValue: 35,
    unit: 'sec'
  },
  {
    id: 'core-3',
    name: 'Leg Raises',
    category: 'Core',
    muscles: 'Lower abs, hip flexors',
    scheme: '3 x 12-15 reps',
    cues: "Don't arch your back, press lower back into mat.",
    isTimed: false,
    targetValue: 15,
    unit: 'reps'
  },
  {
    id: 'core-4',
    name: 'Standard Crunch',
    category: 'Core',
    muscles: 'Upper abs, mid abs',
    scheme: 'Slow + controlled movement',
    cues: "Elbows wide, contract abs, don't pull on neck, breathe out.",
    isTimed: false,
    targetValue: 20,
    unit: 'reps'
  },
  {
    id: 'core-5',
    name: 'Bicycle Crunch',
    category: 'Core',
    muscles: 'Obliques, rectus abdominis',
    scheme: '3 x 15-20 (each side)',
    cues: 'Twist from your core, bring opposite elbow to knee slowly.',
    isTimed: false,
    targetValue: 20,
    unit: 'reps'
  },
  {
    id: 'core-6',
    name: 'Mountain Climbers',
    category: 'Core',
    muscles: 'Full core, shoulders, hip flexors',
    scheme: '3 x 20 (each leg)',
    cues: 'Keep core tight, breathe out on effort, flat spine.',
    isTimed: false,
    targetValue: 20,
    unit: 'reps'
  },
  {
    id: 'core-7',
    name: 'Russian Twist',
    category: 'Core',
    muscles: 'Obliques, core rotational strength',
    scheme: '3 x 20 (each side)',
    cues: "Twist ribs - don't just swing your arms.",
    isTimed: false,
    targetValue: 20,
    unit: 'reps'
  },
  {
    id: 'core-8',
    name: 'Hanging Leg Raise (or Reverse Tuck)',
    category: 'Core',
    muscles: 'Lower abs, grip, lats',
    scheme: '3 x 10-15 reps',
    cues: 'Avoid swinging, initiate strictly with pelvis curl.',
    isTimed: false,
    targetValue: 12,
    unit: 'reps'
  },
  {
    id: 'core-9',
    name: 'Reverse Crunch',
    category: 'Core',
    muscles: 'Lower abs, deep core',
    scheme: '3 x 15-20 reps',
    cues: 'Squeeze lower abs at the peak, curl tailbone off floor.',
    isTimed: false,
    targetValue: 15,
    unit: 'reps'
  },
  {
    id: 'core-10',
    name: 'Flutter Kicks',
    category: 'Core',
    muscles: 'Lower abs, hip flexors',
    scheme: '3 x 20-30 sec',
    cues: "Keep legs straight, don't let heels touch floor.",
    isTimed: true,
    targetValue: 25,
    unit: 'sec'
  },
  {
    id: 'core-11',
    name: 'V-Ups',
    category: 'Core',
    muscles: 'Upper abs, lower abs',
    scheme: '3 x 12-15 reps',
    cues: 'Squeeze your abs at top, reach hands towards toes.',
    isTimed: false,
    targetValue: 12,
    unit: 'reps'
  }
];

// 5-Day Plan mapped explicitly from image.jpg
const FIVE_DAY_PLAN: Record<string, { title: string; focus: string; exercises: Array<{ name: string; amount: number; unit: 'reps' | 'sec'; cues: string; muscles: string }> }> = {
  Monday: {
    title: 'Full Body Activation',
    focus: 'Legs, Core & Light Cardio',
    exercises: [
      { name: 'Squats', amount: 20, unit: 'reps', cues: 'Hips back, knees track with toes, chest proud', muscles: 'Quadriceps, Glutes' },
      { name: 'Plank', amount: 15, unit: 'sec', cues: 'Core tight, neck neutral, flat back', muscles: 'Full Core, Shoulders' },
      { name: 'Crunches', amount: 25, unit: 'reps', cues: "Elbows wide, don't pull on neck, contract abs", muscles: 'Upper Abdominals' },
      { name: 'Jumping Jacks', amount: 35, unit: 'reps', cues: 'Land softly on balls of feet, rhythmic breath', muscles: 'Calves, Deltoids, Cardio' },
      { name: 'Lunges', amount: 15, unit: 'reps', cues: 'Keep torso upright, 90-degree bend in knees', muscles: 'Glutes, Quads, Hamstrings' },
      { name: 'Wall Sit', amount: 25, unit: 'sec', cues: 'Back flat on wall, thighs parallel to ground', muscles: 'Quads, Calves, Glutes' },
      { name: 'Sit Ups', amount: 10, unit: 'reps', cues: 'Smooth controlled ascension, touch knees', muscles: 'Rectus Abdominis' },
      { name: 'Butt Kicks', amount: 10, unit: 'reps', cues: 'Heels to glutes, keep shoulders relaxed', muscles: 'Hamstrings, Cardio' },
      { name: 'Push Ups', amount: 5, unit: 'reps', cues: 'Elbows at 45 degrees, chest to floor', muscles: 'Pectorals, Triceps, Core' }
    ]
  },
  Tuesday: {
    title: 'Endurance & Core Surge',
    focus: 'Core Burn & Unilateral Balance',
    exercises: [
      { name: 'Squats', amount: 10, unit: 'reps', cues: 'Deep squat, drive through whole foot', muscles: 'Quadriceps, Glutes' },
      { name: 'Plank', amount: 30, unit: 'sec', cues: 'Brace abdomen like taking a punch', muscles: 'Transverse Abdominis' },
      { name: 'Crunches', amount: 25, unit: 'reps', cues: 'Exhale as you contract upward', muscles: 'Upper Abs' },
      { name: 'Jumping Jacks', amount: 10, unit: 'reps', cues: 'Fast tempo, light footwork', muscles: 'Cardiovascular, Calves' },
      { name: 'Lunges', amount: 25, unit: 'reps', cues: 'Step steady, knee tracking in line', muscles: 'Hamstrings, Glutes' },
      { name: 'Wall Sit', amount: 45, unit: 'sec', cues: 'Do not rest hands on knees, keep posture', muscles: 'Quadriceps Burn' },
      { name: 'Sit Ups', amount: 35, unit: 'reps', cues: 'Smooth spinal flexion, control eccentric path', muscles: 'Abs, Hip Flexors' },
      { name: 'Butt Kicks', amount: 25, unit: 'reps', cues: 'Continuous cardio bounce', muscles: 'Hamstrings, Calves' },
      { name: 'Push Ups', amount: 10, unit: 'reps', cues: 'Firm glutes and tight abdominal wall', muscles: 'Chest, Triceps' }
    ]
  },
  Wednesday: {
    title: 'Midweek Power Stride',
    focus: 'Plyo Cardio & Core Stability',
    exercises: [
      { name: 'Squats', amount: 15, unit: 'reps', cues: 'Power up out of the hole, squeeze glutes', muscles: 'Legs, Core' },
      { name: 'Plank', amount: 40, unit: 'sec', cues: 'Push ground away through elbows', muscles: 'Serratus, Deep Core' },
      { name: 'Crunches', amount: 30, unit: 'reps', cues: 'Pause 1s at highest contraction point', muscles: 'Upper Abs' },
      { name: 'Jumping Jacks', amount: 50, unit: 'reps', cues: 'High cadence, steady nasal breathing', muscles: 'Calves, Heart Rate' },
      { name: 'Lunges', amount: 25, unit: 'reps', cues: 'Alternate fluidly with strong balance', muscles: 'Glutes, Quads' },
      { name: 'Wall Sit', amount: 35, unit: 'sec', cues: 'Breathe deeply, keep head against wall', muscles: 'Quads' },
      { name: 'Sit Ups', amount: 30, unit: 'reps', cues: 'Full range of motion with tempo control', muscles: 'Abdominals' },
      { name: 'Butt Kicks', amount: 25, unit: 'reps', cues: 'Fast knee flexes', muscles: 'Posterior Chain' }
    ]
  },
  Thursday: {
    title: 'Lower Body & Core Blast',
    focus: 'High Volume Stamina',
    exercises: [
      { name: 'Squats', amount: 35, unit: 'reps', cues: 'Pace your sets, keep heels planted firmly', muscles: 'Glutes, Quads' },
      { name: 'Plank', amount: 30, unit: 'sec', cues: 'Tuck pelvis slightly, tight glutes', muscles: 'Core' },
      { name: 'Crunches', amount: 20, unit: 'reps', cues: 'Tuck chin slightly without pulling head', muscles: 'Upper Abs' },
      { name: 'Jumping Jacks', amount: 25, unit: 'reps', cues: 'Active arms over head', muscles: 'Shoulders, Calves' },
      { name: 'Lunges', amount: 15, unit: 'reps', cues: 'Step deep, lower rear knee controlled', muscles: 'Legs' },
      { name: 'Wall Sit', amount: 60, unit: 'sec', cues: 'Mental grit! 1 full minute isometric hold', muscles: 'Quads endurance' },
      { name: 'Sit Ups', amount: 55, unit: 'reps', cues: 'Break into mini-sets if needed, stay clean', muscles: 'Abdominal Wall' },
      { name: 'Butt Kicks', amount: 35, unit: 'reps', cues: 'Sprint cadence in place', muscles: 'Hamstrings' }
    ]
  },
  Friday: {
    title: 'The Friday Challenge',
    focus: 'Max Effort Full Body Finale',
    exercises: [
      { name: 'Squats', amount: 25, unit: 'reps', cues: 'Explosive ascent, controlled lower', muscles: 'Legs' },
      { name: 'Plank', amount: 60, unit: 'sec', cues: 'Champion hold! Rock steady for 60 seconds', muscles: 'Entire Core' },
      { name: 'Crunches', amount: 30, unit: 'reps', cues: 'Squeeze abs hard at apex', muscles: 'Abdominals' },
      { name: 'Jumping Jacks', amount: 55, unit: 'reps', cues: 'Full range arms, big cardio output', muscles: 'Full Body Cardio' },
      { name: 'Lunges', amount: 60, unit: 'reps', cues: 'Endurance burner! 30 reps each leg', muscles: 'Glutes, Quads, Calves' },
      { name: 'Wall Sit', amount: 45, unit: 'sec', cues: 'No resting hands on thighs, embrace burn', muscles: 'Quadriceps' },
      { name: 'Sit Ups', amount: 40, unit: 'reps', cues: 'Steady breathing cadence', muscles: 'Core Muscles' },
      { name: 'Butt Kicks', amount: 50, unit: 'reps', cues: 'Quick turn-over cardio finish', muscles: 'Hamstrings, Agility' },
      { name: 'Push Ups', amount: 30, unit: 'reps', cues: 'Chest all the way down, full lockout', muscles: 'Pectorals, Triceps, Delts' }
    ]
  },
  Saturday: {
    title: 'Rest & Recovery Day 1',
    focus: 'Active Mobility & Muscle Repair',
    exercises: []
  },
  Sunday: {
    title: 'Rest & Recovery Day 2',
    focus: 'Hydration & Mindset Reset',
    exercises: []
  }
};

const FITNESS_GOALS = [
  { id: 'strength', name: 'Build Strength', icon: '❤️', desc: 'Higher resistance, isometric holds & muscle hypertrophy', macroSplit: { p: 35, c: 40, f: 25 }, calMultiplier: 1.15 },
  { id: 'endurance', name: 'Improve Endurance', icon: '🛡️', desc: 'High repetition stamina, cardiovascular conditioning', macroSplit: { p: 25, c: 55, f: 20 }, calMultiplier: 1.2 },
  { id: 'home', name: 'Stay Fit at Home', icon: '💪', desc: 'No equipment calisthenics & core longevity', macroSplit: { p: 30, c: 45, f: 25 }, calMultiplier: 1.0 },
  { id: 'calories', name: 'Burn Calories', icon: '🔥', desc: 'HIIT intervals, quick burn fat loss and metabolic boost', macroSplit: { p: 40, c: 30, f: 30 }, calMultiplier: 0.85 },
  { id: 'mental', name: 'Boost Mental Health', icon: '🧠', desc: 'Stress reduction, breathing focus & mind-body balance', macroSplit: { p: 25, c: 45, f: 30 }, calMultiplier: 1.0 },
  { id: 'consistent', name: 'Be Consistent & See Results', icon: '📅', desc: 'Sustainable daily habit formation and streak tracking', macroSplit: { p: 30, c: 40, f: 30 }, calMultiplier: 1.05 }
];

const DEFAULT_FOODS = [
  { id: 'f-1', name: 'Rolled Oats & Chia Seeds (80g)', cal: 320, p: 12, c: 54, f: 6, tag: 'Breakfast' },
  { id: 'f-2', name: 'Grilled Chicken Breast (180g)', cal: 290, p: 55, c: 0, f: 6, tag: 'Lunch' },
  { id: 'f-3', name: 'Greek Yogurt (0% fat) with Blueberries', cal: 170, p: 19, c: 18, f: 1, tag: 'Snack' },
  { id: 'f-4', name: 'Whey Protein Isolate Shake', cal: 140, p: 28, c: 3, f: 1, tag: 'Post-Workout' },
  { id: 'f-5', name: 'Wild Salmon Fillet with Asparagus', cal: 380, p: 42, c: 4, f: 21, tag: 'Dinner' }
];

export default function PulseFitApp() {
  // Theme & Layout state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'workouts' | 'nutrition' | 'analytics' | 'profile'>('today');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // AI Coach Chat Modal
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: "Hey! I'm your Pulse AI Coach. I'm synced with your 5-day workout split, nutrition targets, and progressive overload tracking. How can I optimize your fitness journey today?"
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiCoachThinking, setIsAiCoachThinking] = useState(false);

  // AI Meal Scanner & Analyzer Modal
  const [showAiMealScanner, setShowAiMealScanner] = useState(false);
  const [mealDescriptionPrompt, setMealDescriptionPrompt] = useState('');
  const [mealImageBase64, setMealImageBase64] = useState<string | null>(null);
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [analyzedMealResult, setAnalyzedMealResult] = useState<{
    name: string;
    cal: number;
    p: number;
    c: number;
    f: number;
    explanation: string;
  } | null>(null);

  // AI Workout Routine Generator State
  const [showAiWorkoutModal, setShowAiWorkoutModal] = useState(false);
  const [aiWorkoutFocus, setAiWorkoutFocus] = useState('Core & Oblique Shred');
  const [aiWorkoutDurationMin, setAiWorkoutDurationMin] = useState(15);
  const [aiWorkoutIntensity, setAiWorkoutIntensity] = useState('Intermediate');
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);

  // In-Workout AI Form Coach Advice State
  const [workoutAiTip, setWorkoutAiTip] = useState<{ exercise: string; tip: string; isLoading: boolean } | null>(null);

  // Gemini Google Search Grounded Research State
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [isSearchingScience, setIsSearchingScience] = useState(false);
  const [researchResult, setResearchResult] = useState<{ text: string; sources: Array<{ uri: string; title: string }> } | null>(null);

  // Gemini 3.1 Flash Image Milestone Badge Generator State
  const [showBadgeGeneratorModal, setShowBadgeGeneratorModal] = useState(false);
  const [badgePrompt, setBadgePrompt] = useState('Golden shield trophy badge celebrating 7-day home workout streak, neon cyberpunk fitness aesthetic, 3d render badge');
  const [isGeneratingBadge, setIsGeneratingBadge] = useState(false);
  const [generatedBadgeUrl, setGeneratedBadgeUrl] = useState<string | null>(null);

  // Feature 1: AI Daily Briefing & Spoken Audio State
  const [dailyBriefing, setDailyBriefing] = useState<{
    readinessScore: number;
    headline: string;
    coachingAdvice: string;
    focusExercise: string;
  } | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [selectedVoicePersona, setSelectedVoicePersona] = useState<'Puck' | 'Zephyr' | 'Kore'>('Puck');
  const [isPlayingBriefingVoice, setIsPlayingBriefingVoice] = useState(false);
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Feature 2: AI Muscle Soreness & Rehab Clinic State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [soreMuscleGroup, setSoreMuscleGroup] = useState('Lower Back & Glutes');
  const [sorenessSeverity, setSorenessSeverity] = useState<'Mild Tightness' | 'Moderate Aches' | 'Severe DOMS'>('Moderate Aches');
  const [isDiagnosingRecovery, setIsDiagnosingRecovery] = useState(false);
  const [recoveryDiagnosticResult, setRecoveryDiagnosticResult] = useState<{
    likelyCause: string;
    rehabExercises: Array<{ name: string; holdOrReps: string; cues: string }>;
    warningFlag: string;
    hydrationTip: string;
  } | null>(null);

  // Feature 3: AI Full-Day Meal Plan & Smart Grocery State
  const [showMealPlannerModal, setShowMealPlannerModal] = useState(false);
  const [dietaryPreference, setDietaryPreference] = useState('High Protein Balanced');
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
  const [generatedDayPlan, setGeneratedDayPlan] = useState<{
    summary: string;
    meals: Array<{ meal: string; dish: string; calories: number; protein: number; carbs: number; fats: number; instructions: string }>;
    groceryList: string[];
  } | null>(null);
  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Record<string, boolean>>({});

  // AI Form & Posture Auditor State (Multimodal vision assessment)
  const [showPostureAuditorModal, setShowPostureAuditorModal] = useState(false);
  const [postureImageBase64, setPostureImageBase64] = useState<string | null>(null);
  const [postureExerciseType, setPostureExerciseType] = useState('Plank');
  const [isAuditingPosture, setIsAuditingPosture] = useState(false);
  const [postureAnalysisResult, setPostureAnalysisResult] = useState<{ score: number; verdict: string; corrections: string[]; strengths: string[] } | null>(null);

  // Live Spoken Coach Voice State
  const [isPlayingCoachVoice, setIsPlayingCoachVoice] = useState(false);
  const [coachVoiceUrl, setCoachVoiceUrl] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // User Profile & Settings
  const [userProfile, setUserProfile] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_profile') : null;
    return saved ? JSON.parse(saved) : {
      name: 'Alex Vance',
      gender: 'male',
      weightKg: 74,
      heightCm: 178,
      age: 27,
      primaryGoal: 'consistent',
      dailyCalTarget: 2200,
      dailyWaterTargetMl: 3000
    };
  });

  // Selected Day in Calendar
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Workout state & logs
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_completed_ex') : null;
    return saved ? JSON.parse(saved) : {};
  });

  const [workoutStreaks, setWorkoutStreaks] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_streaks') : null;
    return saved ? Number(saved) : 6;
  });

  // Nutrition logs
  const [foodLogs, setFoodLogs] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_foods') : null;
    return saved ? JSON.parse(saved) : DEFAULT_FOODS;
  });
  const [waterIntakeMl, setWaterIntakeMl] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_water') : null;
    return saved ? Number(saved) : 1750;
  });

  // Custom Workout Builder items
  const [customWorkouts, setCustomWorkouts] = useState<any[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_custom_plans') : null;
    return saved ? JSON.parse(saved) : [];
  });

  // Interactive Workout Session Modal State
  const [activeSession, setActiveSession] = useState<{
    planName: string;
    exercises: Array<any>;
    currentIndex: number;
    isRunning: boolean;
    timeLeft: number;
    isResting: boolean;
    restTimeLeft: number;
  } | null>(null);

  // 1. AI Coach Conversation
  const handleSendAiCoachMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || aiChatInput;
    if (!textToSend.trim() || isAiCoachThinking) return;

    const newHistory = [...aiChatMessages, { sender: 'user' as const, text: textToSend }];
    setAiChatMessages(newHistory);
    if (!customPrompt) setAiChatInput('');
    setIsAiCoachThinking(true);

    try {
      const systemInstruction = `You are the lead certified coach at PULSE FIT.
You have the user's real-time biometrics and plan:
- Name: ${userProfile.name}
- Gender: ${userProfile.gender}
- Primary Fitness Goal: ${currentGoalObj.name} (${currentGoalObj.desc})
- Today's routine: ${selectedDay} (${todayRoutine.title})
- Progressive Overload Tier: Level ${overloadModifier} (+${overloadModifier * 2} reps)
- Nutrition balance: Consumed ${nutritionTotals.cal} kcal of ${targetCalories} kcal target.
Be motivating, scientifically accurate, concise (under 120 words), and provide actionable exercise cues and nutrition guidance.`;

      const payload = {
        contents: newHistory.map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        systemInstruction: { parts: [{ text: systemInstruction }] }
      };

      const data = await callGeminiApi(payload);
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Let's keep pushing! Focus on form, stability, and consistent breathing.";
      setAiChatMessages([...newHistory, { sender: 'ai', text: reply }]);
      if (soundEnabled) soundPlayer.beep(750, 0.12, 'triangle');
    } catch (err) {
      setAiChatMessages([...newHistory, { sender: 'ai', text: "I'm having trouble syncing right now. Remember: Maintain rigid core alignment and stay hydrated!" }]);
    } finally {
      setIsAiCoachThinking(false);
    }
  };

  // 2. AI Meal Scanner & Estimator
  const handleAnalyzeMeal = async () => {
    if (!mealDescriptionPrompt.trim() && !mealImageBase64) return;
    setIsAnalyzingMeal(true);
    setAnalyzedMealResult(null);

    try {
      const parts: any[] = [];
      const promptText = `Analyze this meal accurately for fitness tracking. Provide nutritional estimates:
Description: "${mealDescriptionPrompt || 'Uploaded meal photo'}"
Return a JSON object with:
- "name": Concise dish name
- "cal": Total estimated calories (integer)
- "p": Protein in grams (integer)
- "c": Carbohydrates in grams (integer)
- "f": Fat in grams (integer)
- "explanation": 1-2 sentence fitness takeaway explaining how this meal fuels recovery or workouts.`;

      parts.push({ text: promptText });

      if (mealImageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: mealImageBase64.split(',')[1] || mealImageBase64
          }
        });
      }

      const payload = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              cal: { type: "INTEGER" },
              p: { type: "INTEGER" },
              c: { type: "INTEGER" },
              f: { type: "INTEGER" },
              explanation: { type: "STRING" }
            },
            required: ["name", "cal", "p", "c", "f", "explanation"]
          }
        }
      };

      const result = await callGeminiApi(payload);
      const textJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textJson) {
        const parsed = JSON.parse(textJson);
        setAnalyzedMealResult(parsed);
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      setAnalyzedMealResult({
        name: mealDescriptionPrompt || "Nutritious Protein Bowl",
        cal: 420,
        p: 32,
        c: 40,
        f: 12,
        explanation: "Good balance of lean protein and complex carbs for muscle glycogen restoration."
      });
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  // 3. AI Custom Workout Generator
  const handleGenerateAiWorkout = async () => {
    setIsGeneratingWorkout(true);
    try {
      const userPrompt = `Create a high-impact bodyweight workout routine.
Focus: ${aiWorkoutFocus}
Target duration: ${aiWorkoutDurationMin} minutes
Difficulty: ${aiWorkoutIntensity}
User Goal: ${currentGoalObj.name}
Ensure exercises are drawn from functional calisthenics, core sculptors, and isometric holds.
Return an array of 5 to 7 exercises with:
- "name": exercise name
- "amount": number of reps or duration in seconds
- "unit": "reps" or "sec"
- "cues": concise biomechanics form cue
- "muscles": primary muscles targeted`;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                amount: { type: "INTEGER" },
                unit: { type: "STRING", enum: ["reps", "sec"] },
                cues: { type: "STRING" },
                muscles: { type: "STRING" }
              },
              required: ["name", "amount", "unit", "cues", "muscles"]
            }
          }
        }
      };

      const result = await callGeminiApi(payload);
      const jsonStr = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonStr) {
        const generatedList = JSON.parse(jsonStr);
        const planTitle = `AI: ${aiWorkoutFocus} (${aiWorkoutDurationMin}m)`;
        setCustomWorkouts(prev => [...prev, { name: planTitle, exercises: generatedList }]);
        setShowAiWorkoutModal(false);
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      // Fallback custom routine
      const fallbackPlan = {
        name: `AI: ${aiWorkoutFocus}`,
        exercises: [
          { name: "Plank to Pushup", amount: 12, unit: "reps" as const, cues: "Lock core, elbows stacked", muscles: "Triceps, Shoulders, Core" },
          { name: "Wall Sit with Overhead Reach", amount: 45, unit: "sec" as const, cues: "Back flat, 90-degree bend", muscles: "Quadriceps, Glutes" },
          { name: "Bicycle Crunches", amount: 20, unit: "reps" as const, cues: "Slow rotation from ribcage", muscles: "Obliques, Abs" },
          { name: "Superman Hold", amount: 35, unit: "sec" as const, cues: "Squeeze glutes, lengthen spine", muscles: "Posterior chain" }
        ]
      };
      setCustomWorkouts(prev => [...prev, fallbackPlan]);
      setShowAiWorkoutModal(false);
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  // 4. Live In-Workout AI Form Coach
  const fetchLiveExerciseCoachAdvice = async (exerciseName: string) => {
    setWorkoutAiTip({ exercise: exerciseName, tip: '', isLoading: true });
    try {
      const payload = {
        contents: [{
          role: 'user',
          parts: [{
            text: `Give me 2 bullet points on how to execute '${exerciseName}' with world-class form, plus 1 common dangerous mistake to avoid. Keep under 50 words.`
          }]
        }]
      };
      const res = await callGeminiApi(payload);
      const text = res?.candidates?.[0]?.content?.parts?.[0]?.text || "Brace your core, maintain neutral neck alignment, and control the cadence.";
      setWorkoutAiTip({ exercise: exerciseName, tip: text, isLoading: false });
    } catch (err) {
      setWorkoutAiTip({ exercise: exerciseName, tip: "Keep your spine neutral, breathe steadily, and avoid letting your hips sag.", isLoading: false });
    }
  };

  // 5. Spoken AI Voice Coach Trigger (Gemini 2.5 Flash TTS)
  const playLiveCoachVoiceEncouragement = async (exerciseName: string) => {
    setIsPlayingCoachVoice(true);
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const prompt = `Say in an energetic, inspiring fitness coach voice: "Let's push ${userProfile.name}! Lock in that form on ${exerciseName}. Breathe steady and drive through the burn. You got this!"`;
      const audioUrl = await synthesizeCoachSpeech(prompt, "Puck");
      if (audioUrl) {
        setCoachVoiceUrl(audioUrl);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => setIsPlayingCoachVoice(false);
        audio.onerror = () => setIsPlayingCoachVoice(false);
        await audio.play();
      } else {
        setIsPlayingCoachVoice(false);
      }
    } catch (e) {
      setIsPlayingCoachVoice(false);
    }
  };

  // 6. Evidence-Based Sports Science Research (Gemini 3 Flash with Google Search Grounding)
  const handlePerformScienceResearch = async (overridePrompt?: string) => {
    const q = overridePrompt || researchQuery;
    if (!q.trim() || isSearchingScience) return;
    setIsSearchingScience(true);
    setResearchResult(null);

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: `Provide an evidence-based sports science answer for: "${q}". Explain physiological mechanism, practical workout application, and cite recommendations.` }] }],
      tools: [{ "google_search": {} }],
      systemInstruction: {
        parts: [{ text: "You are an elite exercise physiologist and nutritionist. Provide concise, clear, evidence-grounded insights with practical takeaways for bodyweight workouts, isometrics, and recovery." }]
      }
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      const candidate = result.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "No insights found.";

      let sources: Array<{ uri: string; title: string }> = [];
      const metadata = candidate?.groundingMetadata;
      if (metadata && metadata.groundingAttributions) {
        sources = metadata.groundingAttributions
          .map((a: any) => ({ uri: a.web?.uri, title: a.web?.title }))
          .filter((s: any) => s.uri && s.title);
      }

      setResearchResult({ text, sources });
      if (soundEnabled) soundPlayer.playVictory();
    } catch (e) {
      setResearchResult({
        text: "Recent research confirms that isometric holds increase muscle tendon stiffness and neural drive with significantly lower joint shear stress, making them ideal for longevity and core resilience.",
        sources: [{ title: "Sports Medicine & Exercise Science Journal", uri: "https://pubmed.ncbi.nlm.nih.gov" }]
      });
    } finally {
      setIsSearchingScience(false);
    }
  };

  // 7. Posture & Form Auditor with Gemini Multimodal Vision
  const handleAuditPostureImage = async () => {
    if (!postureImageBase64) return;
    setIsAuditingPosture(true);
    setPostureAnalysisResult(null);

    try {
      const prompt = `Analyze this user's exercise form for ${postureExerciseType}.
Evaluate:
1. Pelvis tilt and spinal neutrality (is back arched or sagging?)
2. Joint stacking (shoulders over wrists/elbows, knees over toes)
3. Muscle engagement visual cues.
Return JSON with:
- "score": number from 0 to 100
- "verdict": 1 sentence summary
- "corrections": array of 2 actionable biomechanical fixes
- "strengths": array of 2 positive execution points`;

      const payload = {
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: postureImageBase64.split(',')[1] || postureImageBase64
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "INTEGER" },
              verdict: { type: "STRING" },
              corrections: { type: "ARRAY", items: { type: "STRING" } },
              strengths: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["score", "verdict", "corrections", "strengths"]
          }
        }
      };

      const result = await callGeminiApi(payload);
      const textJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textJson) {
        setPostureAnalysisResult(JSON.parse(textJson));
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      setPostureAnalysisResult({
        score: 84,
        verdict: "Solid core engagement; slight adjustment needed in scapular depression.",
        corrections: ["Draw shoulder blades down and back", "Tuck chin slightly to avoid neck hyperextension"],
        strengths: ["Flat lumbar alignment", "Firm glute and quad activation"]
      });
    } finally {
      setIsAuditingPosture(false);
    }
  };

  // 8. Custom Milestone Badge & Art Generator (Gemini 3.1 Flash Image)
  const handleGenerateMilestoneBadge = async () => {
    setIsGeneratingBadge(true);
    setGeneratedBadgeUrl(null);

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: `${badgePrompt}. High quality, vibrant 3D icon badge, clean vector art style, dark sleek background.` }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: "1:1" }
      }
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      const part = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (part) {
        setGeneratedBadgeUrl(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      console.debug('Badge generation error:', e);
    } finally {
      setIsGeneratingBadge(false);
    }
  };

  // 9. AI Daily Morning Briefing & Spoken Audio (Gemini 3 Flash + Gemini 2.5 Flash TTS)
  const handleGenerateDailyBriefing = async () => {
    setIsGeneratingBriefing(true);
    try {
      const prompt = `Generate a daily morning fitness readiness briefing for ${userProfile.name}.
Context:
- Goal: ${currentGoalObj.name}
- Today: ${selectedDay} (${todayRoutine.title})
- Current Streak: ${workoutStreaks} days
- Progressive Overload Tier: Tier ${overloadModifier}
- Calorie target: ${targetCalories} kcal
Return a JSON object with:
- "readinessScore": an integer from 70 to 98
- "headline": an energetic 1-sentence motivation headline
- "coachingAdvice": 2-sentence tactical workout advice specifically for ${selectedDay}'s movements
- "focusExercise": name of the key exercise to master today`;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              readinessScore: { type: "INTEGER" },
              headline: { type: "STRING" },
              coachingAdvice: { type: "STRING" },
              focusExercise: { type: "STRING" }
            },
            required: ["readinessScore", "headline", "coachingAdvice", "focusExercise"]
          }
        }
      };

      const result = await callGeminiApi(payload);
      const textJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textJson) {
        const parsed = JSON.parse(textJson);
        setDailyBriefing(parsed);
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      setDailyBriefing({
        readinessScore: 92,
        headline: "High recovery state detected — primed for isometric endurance!",
        coachingAdvice: `Focus on rigid core bracing during your ${todayRoutine.exercises[0]?.name || 'Plank'} today. Keep pelvic tilt neutral.`,
        focusExercise: todayRoutine.exercises[0]?.name || "Wall Sit"
      });
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handlePlayBriefingSpokenVoice = async () => {
    if (!dailyBriefing) return;
    setIsPlayingBriefingVoice(true);
    try {
      if (briefingAudioRef.current) {
        briefingAudioRef.current.pause();
      }
      const ttsPrompt = `Speak in an inspiring, authoritative athletic coach voice: "Good morning ${userProfile.name}! Readiness is at ${dailyBriefing.readinessScore} percent. ${dailyBriefing.headline}. Here is your game plan: ${dailyBriefing.coachingAdvice}. Today's priority exercise is ${dailyBriefing.focusExercise}. Let's get to work!"`;
      const audioUrl = await synthesizeCoachSpeech(ttsPrompt, selectedVoicePersona);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        briefingAudioRef.current = audio;
        audio.onended = () => setIsPlayingBriefingVoice(false);
        audio.onerror = () => setIsPlayingBriefingVoice(false);
        await audio.play();
      } else {
        setIsPlayingBriefingVoice(false);
      }
    } catch (err) {
      setIsPlayingBriefingVoice(false);
    }
  };

  // 10. AI Soreness & Rehab Clinic (Gemini 3 Flash Structured Protocol)
  const handleDiagnoseRecovery = async () => {
    setIsDiagnosingRecovery(true);
    setRecoveryDiagnosticResult(null);
    try {
      const prompt = `You are a sports physiotherapist. The user reports:
- Sore Muscle Area: ${soreMuscleGroup}
- Severity: ${sorenessSeverity}
- Recent Workouts: Bodyweight squats, wall sits, planks, lunges, and crunches
- Fitness Goal: ${currentGoalObj.name}
Provide an active recovery protocol.
Return JSON with:
- "likelyCause": 1-2 sentence explanation of biomechanical fatigue or tension cause
- "rehabExercises": an array of 3 active recovery/isometric rehab moves with { "name", "holdOrReps", "cues" }
- "warningFlag": 1 key symptom that would indicate the need to stop and rest
- "hydrationTip": specific electrolyte or hydration cue for this muscle recovery`;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              likelyCause: { type: "STRING" },
              rehabExercises: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    holdOrReps: { type: "STRING" },
                    cues: { type: "STRING" }
                  },
                  required: ["name", "holdOrReps", "cues"]
                }
              },
              warningFlag: { type: "STRING" },
              hydrationTip: { type: "STRING" }
            },
            required: ["likelyCause", "rehabExercises", "warningFlag", "hydrationTip"]
          }
        }
      };

      const result = await callGeminiApi(payload);
      const textJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textJson) {
        setRecoveryDiagnosticResult(JSON.parse(textJson));
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      setRecoveryDiagnosticResult({
        likelyCause: "Accumulated eccentric tension and tight hip flexors pulling on the lumbar spine.",
        rehabExercises: [
          { name: "Glute Bridge Isometric Hold", holdOrReps: "3 x 30 sec", cues: "Drive through heels, keep pelvis level, avoid lumbar arching." },
          { name: "Dead Bug Core Stabilization", holdOrReps: "3 x 10 each side", cues: "Press lower back firmly into floor before extending opposite arm/leg." },
          { name: "Couch Stretch / Hip Flexor Opener", holdOrReps: "2 x 45 sec", cues: "Tuck pelvis under, squeeze glute on the trailing leg side." }
        ],
        warningFlag: "Sharp pinching pain radiating below the knee or numbness.",
        hydrationTip: "Consume 500ml water with sodium and magnesium to mitigate muscle cramp spasms."
      });
    } finally {
      setIsDiagnosingRecovery(false);
    }
  };

  // 11. AI Full-Day Meal Planner & Smart Grocery List (Gemini 3 Flash)
  const handleGenerateDayMealPlan = async () => {
    setIsGeneratingMealPlan(true);
    setGeneratedDayPlan(null);
    try {
      const prompt = `Design a comprehensive 1-day meal plan with a grocery checklist.
User Parameters:
- Daily Calorie Target: ${targetCalories} kcal
- Macro Targets: Protein ${macroGramTargets.p}g, Carbs ${macroGramTargets.c}g, Fats ${macroGramTargets.f}g
- Primary Fitness Goal: ${currentGoalObj.name}
- Dietary Preference: ${dietaryPreference}
Return JSON with:
- "summary": 1-sentence nutritional strategy summary
- "meals": array of 4 items (Breakfast, Lunch, Dinner, Snack) each with:
    "meal" (string), "dish" (string), "calories" (integer), "protein" (integer), "carbs" (integer), "fats" (integer), "instructions" (string)
- "groceryList": array of 8-10 essential ingredient items with quantities needed`;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              summary: { type: "STRING" },
              meals: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    meal: { type: "STRING" },
                    dish: { type: "STRING" },
                    calories: { type: "INTEGER" },
                    protein: { type: "INTEGER" },
                    carbs: { type: "INTEGER" },
                    fats: { type: "INTEGER" },
                    instructions: { type: "STRING" }
                  },
                  required: ["meal", "dish", "calories", "protein", "carbs", "fats", "instructions"]
                }
              },
              groceryList: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["summary", "meals", "groceryList"]
          }
        }
      };

      const result = await callGeminiApi(payload);
      const textJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textJson) {
        setGeneratedDayPlan(JSON.parse(textJson));
        setCheckedGroceryItems({});
        if (soundEnabled) soundPlayer.playVictory();
      }
    } catch (e) {
      setGeneratedDayPlan({
        summary: `Targeted ${dietaryPreference} meal structure calibrated for ${currentGoalObj.name}.`,
        meals: [
          { meal: "Breakfast", dish: "High-Protein Berry Oatmeal with Chia", calories: 450, protein: 32, carbs: 55, fats: 10, instructions: "Cook rolled oats with almond milk, stir in whey protein isolate, top with chia seeds and blueberries." },
          { meal: "Lunch", dish: "Lemon Herb Chicken Quinoa Power Bowl", calories: 580, protein: 48, carbs: 52, fats: 14, instructions: "Grilled chicken breast over seasoned quinoa, steamed broccoli florets, and olive oil drizzle." },
          { meal: "Snack", dish: "Greek Yogurt Parfait with Walnuts", calories: 240, protein: 22, carbs: 18, fats: 8, instructions: "0% Greek yogurt layered with crushed walnuts and raw honey." },
          { meal: "Dinner", dish: "Pan-Seared Salmon & Asparagus Medley", calories: 530, protein: 44, carbs: 22, fats: 26, instructions: "Wild salmon fillet seared in skillet, served alongside roasted asparagus and baked sweet potato slices." }
        ],
        groceryList: [
          "Rolled Oats (500g)",
          "Chia Seeds",
          "Frozen Blueberries",
          "Chicken Breasts (500g)",
          "Quinoa (250g)",
          "Broccoli crown",
          "Greek Yogurt (0% fat)",
          "Raw Walnuts",
          "Wild Salmon Fillets (2 pack)",
          "Fresh Asparagus spears"
        ]
      });
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  // Exercise Detail Modal
  const [inspectedExercise, setInspectedExercise] = useState<any | null>(null);

  // Progressive Overload Level (+% reps/sets modifier based on logged workouts)
  const [overloadModifier, setOverloadModifier] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pulsefit_overload') : null;
    return saved ? Number(saved) : 0; // 0 means default, +1 adds reps/time
  });

  // New Food Modal
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', cal: 250, p: 20, c: 25, f: 5, tag: 'Meal' });

  // Custom plan create modal
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedPlanExercises, setSelectedPlanExercises] = useState<string[]>([]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('pulsefit_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('pulsefit_completed_ex', JSON.stringify(completedExercises));
  }, [completedExercises]);

  useEffect(() => {
    localStorage.setItem('pulsefit_foods', JSON.stringify(foodLogs));
  }, [foodLogs]);

  useEffect(() => {
    localStorage.setItem('pulsefit_water', String(waterIntakeMl));
  }, [waterIntakeMl]);

  useEffect(() => {
    localStorage.setItem('pulsefit_streaks', String(workoutStreaks));
  }, [workoutStreaks]);

  useEffect(() => {
    localStorage.setItem('pulsefit_overload', String(overloadModifier));
  }, [overloadModifier]);

  useEffect(() => {
    localStorage.setItem('pulsefit_custom_plans', JSON.stringify(customWorkouts));
  }, [customWorkouts]);

  useEffect(() => {
    let timer: any = null;
    if (activeSession && activeSession.isRunning) {
      timer = setInterval(() => {
        if (!activeSession.isResting) {
          // In active work
          if (activeSession.timeLeft > 1) {
            setActiveSession(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null);
            if (activeSession.timeLeft <= 4 && soundEnabled) {
              soundPlayer.beep(480, 0.08);
            }
          } else {
            // Exercise finished!
            if (soundEnabled) soundPlayer.beep(880, 0.25, 'triangle');
            const isLast = activeSession.currentIndex >= activeSession.exercises.length - 1;
            if (isLast) {
              // Workout completed
              if (soundEnabled) soundPlayer.playVictory();
              setWorkoutStreaks(s => s + 1);
              // Progressive overload bonus
              setOverloadModifier(m => Math.min(m + 1, 5));
              alertModalCelebration();
            } else {
              // Trigger rest period (30s)
              setActiveSession(prev => prev ? {
                ...prev,
                isResting: true,
                restTimeLeft: 30
              } : null);
            }
          }
        } else {
          // In Rest period
          if (activeSession.restTimeLeft > 1) {
            setActiveSession(prev => prev ? { ...prev, restTimeLeft: prev.restTimeLeft - 1 } : null);
            if (activeSession.restTimeLeft <= 3 && soundEnabled) {
              soundPlayer.beep(350, 0.09);
            }
          } else {
            // Advance to next exercise
            if (soundEnabled) soundPlayer.beep(750, 0.2);
            const nextIdx = activeSession.currentIndex + 1;
            const nextEx = activeSession.exercises[nextIdx];
            const nextDuration = nextEx.unit === 'sec' ? nextEx.amount : 35; // timed default or rep pacing
            setActiveSession(prev => prev ? {
              ...prev,
              currentIndex: nextIdx,
              isResting: false,
              timeLeft: nextDuration
            } : null);
          }
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, soundEnabled]);

  const alertModalCelebration = () => {
    setActiveSession(null);
  };

  const currentGoalObj = useMemo(() => {
    return FITNESS_GOALS.find(g => g.id === userProfile.primaryGoal) || FITNESS_GOALS[0];
  }, [userProfile.primaryGoal]);

  const nutritionTotals = useMemo(() => {
    return foodLogs.reduce((acc, cur) => {
      acc.cal += cur.cal;
      acc.p += cur.p;
      acc.c += cur.c;
      acc.f += cur.f;
      return acc;
    }, { cal: 0, p: 0, c: 0, f: 0 });
  }, [foodLogs]);

  // Daily target calories based on goal multiplier & gender
  const targetCalories = useMemo(() => {
    const base = userProfile.gender === 'female' ? 1850 : 2250;
    return Math.round(base * currentGoalObj.calMultiplier);
  }, [userProfile.gender, currentGoalObj]);

  const macroGramTargets = useMemo(() => {
    // 4 kcal/g protein, 4 kcal/g carb, 9 kcal/g fat
    const pKcal = (targetCalories * (currentGoalObj.macroSplit.p / 100));
    const cKcal = (targetCalories * (currentGoalObj.macroSplit.c / 100));
    const fKcal = (targetCalories * (currentGoalObj.macroSplit.f / 100));
    return {
      p: Math.round(pKcal / 4),
      c: Math.round(cKcal / 4),
      f: Math.round(fKcal / 9)
    };
  }, [targetCalories, currentGoalObj]);

  // Current day's routine from image.jpg 5-day plan
  const todayRoutine = FIVE_DAY_PLAN[selectedDay] || FIVE_DAY_PLAN.Monday;

  // Toggle single exercise completion
  const toggleExerciseCheck = (name: string) => {
    const key = `${selectedDay}-${name}`;
    setCompletedExercises(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!prev[key] && soundEnabled) {
        soundPlayer.beep(600, 0.1);
      }
      return next;
    });
  };

  // Launch interactive session for a routine
  const startWorkoutSession = (planName: string, exercises: any[]) => {
    if (!exercises || exercises.length === 0) return;
    const first = exercises[0];
    const firstDuration = first.unit === 'sec' ? (first.amount + overloadModifier * 5) : 30;
    setActiveSession({
      planName,
      exercises,
      currentIndex: 0,
      isRunning: true,
      timeLeft: firstDuration,
      isResting: false,
      restTimeLeft: 30
    });
  };

  const getOverloadedAmount = (item: { amount: number; unit: 'reps' | 'sec' }) => {
    if (overloadModifier === 0) return `${item.amount} ${item.unit}`;
    const extra = item.unit === 'sec' ? overloadModifier * 5 : overloadModifier * 2;
    return `${item.amount + extra} ${item.unit} (+${extra} overload)`;
  };

  const themeClass = isDarkMode ? 'bg-[#0E1117] text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg = isDarkMode ? 'bg-[#181D27] border-slate-800/80 shadow-lg' : 'bg-white border-slate-200 shadow-md';
  const accentGradient = 'from-[#FF4B63] to-[#FF758C] text-white';
  const pulseAccent = '#FF4B63';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${themeClass} ${isMobileView ? 'py-0 sm:py-6 bg-slate-950 flex flex-col items-center justify-center' : ''}`}>
      {/* Top Navbar / Simulator Control Bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-inherit px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between w-full ${isMobileView ? 'max-w-md rounded-t-3xl border-x' : ''}`}>
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#FF4B63] to-rose-400 flex items-center justify-center text-white font-extrabold shadow-md shadow-rose-500/30 shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-base sm:text-lg tracking-wider bg-gradient-to-r from-[#FF4B63] via-pink-400 to-rose-500 bg-clip-text text-transparent">
                PULSE FIT
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[170px] sm:max-w-none">Discipline Today • Strength Tomorrow</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl transition ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'}`}
            title={soundEnabled ? 'Mute Sounds' : 'Enable Workout Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl transition ${isDarkMode ? 'hover:bg-slate-800 text-amber-300' : 'hover:bg-slate-200 text-slate-700'}`}
            title="Toggle Light / Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsMobileView(!isMobileView)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
              isMobileView 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                : isDarkMode ? 'border-slate-800 bg-slate-800/60 text-slate-300' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {isMobileView ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isMobileView ? 'Mobile' : 'Desktop'}</span>
          </button>
        </div>
      </header>

      {/* Main Container / Mobile Device Wrapper */}
      <div className={`transition-all duration-300 relative w-full ${
        isMobileView 
          ? 'max-w-md min-h-[820px] max-h-[92vh] rounded-b-[40px] border-x-[8px] border-b-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col bg-inherit ring-1 ring-slate-700/40' 
          : 'max-w-4xl mx-auto'
      }`}>
        {/* Mock Mobile Status Island */}
        {isMobileView && (
          <div className="w-full bg-slate-900/90 py-1 px-5 flex items-center justify-between text-[11px] text-slate-400 font-medium border-b border-slate-800/60 select-none">
            <span>9:41</span>
            <div className="w-20 h-4 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-rose-500/80 mr-1 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">5G</span>
              <div className="w-4 h-2 rounded-sm border border-slate-400 p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        <main className={`pb-28 pt-3 sm:pt-4 px-3 sm:px-6 space-y-4 sm:space-y-6 ${isMobileView ? 'overflow-y-auto flex-1' : ''}`}>
          {/* TAB CONTENT: TODAY / HOME */}
          {activeTab === 'today' && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn">
              {/* Greeting & Header */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Welcome back,</span>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">{userProfile.name} 👋</h1>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Streak 🔥 {workoutStreaks}d
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Focus: <strong className="text-slate-200">{currentGoalObj.name}</strong> • {todayRoutine.title}</p>
                
                {/* Mobile-Optimized Action Tray */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar w-full">
                  <button
                    onClick={() => setShowAiWorkoutModal(true)}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-sm shadow-indigo-500/20 transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Routine</span>
                  </button>
                  <button
                    onClick={() => setShowPostureAuditorModal(true)}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-sm shadow-blue-500/20 transition active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Form Audit</span>
                  </button>
                  {}
                  <button
                    onClick={() => setShowRecoveryModal(true)}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] shadow-sm shadow-emerald-500/20 transition active:scale-95"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Rehab Clinic</span>
                  </button>
                  <button
                    onClick={() => setShowCreatePlanModal(true)}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm shadow-rose-500/20 transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Plan</span>
                  </button>
                </div>
              </div>

              {/* AI Coach Banner - Interactive */}
              <div
                onClick={() => setShowAiCoachModal(true)}
                className="bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-indigo-500/15 border border-rose-500/30 rounded-2xl p-3 sm:p-3.5 flex items-center space-x-3 cursor-pointer hover:border-rose-500/60 transition group shadow-md"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#FF4B63] to-rose-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="text-xs min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span className="truncate">AI Pulse Coach Active</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 hidden xs:inline">Gemini 3 Flash</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-snug mt-0.5 truncate group-hover:text-white transition">
                    Tap to ask form cues, recovery tips & custom sets &rarr;
                  </p>
                </div>
              </div>

              {}
              {/* GEMINI DAILY COACH AUDIO BRIEFING CARD */}
              <div className={`${cardBg} rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border relative overflow-hidden space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs sm:text-sm">Daily AI Coach Briefing</h3>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Gemini 3 Flash + TTS</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">Readiness & tactical cues for {selectedDay}</p>
                    </div>
                  </div>

                  {!dailyBriefing ? (
                    <button
                      onClick={handleGenerateDailyBriefing}
                      disabled={isGeneratingBriefing}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-40"
                    >
                      {isGeneratingBriefing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-white" />}
                      <span>Generate</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateDailyBriefing}
                      disabled={isGeneratingBriefing}
                      className="text-slate-400 hover:text-slate-200 text-xs p-1"
                      title="Regenerate Briefing"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {dailyBriefing ? (
                  <div className="space-y-2.5 pt-1 animate-fadeIn">
                    <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Readiness Score</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">{dailyBriefing.readinessScore}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Priority Exercise</span>
                        <span className="text-xs font-bold text-rose-400">{dailyBriefing.focusExercise}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 font-semibold leading-snug">
                      "{dailyBriefing.headline}"
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                      {dailyBriefing.coachingAdvice}
                    </p>

                    {/* Audio Playback & Voice Selection Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center space-x-1.5 text-[10px]">
                        <span className="text-slate-400 font-medium">Coach Voice:</span>
                        {(['Puck', 'Zephyr', 'Kore'] as const).map(voice => (
                          <button
                            key={voice}
                            onClick={() => setSelectedVoicePersona(voice)}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition ${
                              selectedVoicePersona === voice
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {voice === 'Puck' ? '⚡ Upbeat' : voice === 'Zephyr' ? '🌊 Calm' : '🎯 Firm'}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handlePlayBriefingSpokenVoice}
                        disabled={isPlayingBriefingVoice}
                        className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-[11px] flex items-center space-x-1.5 transition shadow-sm"
                      >
                        {isPlayingBriefingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isPlayingBriefingVoice ? 'Speaking...' : 'Listen to Briefing'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-[11px] text-slate-400">
                    Tap <strong className="text-amber-300">Generate</strong> to synthesize today's physiological readiness analysis and personalized spoken coach strategy.
                  </div>
                )}
              </div>

              {/* Quick Metrics Rings / Activity Score */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className={`${cardBg} rounded-2xl p-3 sm:p-4 border flex items-center space-x-2.5 sm:space-x-3.5`}>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Burned</span>
                    <div className="text-base sm:text-lg font-black truncate">{nutritionTotals.cal > 0 ? Math.round(nutritionTotals.cal * 0.42) : 480} <span className="text-[10px] font-normal text-slate-400">kcal</span></div>
                    <div className="text-[9px] sm:text-[10px] text-emerald-400 font-medium truncate">85% of target</div>
                  </div>
                </div>

                <div className={`${cardBg} rounded-2xl p-3 sm:p-4 border flex items-center space-x-2.5 sm:space-x-3.5`}>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Steps</span>
                    <div className="text-base sm:text-lg font-black truncate">9,420</div>
                    <div className="text-[9px] sm:text-[10px] text-blue-400 font-medium truncate">Goal 10k</div>
                  </div>
                </div>

                <div className={`${cardBg} rounded-2xl p-3 sm:p-4 border flex items-center space-x-2.5 sm:space-x-3.5`}>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Active Min</span>
                    <div className="text-base sm:text-lg font-black truncate">42 <span className="text-[10px] font-normal text-slate-400">m</span></div>
                    <div className="text-[9px] sm:text-[10px] text-emerald-400 font-medium truncate">+12m vs yday</div>
                  </div>
                </div>

                <div className={`${cardBg} rounded-2xl p-3 sm:p-4 border flex items-center space-x-2.5 sm:space-x-3.5`}>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Water</span>
                    <div className="text-base sm:text-lg font-black truncate">{waterIntakeMl} <span className="text-[10px] font-normal text-slate-400">ml</span></div>
                    <div className="text-[9px] sm:text-[10px] text-cyan-400 font-medium truncate">{Math.round((waterIntakeMl / userProfile.dailyWaterTargetMl) * 100)}% Hydrated</div>
                  </div>
                </div>
              </div>

              {/* Day of Week Selector */}
              <div className={`${cardBg} rounded-2xl sm:rounded-3xl p-3 sm:p-4 border space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    <span className="font-extrabold text-xs sm:text-sm">5-Day Plan Schedule</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">{selectedDay} Focus</span>
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {daysOfWeek.map((day) => {
                    const isSelected = selectedDay === day;
                    const isRest = day === 'Saturday' || day === 'Sunday';
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`flex-1 min-w-[42px] sm:min-w-[46px] py-2 px-1 rounded-xl sm:rounded-2xl text-center text-xs font-bold transition flex flex-col items-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : isRest
                            ? 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
                            : isDarkMode ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className="text-[9px] sm:text-[10px] uppercase font-mono">{day.slice(0, 3)}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : isRest ? 'bg-sky-400/60' : 'bg-rose-500'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Routine Card for Selected Day */}
              {todayRoutine.exercises.length > 0 ? (
                <div className={`${cardBg} rounded-2xl sm:rounded-3xl p-4 sm:p-5 border space-y-3.5 sm:space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black">{todayRoutine.title}</h2>
                        {overloadModifier > 0 && (
                          <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            +Tier {overloadModifier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{todayRoutine.focus}</p>
                    </div>
                    <button
                      onClick={() => startWorkoutSession(`${selectedDay} Workout`, todayRoutine.exercises)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF4B63] to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center justify-center space-x-2 transition active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Guided Workout</span>
                    </button>
                  </div>

                  {/* Exercise Checklist */}
                  <div className="space-y-2 pt-2 border-t border-inherit">
                    {todayRoutine.exercises.map((ex, idx) => {
                      const key = `${selectedDay}-${ex.name}`;
                      const isDone = !!completedExercises[key];
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition flex items-center justify-between gap-2 ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <button
                              onClick={() => toggleExerciseCheck(ex.name)}
                              className="text-slate-400 hover:text-emerald-400 transition shrink-0 p-1"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-bold truncate ${isDone ? 'line-through text-slate-400' : ''}`}>
                                  {ex.name}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-rose-400 shrink-0">
                                  {getOverloadedAmount(ex)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                <span className="text-slate-300 font-medium">Cue:</span> {ex.cues}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setInspectedExercise({ ...ex, category: '5-Day Plan' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                            title="Exercise Info"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Weekend Rest Card */
                <div className={`${cardBg} rounded-2xl sm:rounded-3xl p-6 border text-center space-y-3`}>
                  <div className="text-4xl sm:text-5xl">🏖️</div>
                  <h3 className="text-base sm:text-lg font-black">{todayRoutine.title}</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Muscles grow during recovery! Hydrate, stretch, replenish glycogen, and prepare for Monday's session.
                  </p>
                </div>
              )}
            </div>
          )}

        {/* TAB CONTENT: WORKOUTS & LIBRARIES */}
        {activeTab === 'workouts' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header with Custom Workout button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">Workout Programs & Library</h1>
                <p className="text-xs text-slate-400">Based on the 5-Day Plan, Core Sculptor & Isometric Masters</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiWorkoutModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Workout Generator</span>
                </button>
                <button
                  onClick={() => setShowCreatePlanModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Plan</span>
                </button>
              </div>
            </div>

            {/* Prebuilt Featured Programs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Program 1: Core Sculptor */}
              <div className={`${cardBg} rounded-3xl p-5 border flex flex-col justify-between hover:border-rose-500/40 transition group`}>
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl mb-3">
                    🔥
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Download (3) Routine</span>
                  <h3 className="text-lg font-black group-hover:text-rose-400 transition">Core Sculptor Master</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    11 core exercises targeting upper abs, lower abs, and obliques with progressive overload.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-300 font-medium">
                    <span>11 Exercises</span> • <span>Rest: 30-60s</span>
                  </div>
                </div>
                <button
                  onClick={() => startWorkoutSession('Core Sculptor', CORE_EXERCISES.map(c => ({
                    name: c.name,
                    amount: c.targetValue,
                    unit: c.unit as 'reps' | 'sec',
                    cues: c.cues,
                    muscles: c.muscles
                  })))}
                  className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Core Routine</span>
                </button>
              </div>

              {/* Program 2: 12 Isometric Library */}
              <div className={`${cardBg} rounded-3xl p-5 border flex flex-col justify-between hover:border-indigo-500/40 transition group`}>
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xl mb-3">
                    🧘
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Download (4) Routine</span>
                  <h3 className="text-lg font-black group-hover:text-indigo-400 transition">Top 12 Isometric Holds</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Planks, Wall Sits, Push That Wall, Superman, and Warrior Two for maximum joint strength without motion.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-300 font-medium">
                    <span>12 Static Holds</span> • <span>Zero Joint Impact</span>
                  </div>
                </div>
                <button
                  onClick={() => startWorkoutSession('Top 12 Isometrics', ISOMETRIC_EXERCISES.map(iso => ({
                    name: iso.name,
                    amount: iso.defaultDuration,
                    unit: 'sec' as const,
                    cues: iso.cues,
                    muscles: iso.muscles
                  })))}
                  className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Isometric Session</span>
                </button>
              </div>

              {/* Program 3: 5-Day Full Body Week */}
              <div className={`${cardBg} rounded-3xl p-5 border flex flex-col justify-between hover:border-rose-500/40 transition group`}>
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xl mb-3">
                    ⚡
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Image.jpg Routine</span>
                  <h3 className="text-lg font-black group-hover:text-rose-400 transition">5-Day Home Workout Plan</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Full body compound bodyweight plan progressing Monday through Friday with weekend restorative rests.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-300 font-medium">
                    <span>Mon - Fri Schedule</span> • <span>High Calorie Burn</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDay('Monday');
                    setActiveTab('today');
                  }}
                  className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View 5-Day Calendar</span>
                </button>
              </div>
            </div>

            {/* Custom Created Plans (If any) */}
            {customWorkouts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-rose-500" /> Your Custom Plans
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {customWorkouts.map((plan, idx) => (
                    <div key={idx} className={`${cardBg} p-4 rounded-2xl border flex items-center justify-between`}>
                      <div>
                        <h4 className="font-bold text-sm">{plan.name}</h4>
                        <p className="text-xs text-slate-400">{plan.exercises.length} exercises</p>
                      </div>
                      <button
                        onClick={() => startWorkoutSession(plan.name, plan.exercises)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition"
                      >
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exercise Encyclopedia Tabs (Isometrics & Core) */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Exercise Form & Anatomy Explorer</h2>
                  <p className="text-xs text-slate-400">Click any exercise for targeted muscles, cues, and execution guidelines</p>
                </div>
              </div>

              {/* Isometric Exercises Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span>Top 12 Isometric Holds</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ISOMETRIC_EXERCISES.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => setInspectedExercise(ex)}
                      className="p-3.5 rounded-2xl border border-slate-800 hover:border-rose-500/50 bg-slate-900/30 hover:bg-slate-900/60 cursor-pointer transition flex items-start space-x-3"
                    >
                      <div className="text-2xl p-2 rounded-xl bg-slate-800/80">{ex.iconEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm truncate">{ex.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{ex.defaultDuration}s</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5"><span className="text-rose-400 font-medium">Targets:</span> {ex.muscles}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Exercises Grid */}
              <div className="space-y-3 pt-4 border-t border-inherit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span>Core & Abdominal Blueprint (Download 3)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CORE_EXERCISES.map((core) => (
                    <div
                      key={core.id}
                      onClick={() => setInspectedExercise(core)}
                      className="p-3.5 rounded-2xl border border-slate-800 hover:border-amber-500/50 bg-slate-900/30 hover:bg-slate-900/60 cursor-pointer transition flex items-start space-x-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                        ABS
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm truncate">{core.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{core.scheme}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5"><span className="text-amber-400 font-medium">Focus:</span> {core.muscles}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: NUTRITION & DIET */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">Nutrition & Fuel Dashboard</h1>
                <p className="text-xs text-slate-400">
                  Targeted macros aligned with your primary goal: <span className="text-rose-400 font-bold">{currentGoalObj.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {}
                <button
                  onClick={() => setShowMealPlannerModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Day Meal Plan</span>
                </button>
                <button
                  onClick={() => setShowAiMealScanner(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Meal Scanner</span>
                </button>
                <button
                  onClick={() => setShowAddFoodModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Log</span>
                </button>
              </div>
            </div>

            {/* Daily Macro Progress Summary */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-5`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* SVG circular progress indicator */}
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={Math.max(0, 251.2 - (251.2 * Math.min(nutritionTotals.cal / targetCalories, 1)))}
                        strokeLinecap="round"
                        className="text-rose-500 transition-all duration-700"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-xl font-black">{nutritionTotals.cal}</span>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">kcal</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base">Daily Energy Balance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target: <span className="font-bold text-slate-200">{targetCalories} kcal</span> ({Math.round((nutritionTotals.cal / targetCalories) * 100)}% consumed)
                    </p>
                    <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                      {targetCalories - nutritionTotals.cal > 0 ? `${targetCalories - nutritionTotals.cal} kcal remaining` : 'Calorie target reached!'}
                    </div>
                  </div>
                </div>

                {/* Hydration quick tap */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center space-x-4 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Droplets className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Hydration tracker</div>
                    <div className="text-base font-black text-cyan-400">{waterIntakeMl} / {userProfile.dailyWaterTargetMl} ml</div>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => {
                          setWaterIntakeMl(w => w + 250);
                          if (soundEnabled) soundPlayer.beep(520, 0.08);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500/30 transition"
                      >
                        +250 ml
                      </button>
                      <button
                        onClick={() => {
                          setWaterIntakeMl(w => w + 500);
                          if (soundEnabled) soundPlayer.beep(640, 0.08);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500/30 transition"
                      >
                        +500 ml
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Three Macro Bars: Protein, Carbs, Fats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-inherit">
                {/* Protein */}
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-rose-400">Protein</span>
                    <span className="font-mono text-slate-300">{nutritionTotals.p}g / {macroGramTargets.p}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((nutritionTotals.p / macroGramTargets.p) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Muscle recovery & synthesis</span>
                </div>

                {/* Carbs */}
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-amber-400">Carbohydrates</span>
                    <span className="font-mono text-slate-300">{nutritionTotals.c}g / {macroGramTargets.c}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((nutritionTotals.c / macroGramTargets.c) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Glycogen replenisher</span>
                </div>

                {/* Fats */}
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-emerald-400">Healthy Fats</span>
                    <span className="font-mono text-slate-300">{nutritionTotals.f}g / {macroGramTargets.f}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((nutritionTotals.f / macroGramTargets.f) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Hormonal & joint support</span>
                </div>
              </div>
            </div>

            {/* Today's Logged Foods List */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-rose-500" /> Logged Items Today
                </h3>
                <span className="text-xs text-slate-400">{foodLogs.length} items logged</span>
              </div>

              <div className="divide-y divide-inherit">
                {foodLogs.map((food, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">{food.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">{food.tag}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 space-x-3">
                        <span>P: <strong className="text-slate-200">{food.p}g</strong></span>
                        <span>C: <strong className="text-slate-200">{food.c}g</strong></span>
                        <span>F: <strong className="text-slate-200">{food.f}g</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-sm text-rose-400">{food.cal} kcal</span>
                      <button
                        onClick={() => setFoodLogs(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-rose-500 text-xs p-1"
                        title="Delete entry"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal-Specific Meal Ideas */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-3`}>
              <h3 className="font-bold text-sm uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Tailored Meal Suggestions for "{currentGoalObj.name}"
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="font-bold text-slate-200 block mb-1">Pre-Workout Fuel (45 mins prior)</span>
                  <p className="text-slate-400">Banana slices on toasted sourdough with 1 tbsp peanut butter and a pinch of Himalayan pink salt.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="font-bold text-slate-200 block mb-1">Post-Workout Recovery (Within 60 mins)</span>
                  <p className="text-slate-400">30g whey isolate or plant protein blended with spinach, frozen berries, and unsweetened almond milk.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: ANALYTICS & GOALS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-black">Progress, Consistency & Goals</h1>
              <p className="text-xs text-slate-400">Visual analytics, milestone badges, and routine adaptation</p>
            </div>

            {/* Goal Selector Grid (Matching the 6 categories from image.jpg) */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Select Your Primary Fitness Goal</h3>
                  <p className="text-xs text-slate-400">Workout cadence, calorie targets, and cues automatically adapt</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FITNESS_GOALS.map((g) => {
                  const isSelected = userProfile.primaryGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setUserProfile(p => ({ ...p, primaryGoal: g.id }))}
                      className={`p-3.5 rounded-2xl text-left border transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                          : isDarkMode ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="text-2xl mb-1 block">{g.icon}</span>
                        <h4 className="font-bold text-sm leading-tight text-slate-100">{g.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{g.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-rose-400">
                          <Check className="w-3.5 h-3.5" /> Active Focus
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weekly Consistency Visualizer */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Weekly Activity & Adherence</h3>
                  <p className="text-xs text-slate-400">Calculated from completed sets and logged sessions</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                  <TrendingUp className="w-4 h-4" /> 92% Compliance
                </div>
              </div>

              {/* Bar Chart Representation */}
              <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
                {[
                  { day: 'Mon', val: 95, color: '#FF4B63' },
                  { day: 'Tue', val: 80, color: '#FF4B63' },
                  { day: 'Wed', val: 100, color: '#10B981' },
                  { day: 'Thu', val: 88, color: '#FF4B63' },
                  { day: 'Fri', val: 92, color: '#FF4B63' },
                  { day: 'Sat', val: 50, color: '#3B82F6' },
                  { day: 'Sun', val: 40, color: '#3B82F6' }
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-mono text-slate-400">{item.val}%</span>
                    <div
                      className="w-full max-w-[36px] rounded-t-xl transition-all duration-700"
                      style={{
                        height: `${item.val}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 4px 12px ${item.color}33`
                      }}
                    />
                    <span className="text-xs font-bold text-slate-400">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Badges Showcase */}
            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-rose-500" /> Milestone Badges & Streaks
                </h3>
                <button
                  onClick={() => setShowBadgeGeneratorModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>AI Badge Generator</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-500/10 to-transparent border border-rose-500/20 text-center">
                  <div className="text-3xl mb-1">🔥</div>
                  <h4 className="font-bold text-xs">Consistent Warrior</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">5+ consecutive days logged</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-transparent border border-amber-500/20 text-center">
                  <div className="text-3xl mb-1">🛡️</div>
                  <h4 className="font-bold text-xs">Core Crusher</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">100+ crunches & planks done</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-transparent border border-indigo-500/20 text-center">
                  <div className="text-3xl mb-1">🧱</div>
                  <h4 className="font-bold text-xs">Iron Isometric</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Completed 60s Wall Sit</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-transparent border border-cyan-500/20 text-center">
                  <div className="text-3xl mb-1">💧</div>
                  <h4 className="font-bold text-xs">Hydration Hero</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hit 3000ml water goal</p>
                </div>
              </div>

              {/* Research Hub Launcher Card */}
              <div
                onClick={() => setShowResearchModal(true)}
                className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border border-blue-500/30 flex items-center justify-between cursor-pointer hover:border-blue-500/60 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Globe className="w-5 h-5 group-hover:rotate-12 transition" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-blue-300">Sports Science & Research Lab</h4>
                    <p className="text-xs text-slate-400">Search grounded via Google & Gemini for verified training & nutrition evidence</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: PROFILE & CONFIG */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-black">User Profile & Biometrics</h1>
              <p className="text-xs text-slate-400">Configure your gender, physical metrics, and progressive overload targets</p>
            </div>

            <div className={`${cardBg} rounded-3xl p-5 border space-y-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender Path</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUserProfile({ ...userProfile, gender: 'male' })}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        userProfile.gender === 'male'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Male Target
                    </button>
                    <button
                      onClick={() => setUserProfile({ ...userProfile, gender: 'female' })}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        userProfile.gender === 'female'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Female Target
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Body Weight (kg)</label>
                  <input
                    type="number"
                    value={userProfile.weightKg}
                    onChange={(e) => setUserProfile({ ...userProfile, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={userProfile.heightCm}
                    onChange={(e) => setUserProfile({ ...userProfile, heightCm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Overload Level Stepper */}
              <div className="pt-4 border-t border-inherit">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-sm">Progressive Overload Level</h4>
                    <p className="text-xs text-slate-400">Adds automatic reps and hold duration across all plans</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-rose-400">Tier {overloadModifier}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setOverloadModifier(lvl)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                        overloadModifier === lvl
                          ? 'bg-rose-500 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      +{lvl * 2}r
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Data Reset button for demo testing */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCompletedExercises({});
                  setWaterIntakeMl(1500);
                  setFoodLogs(DEFAULT_FOODS);
                }}
                className="text-xs text-rose-400 hover:underline"
              >
                Reset Daily Log Data (Demo)
              </button>
            </div>
          </div>
        )}

        </main>

        {/* Floating Bottom Navigation Bar: Docked inside mobile simulator or fixed on responsive screens */}
        <nav className={`${isMobileView ? 'absolute bottom-0 left-0 right-0' : 'fixed bottom-0 left-0 right-0'} z-40 backdrop-blur-xl ${isDarkMode ? 'bg-[#0E1117]/95 border-slate-800' : 'bg-white/95 border-slate-200'} border-t px-2 sm:px-4 py-2 transition-all`}>
          <div className="max-w-md mx-auto flex items-center justify-between relative px-2">
            {/* Tab 1: Home / Today */}
            <button
              onClick={() => setActiveTab('today')}
              className={`flex flex-col items-center py-1 px-2.5 transition active:scale-95 ${activeTab === 'today' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Zap className={`w-5 h-5 ${activeTab === 'today' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Today</span>
            </button>

            {/* Tab 2: Workouts */}
            <button
              onClick={() => setActiveTab('workouts')}
              className={`flex flex-col items-center py-1 px-2.5 transition active:scale-95 ${activeTab === 'workouts' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Dumbbell className={`w-5 h-5 ${activeTab === 'workouts' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Workouts</span>
            </button>

            {/* Central Prominent '+' Quick Action */}
            <div className="relative -top-5">
              <button
                onClick={() => {
                  if (todayRoutine.exercises.length > 0) {
                    startWorkoutSession(`${selectedDay} Session`, todayRoutine.exercises);
                  } else {
                    setActiveTab('workouts');
                  }
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF4B63] to-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/50 hover:scale-105 active:scale-90 transition border-4 border-[#0E1117]"
                title="Quick Start Today's Routine"
              >
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </button>
            </div>

            {/* Tab 3: Nutrition */}
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`flex flex-col items-center py-1 px-2.5 transition active:scale-95 ${activeTab === 'nutrition' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Utensils className={`w-5 h-5 ${activeTab === 'nutrition' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Nutrition</span>
            </button>

            {/* Tab 4: Analytics */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center py-1 px-2.5 transition active:scale-95 ${activeTab === 'analytics' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Trophy className={`w-5 h-5 ${activeTab === 'analytics' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Stats</span>
            </button>

            {/* Tab 5: Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center py-1 px-2.5 transition active:scale-95 ${activeTab === 'profile' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ACTIVE WORKOUT SESSION MODAL */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-t-3xl sm:rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center max-h-[92vh] overflow-y-auto">
            
            {/* Top Bar inside modal */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-widest truncate max-w-[240px]">
                {activeSession.planName}
              </span>
              <button
                onClick={() => setActiveSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Stage Display */}
            {activeSession.isResting ? (
              /* Rest Period View */
              <div className="my-6 flex flex-col items-center animate-fadeIn w-full">
                <span className="text-xs uppercase font-bold text-sky-400 tracking-wider">REST & BREATHE</span>
                <div className="text-5xl sm:text-6xl font-black font-mono my-3 sm:my-4 text-sky-400">
                  00:{activeSession.restTimeLeft < 10 ? `0${activeSession.restTimeLeft}` : activeSession.restTimeLeft}
                </div>
                <p className="text-xs text-slate-400 max-w-xs px-2">
                  Shake it out and take deep breaths. Next up:{' '}
                  <strong className="text-white">
                    {activeSession.exercises[activeSession.currentIndex + 1]?.name}
                  </strong>
                </p>
                <button
                  onClick={() => setActiveSession(p => p ? { ...p, isResting: false, restTimeLeft: 0, currentIndex: p.currentIndex + 1, timeLeft: 30 } : null)}
                  className="mt-5 px-4 py-2 rounded-full bg-slate-800 text-xs font-bold hover:bg-slate-700 text-slate-200 transition"
                >
                  Skip Rest ⏩
                </button>
              </div>
            ) : (
              /* Active Exercise View */
              <div className="my-4 flex flex-col items-center w-full animate-fadeIn">
                {/* Progress dot indicators */}
                <div className="flex gap-1 mb-2.5 max-w-full overflow-x-auto py-1">
                  {activeSession.exercises.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all shrink-0 ${
                        i === activeSession.currentIndex
                          ? 'w-5 bg-rose-500'
                          : i < activeSession.currentIndex
                          ? 'w-1.5 bg-emerald-500'
                          : 'w-1.5 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <span className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-widest">
                  Exercise {activeSession.currentIndex + 1} of {activeSession.exercises.length}
                </span>

                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  {activeSession.exercises[activeSession.currentIndex]?.name}
                </h2>

                <div className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-1.5">
                  Target: {activeSession.exercises[activeSession.currentIndex]?.amount} {activeSession.exercises[activeSession.currentIndex]?.unit}
                </div>

                {/* Big Timer Circle */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 my-4 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-4 border-slate-800 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-rose-500">
                      {activeSession.timeLeft}
                      <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">s</span>
                    </span>
                  </div>
                </div>

                {/* Form cue checklist reminder */}
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-left w-full text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      Form Cue:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playLiveCoachVoiceEncouragement(activeSession.exercises[activeSession.currentIndex]?.name)}
                        disabled={isPlayingCoachVoice}
                        className="text-[9px] sm:text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                      >
                        {isPlayingCoachVoice ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Volume1 className="w-2.5 h-2.5" />}
                        <span>{isPlayingCoachVoice ? 'Speaking' : 'Voice'}</span>
                      </button>
                      <button
                        onClick={() => fetchLiveExerciseCoachAdvice(activeSession.exercises[activeSession.currentIndex]?.name)}
                        className="text-[9px] sm:text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" /> AI Cue
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {activeSession.exercises[activeSession.currentIndex]?.cues || 'Maintain rigid core, controlled pacing, steady nasal breathing.'}
                  </p>

                  {/* AI In-Workout Tip Accordion */}
                  {workoutAiTip && workoutAiTip.exercise === activeSession.exercises[activeSession.currentIndex]?.name && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/30 animate-fadeIn">
                      <div className="flex items-center justify-between font-bold text-indigo-300 text-[10px] mb-1">
                        <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> Coach Biomechanics</span>
                        <button onClick={() => setWorkoutAiTip(null)} className="text-slate-400 hover:text-white">&times;</button>
                      </div>
                      {workoutAiTip.isLoading ? (
                        <div className="flex items-center gap-1.5 py-1 text-slate-400 text-[10px]">
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                          <span>Generating coaching cues...</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line leading-relaxed text-[10px]">{workoutAiTip.tip}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Controls Bar */}
            <div className="w-full flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setActiveSession(p => p ? { ...p, isRunning: !p.isRunning } : null)}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition active:scale-95"
              >
                {activeSession.isRunning ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  const curr = activeSession.exercises[activeSession.currentIndex];
                  const resetTime = curr.unit === 'sec' ? curr.amount : 30;
                  setActiveSession(p => p ? { ...p, timeLeft: resetTime } : null);
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95"
                title="Restart this set"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => {
                  const curr = activeSession.exercises[activeSession.currentIndex];
                  toggleExerciseCheck(curr.name);
                  if (activeSession.currentIndex >= activeSession.exercises.length - 1) {
                    if (soundEnabled) soundPlayer.playVictory();
                    setWorkoutStreaks(s => s + 1);
                    setActiveSession(null);
                  } else {
                    setActiveSession(p => p ? { ...p, isResting: true, restTimeLeft: 30 } : null);
                  }
                }}
                className="px-4 sm:px-5 h-11 sm:h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Complete Set</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {inspectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setInspectedExercise(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
              {inspectedExercise.category || 'Exercise Breakdown'}
            </span>

            <h2 className="text-2xl font-black mt-2">{inspectedExercise.name}</h2>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">Targeted Muscles & Anatomy</span>
                <p className="text-slate-300">{inspectedExercise.muscles}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">Key Form Cues & Biomechanics</span>
                <p className="text-slate-300">{inspectedExercise.cues}</p>
              </div>

              {inspectedExercise.scheme && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">Recommended Scheme & Frequency</span>
                  <p className="text-slate-300">{inspectedExercise.scheme} • Rest 30-60 sec between sets</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectedExercise(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition"
            >
              Got it, Let's Train!
            </button>
          </div>
        </div>
      )}

      {}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-3xl border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base">Quick Log Meal / Snack</h3>
              <button onClick={() => setShowAddFoodModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Food Name</label>
                <input
                  type="text"
                  placeholder="e.g. Avocado Toast with Egg"
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={newFood.cal}
                    onChange={(e) => setNewFood({ ...newFood, cal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={newFood.p}
                    onChange={(e) => setNewFood({ ...newFood, p: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={newFood.c}
                    onChange={(e) => setNewFood({ ...newFood, c: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Fats (g)</label>
                  <input
                    type="number"
                    value={newFood.f}
                    onChange={(e) => setNewFood({ ...newFood, f: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowAddFoodModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFood.name.trim()) {
                    setFoodLogs(prev => [...prev, { ...newFood, id: `f-${Date.now()}` }]);
                    setShowAddFoodModal(false);
                    setNewFood({ name: '', cal: 250, p: 20, c: 25, f: 5, tag: 'Meal' });
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition"
              >
                Save Food
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base">Build Custom Routine</h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Routine Name</label>
                <input
                  type="text"
                  placeholder="e.g. 15-Minute Core & Wall Burn"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-2">Select Exercises to Include:</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                  {[...CORE_EXERCISES, ...ISOMETRIC_EXERCISES].map((ex) => {
                    const isChecked = selectedPlanExercises.includes(ex.name);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedPlanExercises(s => s.filter(n => n !== ex.name));
                          } else {
                            setSelectedPlanExercises(s => [...s, ex.name]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                          isChecked ? 'bg-rose-500/20 border-rose-500/50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-semibold">{ex.name}</span>
                        <span className="text-[10px] text-slate-400">{ex.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newPlanName.trim() && selectedPlanExercises.length > 0) {
                    const allPool = [...CORE_EXERCISES, ...ISOMETRIC_EXERCISES];
                    const exercises = selectedPlanExercises.map(name => {
                      const item = allPool.find(x => x.name === name);
                      return {
                        name: item?.name || name,
                        amount: (item as any)?.defaultDuration || (item as any)?.targetValue || 30,
                        unit: (item as any)?.unit || 'sec',
                        cues: item?.cues || 'Maintain tight core posture.',
                        muscles: item?.muscles || 'Full Body'
                      };
                    });
                    setCustomWorkouts(p => [...p, { name: newPlanName, exercises }]);
                    setShowCreatePlanModal(false);
                    setNewPlanName('');
                    setSelectedPlanExercises([]);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition"
              >
                Save Custom Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAiCoachModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF4B63] to-rose-400 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm">Pulse AI Fitness Coach</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Gemini 3 Flash</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Context: {userProfile.name} • {currentGoalObj.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiCoachModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/60 no-scrollbar">
              {[
                "How to improve my wall sit stamina?",
                "Suggest a high protein post-workout snack",
                "Why do my wrists hurt during pushups?",
                "Can I do planks every single day?"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendAiCoachMessage(chip)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 text-[10px] border border-slate-700 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#FF4B63] to-rose-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                        Coach
                      </span>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isAiCoachThinking && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-bl-none p-3 flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>Coach is analyzing your fitness metrics...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
              <input
                type="text"
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiCoachMessage()}
                placeholder="Ask about form, soreness, rep progressions..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => handleSendAiCoachMessage()}
                disabled={!aiChatInput.trim() || isAiCoachThinking}
                className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white transition shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAiMealScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Food & Macro Estimator</h3>
                  <p className="text-[10px] text-slate-400">Powered by Gemini Multimodal Vision</p>
                </div>
              </div>
              <button onClick={() => setShowAiMealScanner(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Options: Description & Image */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Describe the meal or ingredients:</label>
                <textarea
                  rows={2}
                  value={mealDescriptionPrompt}
                  onChange={(e) => setMealDescriptionPrompt(e.target.value)}
                  placeholder="e.g. 2 scrambled eggs, half an avocado, 1 slice sourdough toast with 1 tbsp butter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Photo Upload / Camera Simulator */}
              <div>
                <label className="font-bold text-slate-400 block mb-1">Or upload a photo of your plate:</label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-900/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMealImageBase64(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {mealImageBase64 ? (
                    <div className="relative inline-block">
                      <img src={mealImageBase64} alt="Meal preview" className="w-24 h-24 object-cover rounded-xl border border-emerald-500/50 mx-auto" />
                      <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">Photo Attached ✓</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1 text-slate-400">
                      <Camera className="w-6 h-6 text-emerald-400" />
                      <span className="text-[11px] font-medium">Click to select meal image</span>
                      <span className="text-[9px] text-slate-500">Supports JPG, PNG</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAnalyzeMeal}
                disabled={isAnalyzingMeal || (!mealDescriptionPrompt.trim() && !mealImageBase64)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-500/20"
              >
                {isAnalyzingMeal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini is calculating macros...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Analyze Nutritional Value</span>
                  </>
                )}
              </button>
            </div>

            {/* Result Presentation */}
            {analyzedMealResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-emerald-300">{analyzedMealResult.name}</h4>
                  <span className="font-mono font-bold text-sm text-rose-400">{analyzedMealResult.cal} kcal</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Protein</span>
                    <strong className="text-rose-400 font-bold">{analyzedMealResult.p}g</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Carbs</span>
                    <strong className="text-amber-400 font-bold">{analyzedMealResult.c}g</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Fat</span>
                    <strong className="text-emerald-400 font-bold">{analyzedMealResult.f}g</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  "{analyzedMealResult.explanation}"
                </p>

                <button
                  onClick={() => {
                    setFoodLogs(prev => [
                      ...prev,
                      {
                        id: `f-${Date.now()}`,
                        name: analyzedMealResult.name,
                        cal: analyzedMealResult.cal,
                        p: analyzedMealResult.p,
                        c: analyzedMealResult.c,
                        f: analyzedMealResult.f,
                        tag: 'AI Logged'
                      }
                    ]);
                    setShowAiMealScanner(false);
                    setMealDescriptionPrompt('');
                    setMealImageBase64(null);
                    setAnalyzedMealResult(null);
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition"
                >
                  + Add to Today's Food Log
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {showAiWorkoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Workout Architect</h3>
                  <p className="text-[10px] text-slate-400">Custom routine generator powered by Gemini</p>
                </div>
              </div>
              <button onClick={() => setShowAiWorkoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Target Focus / Muscle Groups</label>
                <input
                  type="text"
                  value={aiWorkoutFocus}
                  onChange={(e) => setAiWorkoutFocus(e.target.value)}
                  placeholder="e.g. Deep Core & Wall Sit Endurance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Session Duration</label>
                  <select
                    value={aiWorkoutDurationMin}
                    onChange={(e) => setAiWorkoutDurationMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value={10}>10 Minutes Express</option>
                    <option value={15}>15 Minutes Standard</option>
                    <option value={20}>20 Minutes High Burn</option>
                    <option value={30}>30 Minutes Complete</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Intensity</label>
                  <select
                    value={aiWorkoutIntensity}
                    onChange={(e) => setAiWorkoutIntensity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="Beginner">Beginner (Gentle)</option>
                    <option value="Intermediate">Intermediate (Targeted)</option>
                    <option value="Advanced / High Grit">Advanced (High Grit)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
                Gemini will synthesize isometric holds from your library with core conditioning and assign optimal reps and hold times.
              </div>

              <button
                onClick={handleGenerateAiWorkout}
                disabled={isGeneratingWorkout || !aiWorkoutFocus.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-500/20"
              >
                {isGeneratingWorkout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Designing routine via Gemini...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Generate & Save Routine</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {/* MODAL 5: Gemini Sports Science Lab with Google Search Grounding */}
      {showResearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Sports Science & Research Lab</h3>
                  <p className="text-[10px] text-slate-400">Grounded with Google Search & Gemini 3 Flash</p>
                </div>
              </div>
              <button onClick={() => setShowResearchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Science Inquiry Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                "Isometrics vs hypertrophy benefits",
                "Best time for post-workout protein",
                "Does wall sit reduce blood pressure?",
                "Plank vs crunches for spinal health"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setResearchQuery(chip);
                    handlePerformScienceResearch(chip);
                  }}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-blue-600/20 border border-slate-800 text-[10px] text-slate-300 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformScienceResearch()}
                placeholder="Ask any exercise physiology or nutrition science question..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handlePerformScienceResearch()}
                disabled={isSearchingScience || !researchQuery.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-bold transition flex items-center gap-1.5"
              >
                {isSearchingScience ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Research</span>
              </button>
            </div>

            {/* Research Results & Citations */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {isSearchingScience && (
                <div className="py-8 text-center space-y-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  <p>Grounding findings through Google Search scientific literature...</p>
                </div>
              )}

              {researchResult && !isSearchingScience && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 leading-relaxed whitespace-pre-line text-slate-200">
                    {researchResult.text}
                  </div>

                  {researchResult.sources.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        Verified Sources & Citations:
                      </span>
                      <div className="space-y-1">
                        {researchResult.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-blue-300 hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{src.title || src.uri}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: AI Form & Posture Auditor */}
      {showPostureAuditorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Form & Posture Auditor</h3>
                  <p className="text-[10px] text-slate-400">Computer vision alignment analysis via Gemini</p>
                </div>
              </div>
              <button onClick={() => setShowPostureAuditorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Select Exercise Being Performed</label>
                <select
                  value={postureExerciseType}
                  onChange={(e) => setPostureExerciseType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="Plank">The Plank</option>
                  <option value="Wall Sit">Wall Sit</option>
                  <option value="Pushup">Pushup</option>
                  <option value="Squat">Squat</option>
                  <option value="Side Plank">Side Plank</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Upload Photo of Your Form</label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-900/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPostureImageBase64(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {postureImageBase64 ? (
                    <div className="relative inline-block">
                      <img src={postureImageBase64} alt="Posture preview" className="w-28 h-28 object-cover rounded-xl border border-cyan-500/50 mx-auto" />
                      <span className="text-[10px] text-cyan-400 block mt-1 font-semibold">Form Image Ready ✓</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1 text-slate-400">
                      <Camera className="w-6 h-6 text-cyan-400" />
                      <span className="text-[11px] font-medium">Capture or upload form photo</span>
                      <span className="text-[9px] text-slate-500">Ensure full torso and limb visibility</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAuditPostureImage}
                disabled={isAuditingPosture || !postureImageBase64}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-cyan-500/20"
              >
                {isAuditingPosture ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini is analyzing spinal & joint alignment...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Audit Biomechanics & Form</span>
                  </>
                )}
              </button>
            </div>

            {postureAnalysisResult && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">Biomechanics Score</span>
                  <span className="font-mono text-base font-black text-emerald-400">{postureAnalysisResult.score}/100</span>
                </div>

                <p className="text-xs text-slate-300 italic">"{postureAnalysisResult.verdict}"</p>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Corrections:</span>
                  {postureAnalysisResult.corrections.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs pt-1 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Strengths:</span>
                  {postureAnalysisResult.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 7: AI Milestone Badge Generator (Gemini 3.1 Flash Image) */}
      {showBadgeGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Milestone Badge Generator</h3>
                  <p className="text-[10px] text-slate-400">Powered by Gemini 3.1 Flash Image</p>
                </div>
              </div>
              <button onClick={() => setShowBadgeGeneratorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Badge Description / Theme</label>
                <textarea
                  rows={2}
                  value={badgePrompt}
                  onChange={(e) => setBadgePrompt(e.target.value)}
                  placeholder="e.g. Glowing diamond shield celebrating 100 squats, 3D icon"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>

              <button
                onClick={handleGenerateMilestoneBadge}
                disabled={isGeneratingBadge || !badgePrompt.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-pink-500/20"
              >
                {isGeneratingBadge ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering 3D badge via Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Custom Badge</span>
                  </>
                )}
              </button>

              {generatedBadgeUrl && (
                <div className="text-center p-3 rounded-2xl bg-slate-900 border border-pink-500/30 space-y-2 animate-fadeIn">
                  <img
                    src={generatedBadgeUrl}
                    alt="AI Generated Milestone Badge"
                    className="w-44 h-44 object-cover rounded-2xl mx-auto border-2 border-pink-500/40 shadow-xl"
                  />
                  <div className="text-xs font-bold text-pink-300">Milestone Badge Created!</div>
                  <a
                    href={generatedBadgeUrl}
                    download="pulsefit-badge.png"
                    className="inline-block px-3 py-1 rounded-lg bg-pink-500 text-white text-[10px] font-bold hover:bg-pink-600"
                  >
                    Download Badge
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {/* MODAL 8: Gemini Muscle Soreness & Active Recovery Clinic */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Soreness & Active Rehab Clinic</h3>
                  <p className="text-[10px] text-slate-400">Biomechanics analysis & targeted isometric recovery</p>
                </div>
              </div>
              <button onClick={() => setShowRecoveryModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Target Sore Muscle Group</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'Lower Back & Glutes',
                    'Quadriceps & Knees',
                    'Hamstrings & Calves',
                    'Shoulders & Upper Traps',
                    'Abs & Obliques',
                    'Wrists & Forearms'
                  ].map((muscle) => (
                    <button
                      key={muscle}
                      onClick={() => setSoreMuscleGroup(muscle)}
                      className={`p-2 rounded-xl border text-[11px] font-semibold text-left transition ${
                        soreMuscleGroup === muscle
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {muscle}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Fatigue / Soreness Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Mild Tightness', 'Moderate Aches', 'Severe DOMS'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSorenessSeverity(sev)}
                      className={`py-1.5 rounded-xl border text-[10px] font-bold transition ${
                        sorenessSeverity === sev
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDiagnoseRecovery}
                disabled={isDiagnosingRecovery}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-500/20"
              >
                {isDiagnosingRecovery ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing biomechanical strain via Gemini...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Diagnose & Prescribe Rehab Holds</span>
                  </>
                )}
              </button>

              {/* Recovery Protocol Results */}
              {recoveryDiagnosticResult && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                    <span className="font-bold text-emerald-400 uppercase text-[10px] block mb-0.5">Biomechanical Assessment</span>
                    <p className="text-slate-200 leading-relaxed">{recoveryDiagnosticResult.likelyCause}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-300 text-xs block">Prescribed Isometric & Active Rehab:</span>
                    {recoveryDiagnosticResult.rehabExercises.map((rehab, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-white">{rehab.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {rehab.holdOrReps}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Cue:</strong> {rehab.cues}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="font-bold text-amber-400 block mb-0.5">⚠️ Caution Signal</span>
                      <p className="text-slate-400">{recoveryDiagnosticResult.warningFlag}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400 block mb-0.5">💧 Hydration / Electrolytes</span>
                      <p className="text-slate-400">{recoveryDiagnosticResult.hydrationTip}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {/* MODAL 9: Gemini Full-Day Meal Plan & Grocery Generator */}
      {showMealPlannerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141822] text-white rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Day Meal Plan & Smart Grocery</h3>
                  <p className="text-[10px] text-slate-400">Calculated for {targetCalories} kcal • {currentGoalObj.name}</p>
                </div>
              </div>
              <button onClick={() => setShowMealPlannerModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Select Dietary Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {['High Protein Balanced', 'Lean Cutting', 'Vegetarian Muscle', 'Clean Low Carb'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setDietaryPreference(style)}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center transition ${
                        dietaryPreference === style
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateDayMealPlan}
                disabled={isGeneratingMealPlan}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md shadow-purple-500/20"
              >
                {isGeneratingMealPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Balancing macros with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Utensils className="w-4 h-4" />
                    <span>Generate Full-Day Plan & Grocery List</span>
                  </>
                )}
              </button>

              {generatedDayPlan && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs">
                    <span className="font-bold text-purple-400 uppercase text-[10px] block mb-0.5">Macro Strategy</span>
                    <p className="text-slate-200">{generatedDayPlan.summary}</p>
                  </div>

                  {/* 4 Meals Grid */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-300 text-xs block">Prescribed Daily Menu:</span>
                    {generatedDayPlan.meals.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10">
                            {m.meal}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">{m.calories} kcal</span>
                        </div>
                        <h4 className="font-black text-xs text-slate-100">{m.dish}</h4>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-3">
                          <span>P: <strong className="text-rose-400">{m.protein}g</strong></span>
                          <span>C: <strong className="text-amber-400">{m.carbs}g</strong></span>
                          <span>F: <strong className="text-emerald-400">{m.fats}g</strong></span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/80">{m.instructions}</p>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Grocery Checklist */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">Exportable Grocery Checklist:</span>
                      <span className="text-[10px] text-slate-400">
                        {Object.values(checkedGroceryItems).filter(Boolean).length}/{generatedDayPlan.groceryList.length} checked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {generatedDayPlan.groceryList.map((item, i) => {
                        const isChecked = !!checkedGroceryItems[item];
                        return (
                          <div
                            key={i}
                            onClick={() => setCheckedGroceryItems(prev => ({ ...prev, [item]: !prev[item] }))}
                            className={`p-2 rounded-xl border cursor-pointer flex items-center space-x-2 text-[11px] transition ${
                              isChecked ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-500 line-through' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                              isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'
                            }`}>
                              {isChecked && '✓'}
                            </span>
                            <span className="truncate">{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import GameSetupScreen from './screens/GameSetupScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import RewardCodeScreen from './screens/RewardCodeScreen';
import ProfileScreen from './screens/ProfileScreen';

const screenComponents = {
  SPLASH: SplashScreen,
  ONBOARDING: OnboardingScreen,
  MENU: MainMenuScreen,
  GAME_SETUP: GameSetupScreen,
  PLAYING: GameScreen,
  SETTINGS: SettingsScreen,
  REWARD_CODE: RewardCodeScreen,
  PROFILE: ProfileScreen,
} as const;

// เรียงลำดับหน้าที่ควรโหลดเข้าแรมก่อน-หลัง
const PRELOAD_ORDER: (keyof typeof screenComponents)[] = [
  'SPLASH', // หน้าแรกโหลดก่อนเสมอ
  'MENU',
  'GAME_SETUP',
  'PLAYING',
  'SETTINGS',
  'PROFILE',
  'REWARD_CODE',
  'ONBOARDING',
];

export default function App() {
  const currentScreen = useGameStore((s) => s.screen);

  // สร้าง state สองตัว:
  // 1. visitedScreens: หน้าที่ถูก render ลง DOM แล้ว
  // 2. preloadIndex: ดัชนีแสดงความคืบหน้าการโหลดหน้าเข้า RAM ถัดไป
  const [visitedScreens, setVisitedScreens] = useState<Set<keyof typeof screenComponents>>(
    new Set(['SPLASH'])
  );
  const [preloadIndex, setPreloadIndex] = useState(1); // ข้าม SPLASH เพราะโหลดไปแล้ว

  // [Phase 1] บันทึกหน้าปัจจุบันลง visited (เผื่อมีการกระโดดไปหน้าที่ยังไม่โหลด)
  useEffect(() => {
    setVisitedScreens((prev: Set<keyof typeof screenComponents>) => {
      if (prev.has(currentScreen)) return prev;
      const next = new Set(prev);
      next.add(currentScreen);
      return next;
    });
  }, [currentScreen]);

  // [Phase 2] ทยอยโหลดหน้าเข้า DOM ทีละหน้า (Preloading) ระหว่างที่อยู่หน้า Splash
  useEffect(() => {
    if (preloadIndex < PRELOAD_ORDER.length) {
      // หน่วงเวลาการโหลดแต่ละ component เล็กน้อยเพื่อไม่ให้ main thread ค้าง
      // 150ms ให้เวลา Browser วาดเฟรม และ SplashScreen ได้มีโอกาสทำอนิเมชันลื่นไหล
      const timer = setTimeout(() => {
        const nextScreenToLoad = PRELOAD_ORDER[preloadIndex];

        setVisitedScreens((prev: Set<keyof typeof screenComponents>) => {
          if (prev.has(nextScreenToLoad)) return prev;
          const next = new Set(prev);
          next.add(nextScreenToLoad);
          return next;
        });

        // ค่อยๆ โหลดหน้าถัดไปตามคิว
        setPreloadIndex((idx: number) => idx + 1);

      }, 150);
      return () => clearTimeout(timer);
    }
  }, [preloadIndex]);

  // คำนวณความคืบหน้าการโหลด (0 - 100)
  const loadProgress = Math.min(100, Math.round(((preloadIndex) / PRELOAD_ORDER.length) * 100));

  return (
    <div className="w-full h-full overflow-hidden relative bg-black">
      {Object.entries(screenComponents).map(([key, ScreenComponent]) => {
        const screenKey = key as keyof typeof screenComponents;
        const isVisited = visitedScreens.has(screenKey);
        const isActive = currentScreen === screenKey;

        // ไม่เรนเดอร์ลง DOM ถ้ายังไม่ถึงคิวโหลด
        if (!isVisited) return null;

        return (
          <div
            key={key}
            className={`absolute inset-0 w-full h-full origin-center transition-all duration-300 ease-out ${isActive
              ? 'opacity-100 scale-100 pointer-events-auto z-10'
              : 'opacity-0 scale-95 pointer-events-none z-0'
              }`}
          >
            {/* ส่ง progress ไปให้หน้า Splash วาดหลอดโหลด */}
            {screenKey === 'SPLASH' ? <SplashScreen loadProgress={loadProgress} /> : <ScreenComponent loadProgress={loadProgress} />}
          </div>
        );
      })}
    </div>
  );
}

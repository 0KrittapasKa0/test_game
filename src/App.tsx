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

  // ตัวแปรเพิ่มสำหรับหลอกความคืบหน้าเวลา (ขั้นต่ำ 3 วินาทีตามที่ผู้ใช้ต้องการ)
  const [timeProgress, setTimeProgress] = useState(0);

  // [Phase 2] ทยอยโหลดหน้าเข้า DOM ทีละหน้า (Preloading) ระหว่างที่อยู่หน้า Splash
  useEffect(() => {
    // 1. จัดการความคืบหน้าของเวลา (Visual Timer) ใช้เวลา 3 วินาทีเพื่อให้ถึง 100%
    const visualTimer = setInterval(() => {
      setTimeProgress((prev: number) => {
        const next = prev + (100 / (3000 / 50)); // เพิ่มทีละนิดทุก 50ms (ให้ครบ 100 ภายใน 3000ms)
        return next >= 100 ? 100 : next;
      });
    }, 50);

    return () => clearInterval(visualTimer);
  }, []);

  useEffect(() => {
    // 2. จัดการความคืบหน้าของการโหลดจริงเข้า RAM (DOM Mounting)
    if (preloadIndex < PRELOAD_ORDER.length) {
      // โหลดถี่ขึ้นนิดนึง (100ms) เพราะเรามี visual timer 3 วิมาช่วยหน่วงแล้ว
      const mountTimer = setTimeout(() => {
        const nextScreenToLoad = PRELOAD_ORDER[preloadIndex];

        setVisitedScreens((prev: Set<keyof typeof screenComponents>) => {
          if (prev.has(nextScreenToLoad)) return prev;
          const next = new Set(prev);
          next.add(nextScreenToLoad);
          return next;
        });

        setPreloadIndex((idx: number) => idx + 1);
      }, 100);
      return () => clearTimeout(mountTimer);
    }
  }, [preloadIndex]);

  // คำนวณความคืบหน้าการโหลดจริง (0 - 100)
  const realProgress = Math.min(100, Math.round((preloadIndex / PRELOAD_ORDER.length) * 100));

  // ให้ Progress หลอดโหลดโชว์ค่าที่ "น้อยกว่า" เสมอ: 
  // - ถ้าเครื่องแรงโหลดเสร็จก่อน 3 วิ ก็ต้องรอหลอดเวลาให้เต็ม
  // - ถ้าเครื่องช้า หลอดเวลาเต็มแล้ว ก็ต้องรอโหลด RAM ให้เสร็จจริงๆ
  const loadProgress = Math.min(realProgress, Math.round(timeProgress));

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

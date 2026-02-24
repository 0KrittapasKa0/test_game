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

export default function App() {
  const currentScreen = useGameStore((s) => s.screen);

  // เก็บประวัติหน้าที่เคยเข้าแล้วไว้ใน state เพื่อไม่ต้องโหลดใหม่ (DOM Caching / Keep-Alive)
  const [visitedScreens, setVisitedScreens] = useState<Set<keyof typeof screenComponents>>(
    new Set([currentScreen])
  );

  useEffect(() => {
    setVisitedScreens((prev) => {
      if (prev.has(currentScreen)) return prev;
      const next = new Set(prev);
      next.add(currentScreen);
      return next;
    });
  }, [currentScreen]);

  return (
    <div className="w-full h-full overflow-hidden relative bg-black">
      {Object.entries(screenComponents).map(([key, ScreenComponent]) => {
        const screenKey = key as keyof typeof screenComponents;
        const isVisited = visitedScreens.has(screenKey);
        const isActive = currentScreen === screenKey;

        // ไม่เรนเดอร์ลง DOM ถ้ายังไม่เคยเปิดหน้านี้ (ประหยัดแรมตอนเริ่มเกม)
        if (!isVisited) return null;

        // ถอดหน้า SPLASH และ ONBOARDING ออกจากแรมถาวรทันทีที่ไม่ได้ใช้งานแล้ว (ประหยัดแรมเพิ่ม)
        // เพราะ 2 หน้านี้จะถูกกดเข้าแค่ครั้งเดียวตั้งแต่อ่านเว็บ
        if (!isActive && (screenKey === 'SPLASH' || screenKey === 'ONBOARDING')) {
          return null;
        }

        return (
          <div
            key={key}
            className={`absolute inset-0 w-full h-full origin-center transition-all duration-300 ease-out ${isActive
              ? 'opacity-100 scale-100 pointer-events-auto z-10'
              : 'opacity-0 scale-95 pointer-events-none z-0'
              }`}
          >
            <ScreenComponent />
          </div>
        );
      })}
    </div>
  );
}

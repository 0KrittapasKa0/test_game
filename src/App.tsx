import { useGameStore } from './store/useGameStore';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import GameSetupScreen from './screens/GameSetupScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import OnlineJoinScreen from './screens/OnlineJoinScreen';

const screenComponents = {
  SPLASH: SplashScreen,
  ONBOARDING: OnboardingScreen,
  MENU: MainMenuScreen,
  GAME_SETUP: GameSetupScreen,
  PLAYING: GameScreen,
  ONLINE_PLAYING: OnlineGameScreen,
  ONLINE_JOIN: OnlineJoinScreen,
  SETTINGS: SettingsScreen,
  ACTIVITIES: ActivitiesScreen,
  PROFILE: ProfileScreen,
} as const;

export default function App() {
  const currentScreen = useGameStore((s) => s.screen);

  return (
    <div className="w-full h-full overflow-hidden relative bg-black">
      {Object.entries(screenComponents).map(([key, ScreenComponent]) => {
        const screenKey = key as keyof typeof screenComponents;
        const isActive = currentScreen === screenKey;

        // Render only the active screen to save memory, especially on mobile devices (iOS Safari limits)
        if (!isActive) return null;

        return (
          <div
            key={key}
            className={`absolute inset-0 w-full h-full origin-center transition-all duration-200 ease-out opacity-100 scale-100 pointer-events-auto z-10`}
          >
            <ScreenComponent />
          </div>
        );
      })}
    </div>
  );
}

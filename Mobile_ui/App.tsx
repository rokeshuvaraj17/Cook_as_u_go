import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PantryScreen from './src/screens/PantryScreen';
import BillsScreen from './src/screens/BillsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ItemsToBuyScreen from './src/screens/ItemsToBuyScreen';
import SignupScreen from './src/screens/SignupScreen';
import type { AuthResponse } from './src/services/api';

type Flow = 'login' | 'signup' | 'home';
type HomeTab = 'main' | 'pantry' | 'bills' | 'reports' | 'buy';

export default function App() {
  const [flow, setFlow] = useState<Flow>('login');
  const [homeTab, setHomeTab] = useState<HomeTab>('main');
  /** Bump when opening pantry so the screen remounts and always refetches from the API. */
  const [pantryMountKey, setPantryMountKey] = useState(0);
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [loginPrefillEmail, setLoginPrefillEmail] = useState('');

  const handleSignedIn = useCallback((s: AuthResponse) => {
    setSession(s);
    setHomeTab('main');
    setFlow('home');
    setLoginSuccessMessage(null);
    setLoginPrefillEmail('');
  }, []);

  const handleRegistered = useCallback((email: string) => {
    setLoginSuccessMessage('Account created. Please sign in.');
    setLoginPrefillEmail(email);
    setFlow('login');
  }, []);

  const handleSignOut = useCallback(() => {
    setSession(null);
    setHomeTab('main');
    setLoginPrefillEmail('');
    setLoginSuccessMessage(null);
    setFlow('login');
  }, []);

  const goSignup = useCallback(() => {
    setLoginSuccessMessage(null);
    setLoginPrefillEmail('');
    setFlow('signup');
  }, []);

  const consumeLoginSuccessMessage = useCallback(() => setLoginSuccessMessage(null), []);

  const openBills = useCallback(() => {
    setHomeTab('bills');
  }, []);

  useEffect(() => {
    const onHardwareBack = () => {
      if (flow === 'signup') {
        setFlow('login');
        return true;
      }
      if (flow !== 'home') {
        return false;
      }
      if (homeTab === 'reports') {
        setHomeTab('bills');
        return true;
      }
      if (homeTab === 'pantry' || homeTab === 'bills' || homeTab === 'buy') {
        setHomeTab('main');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [flow, homeTab]);

  return (
    <SafeAreaProvider>
      <ExpoStatusBar style="dark" />
      {flow === 'login' && (
        <LoginScreen
          onSignedIn={handleSignedIn}
          onGoSignup={goSignup}
          successMessage={loginSuccessMessage}
          initialEmail={loginPrefillEmail}
          onConsumeSuccessMessage={consumeLoginSuccessMessage}
        />
      )}
      {flow === 'signup' && (
        <SignupScreen onRegistered={handleRegistered} onGoLogin={() => setFlow('login')} />
      )}
      {flow === 'home' && session && homeTab === 'main' && (
        <HomeScreen
          session={session}
          onSignOut={handleSignOut}
          onOpenBills={openBills}
          onOpenBuyList={() => setHomeTab('buy')}
          onOpenPantry={() => {
            setPantryMountKey((k) => k + 1);
            setHomeTab('pantry');
          }}
        />
      )}
      {flow === 'home' && session && homeTab === 'pantry' && (
        <PantryScreen
          key={pantryMountKey}
          onBack={() => setHomeTab('main')}
          authToken={session.token}
        />
      )}
      {flow === 'home' && session && homeTab === 'bills' && (
        <BillsScreen
          authToken={session.token}
          onBack={() => setHomeTab('main')}
          onOpenReport={() => setHomeTab('reports')}
        />
      )}
      {flow === 'home' && session && homeTab === 'reports' && (
        <ReportsScreen authToken={session.token} onBack={() => setHomeTab('bills')} />
      )}
      {flow === 'home' && session && homeTab === 'buy' && (
        <ItemsToBuyScreen authToken={session.token} onBack={() => setHomeTab('main')} />
      )}
    </SafeAreaProvider>
  );
}

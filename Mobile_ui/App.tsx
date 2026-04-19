import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PantryScreen from './src/screens/PantryScreen';
import BillsScreen from './src/screens/BillsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ItemsToBuyScreen from './src/screens/ItemsToBuyScreen';
import SignupScreen from './src/screens/SignupScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ApiSettingsScreen from './src/screens/ApiSettingsScreen';
import { colors } from './src/theme/colors';
import { radius, space } from './src/theme/spacing';
import { initializeApiRuntimeOverrides, type AuthResponse } from './src/services/api';

type Flow = 'login' | 'signup' | 'home';
type HomeTab = 'main' | 'pantry' | 'bills' | 'reports' | 'buy' | 'changePassword' | 'apiSettings';

type RootErrState = { err: Error | null };

class CookRootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrState> {
  state: RootErrState = { err: null };

  static getDerivedStateFromError(err: Error): RootErrState {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[Cook] render error', err?.message, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFF5EC' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1714' }}>Could not load the app</Text>
          <Text style={{ marginTop: 12, fontSize: 14, color: '#4F4842' }}>
            Check the Metro terminal, then reload (shake device → Reload).
          </Text>
          <Text selectable style={{ marginTop: 16, fontSize: 12, color: '#7D756C' }}>
            {this.state.err.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [flow, setFlow] = useState<Flow>('login');
  const [homeTab, setHomeTab] = useState<HomeTab>('main');
  /** Bump when opening pantry so the screen remounts and always refetches from the API. */
  const [pantryMountKey, setPantryMountKey] = useState(0);
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [loginPrefillEmail, setLoginPrefillEmail] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    void initializeApiRuntimeOverrides();
  }, []);

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
    setDrawerOpen(false);
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
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (homeTab === 'reports') {
        setHomeTab('bills');
        return true;
      }
      if (homeTab === 'changePassword' || homeTab === 'apiSettings') {
        setHomeTab('main');
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
  }, [drawerOpen, flow, homeTab]);

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
          onOpenDrawer={() => setDrawerOpen(true)}
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
      {flow === 'home' && session && homeTab === 'changePassword' && (
        <ChangePasswordScreen authToken={session.token} onBack={() => setHomeTab('main')} />
      )}
      {flow === 'home' && session && homeTab === 'apiSettings' && (
        <ApiSettingsScreen authToken={session.token} onBack={() => setHomeTab('main')} />
      )}
      {flow === 'home' && session && drawerOpen && (
        <View style={styles.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawerPanel}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <Pressable
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                setHomeTab('changePassword');
              }}
            >
              <Text style={styles.drawerItemText}>Change password</Text>
            </Pressable>
            <Pressable
              style={styles.drawerItem}
              onPress={() => {
                setDrawerOpen(false);
                setHomeTab('apiSettings');
              }}
            >
              <Text style={styles.drawerItemText}>API settings</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <CookRootErrorBoundary>
      <AppInner />
    </CookRootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayScrim,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawerPanel: {
    width: 270,
    height: '100%',
    backgroundColor: colors.canvas,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 70,
    paddingHorizontal: space.lg,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: space.lg,
  },
  drawerItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.surfaceInput,
  },
  drawerItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});

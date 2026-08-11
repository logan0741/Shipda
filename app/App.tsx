import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import { FlowProvider } from './src/state/FlowContext';
import { SettingsProvider } from './src/state/SettingsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FlowProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </FlowProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

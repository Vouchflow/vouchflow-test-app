import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarnessScreen } from './src/screens/HarnessScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0B0E" />
      <HarnessScreen />
    </SafeAreaProvider>
  );
}

export default App;

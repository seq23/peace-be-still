import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { configureRevenueCat } from '../src/billing/revenuecat';
export default function Layout() { useEffect(() => { void configureRevenueCat().catch(error => console.warn('RevenueCat initialization failed', error)); }, []); return <Stack screenOptions={{ headerShown: false }} />; }

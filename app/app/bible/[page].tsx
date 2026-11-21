import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { BibleRoute } from '../../src/screens/bible/route';

export default function BiblePage() {
  const { page, book, chapter, verse } = useLocalSearchParams<{ page: string; book?: string; chapter?: string; verse?: string }>();
  if (page !== 'chapter' && page !== 'books' && page !== 'search' && page !== 'saved') return <Redirect href="/bible" />;
  return <BibleRoute nested page={page} book={book} chapter={chapter} verse={verse} />;
}

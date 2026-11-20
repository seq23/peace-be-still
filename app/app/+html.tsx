// The web preview's HTML shell. The page is linen (or night, in dark mode) before the app draws, so a slow
// phone never shows a white flash.
import { ScrollViewStyleReset } from 'expo-router/html';
import React, { type PropsWithChildren } from 'react';

const background = `body{background:#F4F0E6}@media (prefers-color-scheme:dark){body{background:#0E1A22}}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#F4F0E6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0E1A22" media="(prefers-color-scheme: dark)" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: background }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

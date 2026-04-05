import './globals.css';

export const metadata = {
  title: 'Booking Platform Admin',
  description: 'Admin interface for the booking platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/css/tabler.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

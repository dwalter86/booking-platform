import './globals.css';
import '@tabler/core/dist/css/tabler.min.css';

export const metadata = {
  title: 'Booking Platform Admin',
  description: 'Admin interface for the booking platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

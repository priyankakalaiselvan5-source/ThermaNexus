import { AuthGuard } from '@/components/layout/auth-guard';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { DataProvider } from '@/hooks/use-data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DataProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </DataProvider>
    </AuthGuard>
  );
}

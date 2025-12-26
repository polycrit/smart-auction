import { AdminLayoutWrapper } from '@/components/AdminLayoutWrapper';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}

'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import LayoutContent from './LayoutContent';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';

function AuthenticatedLayout({ children }) {
    const { collapsed } = useSidebar();

    return (
        <>
            <Sidebar />
            <main className={`min-h-screen transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
                <LayoutContent>{children}</LayoutContent>
            </main>
        </>
    );
}

export default function ConditionalLayout({ children }) {
    const pathname = usePathname();

    // Páginas públicas (sin sidebar)
    const publicPages = ['/', '/login'];
    const isPublicPage = publicPages.includes(pathname);

    if (isPublicPage) {
        // Sin sidebar para landing y login
        return <LayoutContent>{children}</LayoutContent>;
    }

    // Con sidebar para páginas autenticadas
    return (
        <SidebarProvider>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </SidebarProvider>
    );
}

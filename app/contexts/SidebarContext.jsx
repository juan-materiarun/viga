'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext({
    collapsed: false,
    toggleSidebar: () => { },
    setCollapsed: () => { }
});

export function SidebarProvider({ children }) {
    const [collapsed, setCollapsed] = useState(false);

    // Opcional: Persistir preferencia
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState) {
            setCollapsed(JSON.parse(savedState));
        }
    }, []);

    const toggleSidebar = () => {
        setCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
            return newState;
        });
    };

    return (
        <SidebarContext.Provider value={{ collapsed, toggleSidebar, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return useContext(SidebarContext);
}

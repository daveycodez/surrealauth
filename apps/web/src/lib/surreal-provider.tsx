import { Surreal } from "surrealdb";
import { useMutation } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";

export const db = new Surreal();

interface SurrealProviderProps {
    children: React.ReactNode;
    endpoint: string;
    client?: Surreal;
    params?: Parameters<Surreal["connect"]>[1];
    autoConnect?: boolean;
}

interface SurrealProviderState {
    client: Surreal;
    isConnecting: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
    connect: () => Promise<true>;
    close: () => Promise<true>;
}

const SurrealContext = createContext<SurrealProviderState | undefined>(undefined);

export function SurrealProvider({
    children,
    client,
    endpoint,
    params,
    autoConnect = true,
}: SurrealProviderProps) {
    const [instance] = useState(() => client ?? new Surreal());

    const {
        mutateAsync: connectMutation,
        isPending,
        isSuccess,
        isError,
        error,
        reset,
    } = useMutation({
        mutationFn: () => instance.connect(endpoint, params),
    });

    const connect = useCallback(() => connectMutation(), [connectMutation]);
    const close = useCallback(() => instance.close(), [instance]);

    useEffect(() => {
        if (autoConnect) connect();

        return () => {
            reset();
            instance.close();
        };
    }, [autoConnect, connect, reset, instance]);

    const value: SurrealProviderState = useMemo(
        () => ({ client: instance, isConnecting: isPending, isSuccess, isError, error, connect, close }),
        [instance, isPending, isSuccess, isError, error, connect, close],
    );

    return <SurrealContext.Provider value={value}>{children}</SurrealContext.Provider>;
}

export function useSurreal() {
    const context = useContext(SurrealContext);
    if (!context) throw new Error("useSurreal must be used within a SurrealProvider");
    return context;
}

export function useSurrealClient() {
    return useSurreal().client;
}

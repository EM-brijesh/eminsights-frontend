"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
    const [loadings, setLoadings] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = await res.json();

                if (!data.success) {
                    router.push("/");
                } else {
                    setUser(data.user);
                    setLoadings(false);
                }
            } catch (err) {
                router.push("/");
            }
        }

        checkAuth();
    }, [router]);

    return { user, loadings };
}

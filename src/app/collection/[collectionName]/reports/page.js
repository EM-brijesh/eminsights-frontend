'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Report from '@/components/Report'; // We'll create this!
import DottedBackground from "@/components/DottedBackground";

export default function ReportsPage() {
    const { collectionName } = useParams();
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchRawData() {
            try {
                const res = await fetch(`/api/collections/${collectionName}/analysis`);
                if (!res.ok) {
                    throw new Error(`An error occurred: ${res.status}`);
                }
                const data = await res.json();
                setRawData(data || null);
            } catch (err) {
                console.error('Error fetching raw data:', err);
                setError('Error loading raw data');
            } finally {
                setLoading(false);
            }
        }

        fetchRawData();
    }, [collectionName]);

    if (loading) return <div className="p-6 text-white">Loading...</div>;
    if (error) return <div className="p-6 text-white">{error}</div>;
    if (!rawData) return <div className="p-6 text-white">No raw data available.</div>;

    return (
        <div className="p-6 bg-gray-950 text-white min-h-screen space-y-10 relative">
            <DottedBackground />
            <div className="relative z-10">
            <h1 className="text-3xl font-bold text-sky-400">
                📊 Analysis Report for: <span className="capitalize">{collectionName}</span>
            </h1>

            {/* --- Fancy Report Rendering --- */}
            {rawData.analysis ? (
                <Report analysis={rawData.analysis} collectionName={collectionName} />
            ) : (
                <div>No analysis available for this collection.</div>
            )}
            </div>
        </div>
    );
}

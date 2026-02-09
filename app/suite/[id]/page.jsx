'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '../../contexts/ThemeContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, Shield, Zap, AlertTriangle } from 'lucide-react';
import JourneyStoryboard from '../../components/JourneyStoryboard';
import Loader from '../../components/Loader';
import Button from '../../components/Button';
import LogViewer from '../../components/LogViewer';
import StepsList from '../../components/StepsList';

export default function SuiteDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { theme } = useTheme();

    const [suite, setSuite] = useState(null);
    const [journeys, setJourneys] = useState([]);
    const [steps, setSteps] = useState([]); // New state for Chaos Steps
    const [loading, setLoading] = useState(true);
    const [selectedJourneyId, setSelectedJourneyId] = useState(null);

    useEffect(() => {
        if (id) fetchSuiteData();

        // Realtime Subscription for Steps
        const channel = supabase
            .channel('realtime-steps')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'test_steps',
                filter: `suite_id=eq.${id}`
            }, (payload) => {
                setSteps(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const fetchSuiteData = async () => {
        try {
            // 1. Fetch Suite
            const { data: s } = await supabase.from('test_suites').select('*').eq('id', id).single();
            setSuite(s);

            // 2. Fetch Journeys (Atlas Cases)
            const { data: j } = await supabase
                .from('test_journeys')
                .select('*')
                .eq('suite_id', id)
                .order('created_at', { ascending: false });
            setJourneys(j || []);

            // 3. Fetch Steps (Chaos)
            const { data: st } = await supabase
                .from('test_steps')
                .select('*')
                .eq('suite_id', id)
                .order('created_at', { ascending: false }); // Newest first
            setSteps(st || []);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };


    if (loading) return <div className="min-h-screen bg-[var(--bg-primary)]"><Loader fullScreen /></div>;
    if (!suite) return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Suite not found</div>;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-[var(--text-secondary)]" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{suite.name}</h1>
                        <p className="text-[var(--text-secondary)] font-mono text-sm mt-1">{suite.base_url}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${suite.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                            suite.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' : 'bg-gray-500/10 text-gray-500'
                            }`}>
                            {suite.status}
                        </span>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Summary / Stats */}
                    <div className="space-y-6">
                        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <Shield className="text-[var(--accent-primary)]" size={20} />
                                Coverage Report
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Total Cases Generated</span>
                                    <span className="font-bold text-[var(--text-primary)]">{journeys.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Verified (Pass)</span>
                                    <span className="font-bold text-green-500">{journeys.filter(j => j.status === 'verified').length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Failed (Bugs)</span>
                                    <span className="font-bold text-red-500">{journeys.filter(j => j.status === 'failed').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Journey List & Logs */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Live Logs */}
                        <LogViewer logs={[]} className="h-[400px]" />

                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Generated E2E Cases</h2>

                        {journeys.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)]">
                                No test cases generated yet. Waiting for Atlas...
                            </div>
                        ) : (
                            journeys.map(journey => (
                                <div
                                    key={journey.id}
                                    onClick={() => setSelectedJourneyId(journey.id)}
                                    className="group bg-[var(--card-bg)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] rounded-xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {journey.is_happy_path && <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Happy Path</span>}
                                                {journey.is_edge_case && <span className="bg-purple-500/10 text-purple-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Edge Case</span>}
                                                {journey.risk_score > 70 && <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">High Risk</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                                                {journey.name}
                                            </h3>
                                        </div>
                                        <div>
                                            {journey.status === 'verified' && <CheckCircle className="text-green-500" />}
                                            {journey.status === 'failed' && <XCircle className="text-red-500" />}
                                            {journey.status === 'proposed' && <Clock className="text-[var(--text-muted)]" />}
                                        </div>
                                    </div>

                                    <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                        {journey.intent}
                                    </p>

                                    <div className="flex items-center gap-6 text-xs text-[var(--text-muted)] font-mono border-t border-[var(--border-color)] pt-3">
                                        <span className="flex items-center gap-1">
                                            <Zap size={14} /> {journey.step_count} Steps
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} /> {new Date(journey.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Storyboard Modal */}
            {selectedJourneyId && (
                <JourneyStoryboard
                    journeyId={selectedJourneyId}
                    onClose={() => setSelectedJourneyId(null)}
                />
            )}
        </div>
    );
}

'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useSearchParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function MasterMonitor() {
  const [logs, setLogs] = useState<any[]>([])
  const searchParams = useSearchParams()
  const suiteIdFilter = searchParams.get('suiteId') // Captura el ID de la URL si existe
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Limpiar logs si cambia el filtro
    setLogs([])

    // 1. Cargar historial (con o sin filtro)
    const fetchLogs = async () => {
      let query = supabase.from('agent_logs').select('*').order('created_at', { ascending: true }).limit(100)
      
      if (suiteIdFilter) {
        query = query.eq('suite_id', suiteIdFilter)
      }

      const { data } = await query
      if (data) setLogs(data)
    }
    fetchLogs()

    // 2. Realtime con Filtro Dinámico
    const channel = supabase.channel('viga-telemetry')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'agent_logs',
          // Si hay suiteIdFilter, Supabase solo nos manda esos. Si no, manda todo.
          filter: suiteIdFilter ? `suite_id=eq.${suiteIdFilter}` : undefined 
        }, 
        (payload) => {
          setLogs((prev) => [...prev, payload.new].slice(-200))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [suiteIdFilter])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-mono text-[11px] md:text-xs">
      {/* Top Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-emerald-500 font-bold tracking-tighter text-lg">VIGA_MONITOR</span>
          <div className="px-2 py-1 bg-zinc-800 rounded text-zinc-500 border border-zinc-700">
            MODO: {suiteIdFilter ? `FILTRADO [${suiteIdFilter.slice(0,8)}]` : 'GLOBAL FEED'}
          </div>
        </div>
        {suiteIdFilter && (
          <button onClick={() => window.location.href = '/monitor'} className="text-zinc-500 hover:text-white underline">
            Limpiar Filtro (Ver Todo)
          </button>
        )}
      </div>

      {/* Logs Container */}
      <div className="p-4 space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 hover:bg-zinc-900/50 py-0.5 rounded transition-colors group">
            <span className="text-zinc-700 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
            {!suiteIdFilter && (
              <span className="text-zinc-600 shrink-0 font-bold">[{log.suite_id.slice(0,4)}]</span>
            )}
            <span className={`
              ${log.level === 'error' ? 'text-red-500' : ''}
              ${log.level === 'success' ? 'text-emerald-500' : ''}
              ${log.level === 'warning' ? 'text-amber-500' : ''}
              ${log.level === 'info' ? 'text-zinc-300' : ''}
            `}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </div>
  )
}
# 🚨 Acción Requerida: Actualización de Base de Datos

El worker falló porque falta una columna nueva (`action_category`) en la tabla `ui_actions`.

Por favor, ejecuta el siguiente SQL en tu **Supabase SQL Editor**:

```sql
ALTER TABLE ui_actions
ADD COLUMN IF NOT EXISTS action_category TEXT DEFAULT 'STANDARD';

CREATE INDEX IF NOT EXISTS idx_ui_actions_category ON ui_actions(action_category);
```

### Pasos:
1. Ve a tu proyecto en Supabase.
2. Abre el **SQL Editor**.
3. Pega el código de arriba.
4. Dale a **Run**.
5. Reinicia el worker.

El archivo SQL también está guardado en:
`supabase/migrations/20260207_add_action_category.sql`

### Adicional: Tabla para Snapshots V3
También es necesario crear una tabla nueva para que el worker guarde su memoria de elementos:

```sql
CREATE TABLE IF NOT EXISTS discovered_elements_snapshot (
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    state_hash TEXT NOT NULL,
    action_id UUID REFERENCES ui_actions(id) ON DELETE CASCADE,
    selector TEXT NOT NULL,
    canonical_name TEXT,
    was_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (suite_id, state_hash, action_id)
);

ALTER TABLE discovered_elements_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON discovered_elements_snapshot
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
```

Guarda y corre esto también. ¡Gracias!

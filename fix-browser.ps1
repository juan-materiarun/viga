# Script para agregar browser.close() a los 3 agentes

$file = "c:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA\app\actions\agents.ts"
$content = Get-Content $file -Raw

# Patrón para encontrar los finally blocks
$pattern = '(\s+\} finally \{\r?\n\s+await page\.close\(\)\r?\n\s+\}\r?\n\})'

# Reemplazo con browser.close()
$replacement = '$1
    if (process.env.VERCEL || process.env.BROWSERLESS_URL) {
      await browser.close().catch(() => { })
    }
  }
}'

# Hacer el reemplazo
$newContent = $content -replace $pattern, $replacement

# Guardar
$newContent | Set-Content $file -NoNewline

Write-Host "✅ browser.close() agregado a los agentes"

$file = "c:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA\worker\src\agents\chaos.ts"
$content = Get-Content $file -Raw

# Traducción masiva
$translations = @{
    "Analyzing screen..." = "Analizando pantalla..."
    "Selected:" = "Seleccionado:"
    "Element not found at index:" = "Elemento no encontrado en índice:"
    "Retrying next step..." = "Reintentando siguiente paso..."
    "Execution failed:" = "Ejecución fallida:"
    "Observation:" = "Observación:"
    "Exploration complete:" = "Exploración completada:"
    "Triggering Atlas for Story Synthesis..." = "Activando Atlas para síntesis de historias..."
    "Fatal error:" = "Error fatal:"
    "steps" = "pasos"
    "Depth:" = "Profundidad:"
    "Novelty:" = "Novedad:"
}

foreach ($key in $translations.Keys) {
    $content = $content -replace [regex]::Escape($key), $translations[$key]
}

Set-Content $file $content -Encoding UTF8
Write-Host "✅ Traducción aplicada" -ForegroundColor Green

param(
  [string]$SourceDeck = "deliverables\HomeFlow_Dragons_Den_Pitch_5000_Ask.pptx",
  [string]$OutputVideo = "public\homeflow-overview-natural.mp4",
  [string]$OutputCaptions = "public\homeflow-overview-natural.vtt",
  [string]$PythonExecutable = "python",
  [string]$NarrationVoice = "en-GB-SoniaNeural"
)

$ErrorActionPreference = "Stop"

function Format-VttTime {
  param([double]$Seconds)
  $time = [TimeSpan]::FromSeconds($Seconds)
  return "{0:00}:{1:00}:{2:00}.{3:000}" -f [Math]::Floor($time.TotalHours), $time.Minutes, $time.Seconds, $time.Milliseconds
}

$narrations = @(
  "HomeFlow is a discharge coordination prototype. It helps the patient, the ward team and the family prepare for discharge together. Every person and identifier shown in this video is fictional demonstration data.",
  "A patient may be clinically ready and still wait. Medication, transport, equipment or family collection can remain unresolved. HomeFlow brings the main barrier, its owner, the target time and family readiness into one clear ward view.",
  "Staff can open a patient's journey and see what will unlock discharge next. Pharmacy progress, escalation, community handover and family updates sit alongside a time stamped accountability trail, so the next action stays visible without adding repeated documentation.",
  "Families receive one clear update with the likely collection time and notice that a short delay may still occur. They can confirm collection, request support or ask for contact. The ward sees the response immediately in the prototype.",
  "A separate privacy safe ward display shows expected discharges, barriers, owners, deadlines and family readiness at a glance. It avoids full names and uses fictional bed numbers and demo identifiers suitable for presentation.",
  "The proposed next step is a small pilot on one ward for eight to twelve weeks. The request is five thousand pounds for configuration, staff testing, evaluation and governance support, using existing Trust capability wherever possible."
)

$captions = @(
  "HomeFlow connects discharge readiness, ward visibility and family preparation.",
  "One view shows the barrier, owner, target time and family readiness.",
  "The patient journey keeps the next action and accountability trail visible.",
  "Families can confirm collection, request support or ask for contact.",
  "The privacy-safe ward display gives the team a shared live view.",
  "A £5,000 one-ward pilot would test value before any larger investment."
)

$root = (Resolve-Path ".").Path
$sourcePath = (Resolve-Path $SourceDeck).Path
$videoPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputVideo))
$captionsPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputCaptions))
$workDir = Join-Path $root ".codex-tmp\homeflow-video"
$timedDeckPath = Join-Path $workDir "HomeFlow_90_Second_Video_Source.pptx"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($videoPath)) | Out-Null

$edgeTtsModulePath = Join-Path $root ".codex-tmp\pydeps"
if (-not (Test-Path (Join-Path $edgeTtsModulePath "edge_tts"))) {
  throw "edge-tts is not installed in $edgeTtsModulePath. Install it before rendering the neural voice-over."
}
$previousPythonPath = $env:PYTHONPATH
$env:PYTHONPATH = $edgeTtsModulePath
$audioPath = Join-Path $workDir "homeflow-neural-narration.mp3"
if (Test-Path $audioPath) { Remove-Item -LiteralPath $audioPath -Force }
$fullNarration = $narrations -join " ... "
$narrationCreated = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  & $PythonExecutable -m edge_tts --voice $NarrationVoice --rate=-8% --text $fullNarration --write-media $audioPath
  if ($LASTEXITCODE -eq 0 -and (Test-Path $audioPath) -and (Get-Item $audioPath).Length -gt 0) {
    $narrationCreated = $true
    break
  }
  if (Test-Path $audioPath) { Remove-Item -LiteralPath $audioPath -Force }
  Start-Sleep -Seconds (3 * $attempt)
}
if (-not $narrationCreated) {
  throw "Neural narration failed after three attempts."
}
$env:PYTHONPATH = $previousPythonPath

$powerPoint = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  $presentation = $powerPoint.Presentations.Open($sourcePath, $false, $false, $false)
  # The former integration slide referenced an earlier architecture assumption. It is omitted from the short film.
  $presentation.Slides.Item(4).Delete()

  $audio = $presentation.Slides.Item(1).Shapes.AddMediaObject2($audioPath, 0, -1, -100, -100, 1, 1)
  $audio.Name = "HomeFlow neural narration"
  $audio.AnimationSettings.Animate = -1
  $audio.AnimationSettings.PlaySettings.PlayOnEntry = -1
  $audio.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
  $audio.AnimationSettings.PlaySettings.StopAfterSlides = $presentation.Slides.Count
  $narrationDuration = [Math]::Round($audio.MediaFormat.Length / 1000, 2)
  $wordCounts = @($narrations | ForEach-Object { ($_ -split '\s+' | Where-Object { $_ }).Count })
  $totalWords = ($wordCounts | Measure-Object -Sum).Sum
  $durations = @($wordCounts | ForEach-Object { [Math]::Round(($narrationDuration * $_ / $totalWords), 2) })
  $durations[$durations.Count - 1] += 1.0

  for ($index = 0; $index -lt $presentation.Slides.Count; $index++) {
    $slide = $presentation.Slides.Item($index + 1)
    $transition = $slide.SlideShowTransition
    $transition.AdvanceOnClick = 0
    $transition.AdvanceOnTime = -1
    $transition.AdvanceTime = [Math]::Max(7, $durations[$index])
  }

  $vtt = New-Object System.Collections.Generic.List[string]
  $vtt.Add("WEBVTT")
  $vtt.Add("")
  $cursor = 0.0
  for ($index = 0; $index -lt $captions.Count; $index++) {
    $start = $cursor
    $end = $cursor + $durations[$index]
    $vtt.Add("$($index + 1)")
    $vtt.Add("$(Format-VttTime $start) --> $(Format-VttTime $end)")
    $vtt.Add($captions[$index])
    $vtt.Add("")
    $cursor = $end
  }
  [System.IO.File]::WriteAllLines($captionsPath, $vtt, [System.Text.UTF8Encoding]::new($false))

  if (Test-Path $timedDeckPath) { Remove-Item -LiteralPath $timedDeckPath -Force }
  if (Test-Path $videoPath) { Remove-Item -LiteralPath $videoPath -Force }
  $presentation.SaveAs($timedDeckPath)
  $presentation.CreateVideo($videoPath, $true, 5, 1080, 30, 85)

  $deadline = (Get-Date).AddMinutes(15)
  while ((Get-Date) -lt $deadline) {
    $status = $presentation.CreateVideoStatus
    if ($status -eq 3) { break }
    if ($status -eq 4) { throw "PowerPoint failed to create the HomeFlow video." }
    Start-Sleep -Seconds 5
  }
  if ($presentation.CreateVideoStatus -ne 3 -or -not (Test-Path $videoPath)) {
    throw "Timed out while creating the HomeFlow video."
  }
} finally {
  if ($presentation) { $presentation.Close() }
  $powerPoint.Quit()
  if ($presentation) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

[PSCustomObject]@{
  video = $videoPath
  captions = $captionsPath
  durationSeconds = [Math]::Round(($durations | Measure-Object -Sum).Sum, 1)
  bytes = (Get-Item $videoPath).Length
} | ConvertTo-Json -Compress

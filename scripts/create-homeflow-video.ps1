param(
  [string]$SourceDeck = "deliverables\HomeFlow_Dragons_Den_Pitch_5000_Ask.pptx",
  [string]$OutputVideo = "public\homeflow-overview-geordie.mp4",
  [string]$OutputCaptions = "public\homeflow-overview-geordie.vtt",
  [string]$PythonExecutable = "python",
  [string]$NarrationVoice = "en-GB-RyanNeural"
)

$ErrorActionPreference = "Stop"

function Format-VttTime {
  param([double]$Seconds)
  $time = [TimeSpan]::FromSeconds($Seconds)
  return "{0:00}:{1:00}:{2:00}.{3:000}" -f [Math]::Floor($time.TotalHours), $time.Minutes, $time.Seconds, $time.Milliseconds
}

function ConvertTo-OfficeRgb {
  param([int]$Red, [int]$Green, [int]$Blue)
  return $Red + (256 * $Green) + (65536 * $Blue)
}

function Export-FeatureCrop {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][int]$X,
    [Parameter(Mandatory = $true)][int]$Y,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height
  )

  Add-Type -AssemblyName System.Drawing
  $sourceBitmap = [System.Drawing.Bitmap]::new($Source)
  try {
    $rectangle = [System.Drawing.Rectangle]::new($X, $Y, $Width, $Height)
    $crop = $sourceBitmap.Clone($rectangle, $sourceBitmap.PixelFormat)
    try {
      $crop.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $crop.Dispose()
    }
  } finally {
    $sourceBitmap.Dispose()
  }
}

function Add-FeatureFocusSlide {
  param(
    [Parameter(Mandatory = $true)]$Presentation,
    [Parameter(Mandatory = $true)][int]$AfterSlide,
    [Parameter(Mandatory = $true)][string]$ImagePath,
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Subtitle
  )

  $slide = $Presentation.Slides.Add($AfterSlide + 1, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.Solid()
  $slide.Background.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 7 29 49

  $eyebrow = $slide.Shapes.AddTextbox(1, 42, 24, 470, 20)
  $eyebrow.TextFrame.TextRange.Text = "FEATURE CLOSE-UP · HOMEFLOW PROTOTYPE"
  $eyebrow.TextFrame.TextRange.Font.Name = "Aptos"
  $eyebrow.TextFrame.TextRange.Font.Size = 10
  $eyebrow.TextFrame.TextRange.Font.Bold = -1
  $eyebrow.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 45 212 191

  $heading = $slide.Shapes.AddTextbox(1, 42, 46, 700, 38)
  $heading.TextFrame.TextRange.Text = $Title
  $heading.TextFrame.TextRange.Font.Name = "Aptos Display"
  $heading.TextFrame.TextRange.Font.Size = 24
  $heading.TextFrame.TextRange.Font.Bold = -1
  $heading.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 255 255 255

  $subheading = $slide.Shapes.AddTextbox(1, 42, 82, 830, 24)
  $subheading.TextFrame.TextRange.Text = $Subtitle
  $subheading.TextFrame.TextRange.Font.Name = "Aptos"
  $subheading.TextFrame.TextRange.Font.Size = 12
  $subheading.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 194 214 228

  $frame = $slide.Shapes.AddShape(5, 37, 115, 886, 374)
  $frame.Fill.Solid()
  $frame.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 255 255
  $frame.Line.ForeColor.RGB = ConvertTo-OfficeRgb 45 212 191
  $frame.Line.Weight = 3

  $picture = $slide.Shapes.AddPicture($ImagePath, 0, -1, 43, 121, 874, 362)
  $zoomEffect = $slide.TimeLine.MainSequence.AddEffect($picture, 23, 0, 2)
  $zoomEffect.Timing.Duration = 1.0

  $badge = $slide.Shapes.AddShape(5, 726, 25, 190, 22)
  $badge.Fill.Solid()
  $badge.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 247 214
  $badge.Line.Visible = 0
  $badge.TextFrame.TextRange.Text = "DEMONSTRATION DATA ONLY"
  $badge.TextFrame.TextRange.Font.Name = "Aptos"
  $badge.TextFrame.TextRange.Font.Size = 8
  $badge.TextFrame.TextRange.Font.Bold = -1
  $badge.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 103 76 0
  $badge.TextFrame.TextRange.ParagraphFormat.Alignment = 2

  $footer = $slide.Shapes.AddTextbox(1, 42, 503, 870, 16)
  $footer.TextFrame.TextRange.Text = "HomeFlow · Fictional patients and identifiers · No live Trust connection"
  $footer.TextFrame.TextRange.Font.Name = "Aptos"
  $footer.TextFrame.TextRange.Font.Size = 8
  $footer.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 148 177 197
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
$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if ($PythonExecutable -eq "python" -and (Test-Path $bundledPython)) {
  $PythonExecutable = $bundledPython
}
$sourcePath = (Resolve-Path $SourceDeck).Path
$videoPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputVideo))
$captionsPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputCaptions))
$workDir = Join-Path $root ".codex-tmp\homeflow-video"
$timedDeckPath = Join-Path $workDir "HomeFlow_90_Second_Video_Source.pptx"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($videoPath)) | Out-Null

$focusSpecs = @(
  @{ File = "01-executive-dashboard.png"; X = 230; Y = 110; Width = 1180; Height = 664; Title = "One clear operational picture"; Subtitle = "Readiness, barriers and family preparation appear together." },
  @{ File = "02-ward-discharge-board.png"; X = 230; Y = 350; Width = 1180; Height = 664; Title = "Barrier, owner and target time"; Subtitle = "The next action is visible to the whole ward team." },
  @{ File = "03-patient-discharge-journey.png"; X = 230; Y = 370; Width = 1180; Height = 664; Title = "What will unlock this discharge?"; Subtitle = "The journey shows the next step and who is accountable." },
  @{ File = "04-family-communication.png"; X = 230; Y = 360; Width = 1180; Height = 664; Title = "One clear family update"; Subtitle = "Collection, support and contact responses return to the ward." },
  @{ File = "06-ward-display.png"; X = 40; Y = 140; Width = 1360; Height = 765; Title = "Privacy-safe ward display"; Subtitle = "Expected discharges, risk, ownership and readiness at a glance." },
  @{ File = "10-dragons-den-pilot.png"; X = 230; Y = 370; Width = 1180; Height = 664; Title = "A small, measurable first step"; Subtitle = "One ward · 8–12 weeks · £5,000." }
)
$focusImages = @()
for ($index = 0; $index -lt $focusSpecs.Count; $index++) {
  $spec = $focusSpecs[$index]
  $sourceImage = Join-Path $root ("screenshots\homeflow\" + $spec.File)
  $focusImage = Join-Path $workDir ("focus-{0:00}.png" -f ($index + 1))
  Export-FeatureCrop -Source $sourceImage -Destination $focusImage -X $spec.X -Y $spec.Y -Width $spec.Width -Height $spec.Height
  $focusImages += $focusImage
}

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
  & $PythonExecutable -m edge_tts --voice $NarrationVoice --rate=-6% --pitch=-4Hz --text $fullNarration --write-media $audioPath
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

  # Insert a feature close-up after every overview slide. Working backwards preserves the intended order.
  for ($index = $focusSpecs.Count - 1; $index -ge 0; $index--) {
    $spec = $focusSpecs[$index]
    Add-FeatureFocusSlide -Presentation $presentation -AfterSlide ($index + 1) -ImagePath $focusImages[$index] -Title $spec.Title -Subtitle $spec.Subtitle
  }

  $audio = $presentation.Slides.Item(1).Shapes.AddMediaObject2($audioPath, 0, -1, -100, -100, 1, 1)
  $audio.Name = "HomeFlow neural narration"
  $audio.AnimationSettings.Animate = -1
  $audio.AnimationSettings.PlaySettings.PlayOnEntry = -1
  $audio.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
  $audio.AnimationSettings.PlaySettings.StopAfterSlides = $presentation.Slides.Count
  $narrationDuration = [Math]::Round($audio.MediaFormat.Length / 1000, 2)
  $wordCounts = @($narrations | ForEach-Object { ($_ -split '\s+' | Where-Object { $_ }).Count })
  $totalWords = ($wordCounts | Measure-Object -Sum).Sum
  $sceneDurations = @($wordCounts | ForEach-Object { [Math]::Round(($narrationDuration * $_ / $totalWords), 2) })
  $sceneDurations[$sceneDurations.Count - 1] += 1.0
  $durations = @()
  foreach ($sceneDuration in $sceneDurations) {
    $overviewDuration = [Math]::Min(4.5, [Math]::Max(3.5, $sceneDuration * 0.32))
    $durations += $overviewDuration
    $durations += [Math]::Max(6.0, $sceneDuration - $overviewDuration)
  }

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
    $end = $cursor + $sceneDurations[$index]
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
  durationSeconds = [Math]::Round(($sceneDurations | Measure-Object -Sum).Sum, 1)
  bytes = (Get-Item $videoPath).Length
} | ConvertTo-Json -Compress

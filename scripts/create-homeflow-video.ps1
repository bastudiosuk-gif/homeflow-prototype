param(
  [string]$OutputVideo = "public\homeflow-patient-journey.mp4",
  [string]$OutputCaptions = "public\homeflow-patient-journey.vtt",
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

function Export-ScreenCrop {
  param([string]$Source, [string]$Destination, [int]$Top)
  Add-Type -AssemblyName System.Drawing
  $sourceBitmap = [System.Drawing.Bitmap]::new($Source)
  try {
    $rectangle = [System.Drawing.Rectangle]::new(0, $Top, 1440, 810)
    $crop = $sourceBitmap.Clone($rectangle, $sourceBitmap.PixelFormat)
    try { $crop.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png) }
    finally { $crop.Dispose() }
  } finally { $sourceBitmap.Dispose() }
}

function Add-PatientTracker {
  param($Slide, [string]$TrackerText)
  $trackerLabel = $Slide.Shapes.AddTextbox(1, 712, 9, 210, 16)
  $trackerLabel.TextFrame.TextRange.Text = "FOLLOWING ONE FICTIONAL PATIENT"
  $trackerLabel.TextFrame.TextRange.Font.Name = "Aptos"
  $trackerLabel.TextFrame.TextRange.Font.Size = 8
  $trackerLabel.TextFrame.TextRange.Font.Bold = -1
  $trackerLabel.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 190 18 60
  $trackerLabel.TextFrame.TextRange.ParagraphFormat.Alignment = 2

  $trackerOval = $Slide.Shapes.AddShape(9, 708, 25, 220, 42)
  $trackerOval.Fill.Solid()
  $trackerOval.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 255 255
  $trackerOval.Fill.Transparency = 0.08
  $trackerOval.Line.ForeColor.RGB = ConvertTo-OfficeRgb 225 29 72
  $trackerOval.Line.Weight = 4
  $trackerOval.TextFrame.TextRange.Text = $TrackerText
  $trackerOval.TextFrame.TextRange.Font.Name = "Aptos"
  $trackerOval.TextFrame.TextRange.Font.Size = 12
  $trackerOval.TextFrame.TextRange.Font.Bold = -1
  $trackerOval.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 136 19 55
  $trackerOval.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  $trackerOval.TextFrame.VerticalAnchor = 3
}

function Add-RedOval {
  param($Slide, [double]$Left, [double]$Top, [double]$Width, [double]$Height)
  $oval = $Slide.Shapes.AddShape(9, $Left, $Top, $Width, $Height)
  $oval.Fill.Visible = 0
  $oval.Line.ForeColor.RGB = ConvertTo-OfficeRgb 225 29 72
  $oval.Line.Weight = 5
  $pulse = $Slide.TimeLine.MainSequence.AddEffect($oval, 59, 0, 2)
  $pulse.Timing.Duration = 0.8
}

$narrations = @(
  "This is HomeFlow, a fictional discharge coordination prototype. Rather than tour separate presentation slides, let us follow one test patient through the site. Margaret T., demonstration identifier one-zero-one, is expected to leave today.",
  "The ward board is the starting point. Margaret is expected at two o'clock. Her status is amber because TTO medication is still outstanding. The same row shows the responsible team, the target time and that her family is ready to collect.",
  "Opening Margaret's journey answers the practical question: what will unlock this discharge? Pharmacy completion is due at eleven. The timeline records completed actions, their times, the current owner and the next step, so staff do not need to chase the story across several places.",
  "If the target passes, HomeFlow makes the delay visible. Margaret's TTO is thirty-five minutes overdue. The screen shows the responsible medical and pharmacy teams, the patient impact and a recommended next action. Staff can escalate from here, then record when the barrier is complete.",
  "The family view keeps the same journey moving outside the ward. One clear update gives the likely collection time and explains that a short delay may still occur. The relative can confirm collection, request support or ask for contact, and the ward can see that response in the prototype.",
  "On the privacy-safe ward display, Margaret's full name disappears. Staff follow bed D-twelve and demo identifier one-zero-one instead. The board shows the same barrier, owner, target and family readiness. When the ward updates Margaret in HomeFlow, this display changes too. That is HomeFlow: one patient journey, one shared operational picture."
)

$captions = @(
  "Meet Margaret T., fictional demo patient DEMO-101.",
  "The ward board shows her status, barrier, owner, target and family readiness.",
  "Her journey shows what will unlock discharge and the timestamped next step.",
  "An overdue TTO can be escalated to the responsible team and tracked to completion.",
  "One family update supports collection, support requests and contact requests.",
  "The privacy-safe ward display uses DEMO-101 instead of Margaret's full name."
)

$scenes = @(
  @{ File = "01-executive-dashboard.png"; Top = 100; Tracker = "Margaret T. · DEMO-101"; Oval = $null },
  @{ File = "02-ward-discharge-board.png"; Top = 210; Tracker = "Margaret T. · DEMO-101"; Oval = @(174, 220, 110, 34) },
  @{ File = "03-patient-discharge-journey.png"; Top = 170; Tracker = "Margaret T. · DEMO-101"; Oval = @(744, 306, 165, 52) },
  @{ File = "05-barrier-escalation.png"; Top = 190; Tracker = "Margaret T. · DEMO-101"; Oval = @(174, 261, 260, 43) },
  @{ File = "04-family-communication.png"; Top = 210; Tracker = "Margaret T. · DEMO-101"; Oval = $null },
  @{ File = "06-ward-display.png"; Top = 100; Tracker = "Bed D-12 · DEMO-101"; Oval = @(36, 260, 160, 70) }
)

$root = (Resolve-Path ".").Path
$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if ($PythonExecutable -eq "python" -and (Test-Path $bundledPython)) { $PythonExecutable = $bundledPython }
$videoPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputVideo))
$captionsPath = [System.IO.Path]::GetFullPath((Join-Path $root $OutputCaptions))
$workDir = Join-Path $root ".codex-tmp\homeflow-patient-video"
$timedDeckPath = Join-Path $workDir "HomeFlow_Patient_Journey_Video_Source.pptx"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($videoPath)) | Out-Null

$sceneImages = @()
for ($index = 0; $index -lt $scenes.Count; $index++) {
  $scene = $scenes[$index]
  $sourceImage = Join-Path $root ("screenshots\homeflow\" + $scene.File)
  $sceneImage = Join-Path $workDir ("scene-{0:00}.png" -f ($index + 1))
  Export-ScreenCrop -Source $sourceImage -Destination $sceneImage -Top $scene.Top
  $sceneImages += $sceneImage
}

$edgeTtsModulePath = Join-Path $root ".codex-tmp\pydeps"
if (-not (Test-Path (Join-Path $edgeTtsModulePath "edge_tts"))) { throw "edge-tts is not installed." }
$previousPythonPath = $env:PYTHONPATH
$env:PYTHONPATH = $edgeTtsModulePath
$audioPath = Join-Path $workDir "homeflow-patient-narration.mp3"
if (Test-Path $audioPath) { Remove-Item -LiteralPath $audioPath -Force }
$fullNarration = $narrations -join " ... "
$narrationCreated = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  & $PythonExecutable -m edge_tts --voice $NarrationVoice --rate=+4% --pitch=-4Hz --text $fullNarration --write-media $audioPath
  if ($LASTEXITCODE -eq 0 -and (Test-Path $audioPath) -and (Get-Item $audioPath).Length -gt 0) { $narrationCreated = $true; break }
  if (Test-Path $audioPath) { Remove-Item -LiteralPath $audioPath -Force }
  Start-Sleep -Seconds (3 * $attempt)
}
$env:PYTHONPATH = $previousPythonPath
if (-not $narrationCreated) { throw "Patient-journey narration failed after three attempts." }

$powerPoint = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  for ($index = 0; $index -lt $scenes.Count; $index++) {
    $slide = $presentation.Slides.Add($index + 1, 12)
    $picture = $slide.Shapes.AddPicture($sceneImages[$index], 0, -1, 0, 0, 960, 540)
    $screenEffect = $slide.TimeLine.MainSequence.AddEffect($picture, 10, 0, 2)
    $screenEffect.Timing.Duration = 0.5
    Add-PatientTracker -Slide $slide -TrackerText $scenes[$index].Tracker
    if ($scenes[$index].Oval) {
      $oval = $scenes[$index].Oval
      Add-RedOval -Slide $slide -Left $oval[0] -Top $oval[1] -Width $oval[2] -Height $oval[3]
    }
  }

  $audio = $presentation.Slides.Item(1).Shapes.AddMediaObject2($audioPath, 0, -1, -100, -100, 1, 1)
  $audio.Name = "HomeFlow patient journey narration"
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
    $transition = $presentation.Slides.Item($index + 1).SlideShowTransition
    $transition.AdvanceOnClick = 0
    $transition.AdvanceOnTime = -1
    $transition.AdvanceTime = [Math]::Max(8, $durations[$index])
  }

  $vtt = New-Object System.Collections.Generic.List[string]
  $vtt.Add("WEBVTT"); $vtt.Add("")
  $cursor = 0.0
  for ($index = 0; $index -lt $captions.Count; $index++) {
    $start = $cursor; $end = $cursor + $durations[$index]
    $vtt.Add("$($index + 1)"); $vtt.Add("$(Format-VttTime $start) --> $(Format-VttTime $end)"); $vtt.Add($captions[$index]); $vtt.Add("")
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
    if ($status -eq 4) { throw "PowerPoint failed to create the HomeFlow patient-journey video." }
    Start-Sleep -Seconds 5
  }
  if ($presentation.CreateVideoStatus -ne 3 -or -not (Test-Path $videoPath)) { throw "Timed out while creating the HomeFlow patient-journey video." }
} finally {
  if ($presentation) { $presentation.Close() }
  $powerPoint.Quit()
  if ($presentation) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}

[PSCustomObject]@{
  video = $videoPath
  captions = $captionsPath
  durationSeconds = [Math]::Round(($durations | Measure-Object -Sum).Sum, 1)
  bytes = (Get-Item $videoPath).Length
} | ConvertTo-Json -Compress

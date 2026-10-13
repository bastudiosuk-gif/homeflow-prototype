param(
  [string]$OutputVideo = "public\homeflow-patient-journey.mp4",
  [string]$OutputCaptions = "public\homeflow-patient-journey.vtt",
  [string]$PythonExecutable = "python",
  [string]$NarrationVoice = "en-GB-RyanNeural",
  [switch]$ReuseNarration
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
    $cropHeight = [int]($sourceBitmap.Width * 810 / 1440)
    $rectangle = [System.Drawing.Rectangle]::new(0, $Top, $sourceBitmap.Width, $cropHeight)
    $crop = $sourceBitmap.Clone($rectangle, $sourceBitmap.PixelFormat)
    try {
      $resized = [System.Drawing.Bitmap]::new($crop, 1440, 810)
      try { $resized.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $resized.Dispose() }
    }
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

  $trackerOval = $Slide.Shapes.AddShape(5, 708, 25, 220, 42)
  $trackerOval.Fill.Solid()
  $trackerOval.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 255 255
  $trackerOval.Fill.Transparency = 0.08
  $trackerOval.Line.ForeColor.RGB = ConvertTo-OfficeRgb 13 148 136
  $trackerOval.Line.Weight = 4
  $trackerOval.TextFrame.TextRange.Text = $TrackerText
  $trackerOval.TextFrame.TextRange.Font.Name = "Aptos"
  $trackerOval.TextFrame.TextRange.Font.Size = 12
  $trackerOval.TextFrame.TextRange.Font.Bold = -1
  $trackerOval.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 136 19 55
  $trackerOval.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  $trackerOval.TextFrame.VerticalAnchor = 3
}

function Add-ZoomFocus {
  param($Slide, [double]$Left, [double]$Top, [double]$Width, [double]$Height)
  $bitmap = [System.Drawing.Bitmap]::new($script:focusSource)
  try {
    $x = [Math]::Max(0, [int](($Left - 14) * 1440 / 932))
    $y = [Math]::Max(0, [int](($Top - 12) * 810 / 516))
    $w = [Math]::Min($bitmap.Width - $x, [int]($Width * 1440 / 932))
    $h = [Math]::Min($bitmap.Height - $y, [int]($Height * 810 / 516))
    $crop = $bitmap.Clone([System.Drawing.Rectangle]::new($x, $y, $w, $h), $bitmap.PixelFormat)
    $detailPath = Join-Path $workDir ("focus-" + [Guid]::NewGuid().ToString('N') + '.png')
    try { $crop.Save($detailPath, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $crop.Dispose() }
  } finally { $bitmap.Dispose() }
  $zoom = [Math]::Min(1.65, 880 / $Width)
  $zoomWidth = $Width * $zoom
  $zoomHeight = $Height * $zoom
  $zoomLeft = [Math]::Max(24, [Math]::Min(936 - $zoomWidth, $Left - (($zoomWidth - $Width) / 2)))
  $zoomTop = [Math]::Max(82, [Math]::Min(490 - $zoomHeight, $Top - (($zoomHeight - $Height) / 2)))
  $card = $Slide.Shapes.AddShape(5, $zoomLeft - 5, $zoomTop - 5, $zoomWidth + 10, $zoomHeight + 10)
  $card.Fill.Solid()
  $card.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 255 255
  $card.Line.ForeColor.RGB = ConvertTo-OfficeRgb 45 212 191
  $card.Line.Weight = 2
  $card.Glow.Color.RGB = ConvertTo-OfficeRgb 45 212 191
  $card.Glow.Radius = 12
  $card.Glow.Transparency = 0.3
  $card.Shadow.Visible = -1
  $card.Shadow.Blur = 14
  $card.Shadow.OffsetY = 5
  $card.Shadow.Transparency = 0.4
  $detail = $Slide.Shapes.AddPicture($detailPath, 0, -1, $zoomLeft, $zoomTop, $zoomWidth, $zoomHeight)
  $cardEntrance = $Slide.TimeLine.MainSequence.AddEffect($card, 23, 0, 2)
  $cardEntrance.Timing.Duration = 0.55
  $effect = $Slide.TimeLine.MainSequence.AddEffect($detail, 23, 0, 2)
  $effect.Timing.Duration = 0.55
}

function Add-CinematicBackdrop {
  param($Slide)
  $backdrop = $Slide.Shapes.AddShape(1, 0, 0, 960, 540)
  $backdrop.Fill.Solid()
  $backdrop.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 5 35 54
  $backdrop.Line.Visible = 0

  $frame = $Slide.Shapes.AddShape(5, 7, 6, 946, 528)
  $frame.Fill.Solid()
  $frame.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 255 255 255
  $frame.Line.ForeColor.RGB = ConvertTo-OfficeRgb 45 212 191
  $frame.Line.Transparency = 0.35
  $frame.Line.Weight = 2
  try {
    $frame.Shadow.Visible = -1
    $frame.Shadow.Blur = 14
    $frame.Shadow.OffsetX = 0
    $frame.Shadow.OffsetY = 5
    $frame.Shadow.Transparency = 0.42
  } catch {}
}

function Add-CinematicChrome {
  param($Slide, [string]$SceneLabel, [int]$SceneNumber, [bool]$IntroducePage = $false)
  $labelWidth = if ($IntroducePage) { 280 } else { 184 }
  $labelHeight = if ($IntroducePage) { 42 } else { 28 }
  $scenePill = $Slide.Shapes.AddShape(5, 24, 18, $labelWidth, $labelHeight)
  $scenePill.Fill.Solid()
  $scenePill.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 4 52 74
  $scenePill.Fill.Transparency = 0.06
  $scenePill.Line.ForeColor.RGB = ConvertTo-OfficeRgb 45 212 191
  $scenePill.Line.Weight = 1.5
  $scenePill.TextFrame.TextRange.Text = ("0{0}  •  {1}" -f $SceneNumber, $SceneLabel.ToUpperInvariant())
  $scenePill.TextFrame.TextRange.Font.Name = "Aptos"
  $scenePill.TextFrame.TextRange.Font.Size = if ($IntroducePage) { 16 } else { 9 }
  $scenePill.TextFrame.TextRange.Font.Bold = -1
  $scenePill.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 255 255 255
  $scenePill.TextFrame.VerticalAnchor = 3
  $scenePill.TextFrame.MarginLeft = 10
  if ($IntroducePage) {
    $scenePill.Glow.Color.RGB = ConvertTo-OfficeRgb 45 212 191
    $scenePill.Glow.Radius = 12
    $scenePill.Glow.Transparency = 0.3
    $titleEntrance = $Slide.TimeLine.MainSequence.AddEffect($scenePill, 23, 0, 2)
    $titleEntrance.Timing.Duration = 0.55
  }

  $demoPill = $Slide.Shapes.AddShape(5, 758, 506, 178, 20)
  $demoPill.Fill.Solid()
  $demoPill.Fill.ForeColor.RGB = ConvertTo-OfficeRgb 4 52 74
  $demoPill.Fill.Transparency = 0.08
  $demoPill.Line.ForeColor.RGB = ConvertTo-OfficeRgb 45 212 191
  $demoPill.Line.Transparency = 0.25
  $demoPill.TextFrame.TextRange.Text = "PROTOTYPE  •  DEMO DATA"
  $demoPill.TextFrame.TextRange.Font.Name = "Aptos"
  $demoPill.TextFrame.TextRange.Font.Size = 7
  $demoPill.TextFrame.TextRange.Font.Bold = -1
  $demoPill.TextFrame.TextRange.Font.Color.RGB = ConvertTo-OfficeRgb 255 255 255
  $demoPill.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  $demoPill.TextFrame.VerticalAnchor = 3

  for ($dotIndex = 1; $dotIndex -le $scenes.Count; $dotIndex++) {
    $dot = $Slide.Shapes.AddShape(9, 26 + (($dotIndex - 1) * 15), 509, 8, 8)
    $dot.Line.Visible = 0
    $dot.Fill.Solid()
    $dot.Fill.ForeColor.RGB = if ($dotIndex -eq $SceneNumber) { ConvertTo-OfficeRgb 45 212 191 } else { ConvertTo-OfficeRgb 148 163 184 }
    $dot.Fill.Transparency = if ($dotIndex -eq $SceneNumber) { 0.0 } else { 0.35 }
  }
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
  @{ File = "01-executive-dashboard.png"; Top = 100; Label = "Overview"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Weight = 0.42; Oval = @(179, 208, 121, 96) }
  ) },
  @{ File = "02-ward-discharge-board.png"; Top = 210; Label = "Ward board"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Oval = @(174, 216, 205, 48) },
    @{ Oval = @(390, 216, 172, 48) },
    @{ Oval = @(555, 216, 210, 48) }
  ) },
  @{ File = "03-patient-discharge-journey.png"; Top = 170; Label = "Patient journey"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Weight = 0.22; Oval = @(178, 170, 758, 80) },
    @{ Oval = @(194, 315, 524, 128) }
  ) },
  @{ File = "05-barrier-escalation.png"; Top = 190; Label = "Escalation"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Weight = 0.19; Oval = @(178, 147, 758, 84) },
    @{ Weight = 0.18; Oval = @(193, 313, 234, 48); Oval2 = @(435, 313, 240, 48) },
    @{ Weight = 0.13; Oval = @(191, 460, 260, 42) }
  ) },
  @{ File = "04-family-communication.png"; Top = 210; Label = "Family update"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Oval = @(205, 315, 190, 140) },
    @{ Weight = 0.30; Oval = @(451, 346, 334, 42) }
  ) },
  @{ File = "06-ward-display.png"; Top = 100; Label = "Ward display"; Tracker = "Bed D-12 · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Weight = 0.22; Oval = @(36, 260, 170, 70) },
    @{ Weight = 0.20; Oval = @(35, 258, 900, 74) }
  ) },
  @{ File = "05-barrier-escalation.png"; Top = 190; Label = "Spot & act"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Oval = @(191, 460, 260, 42) }
  ) },
  @{ File = "11-pharmacy-workspace.jpg"; Top = 535; Label = "Pharmacy"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Intro = $true; Oval = $null },
    @{ Oval = @(45, 120, 850, 150) }
  ) },
  @{ File = "12-pharmacy-progress.jpg"; Top = 535; Label = "Pharmacy progress"; Tracker = "Margaret T. · DEMO-101"; Highlights = @(
    @{ Oval = @(580, 370, 320, 70) }
  ) }
)

# Every spoken cue has its own audio clip on its own visual frame.
# PowerPoint measures the actual clip length; no word-count estimates are used.
$cueTexts = @(
  "Welcome to HomeFlow. The overview summarises discharge readiness across the ward.",
  "Follow fictional patient Margaret T., expected home today.",
  "The ward board shows each patient's status, barriers and ownership.",
  "Margaret, bed twelve, is expected home at two o'clock.",
  "She is amber because TTO medication is outstanding.",
  "Her owner, eleven o'clock target and family readiness appear here.",
  "Patient journey shows discharge steps, deadlines and progress.",
  "Margaret needs pharmacy completion by eleven to unlock discharge.",
  "The timeline shows completed actions, timestamps and the next owner.",
  "Escalation shows overdue barriers, responsible teams and next actions.",
  "Margaret's deadline is thirty-five minutes overdue.",
  "Her responsible teams and target appear together.",
  "Escalate here, then record completion.",
  "Family communication supports collection planning and family responses.",
  "Margaret's relative prepares for collection, then receives the ready message.",
  "Her relative can confirm, request support or contact.",
  "Ward display gives staff a shared, privacy-safe discharge picture.",
  "Margaret appears as bed D-twelve, demo one-zero-one.",
  "Her barrier, owner, target and family readiness update with the prototype.",
  "HomeFlow compares incomplete actions with deadlines. Margaret's TTO triggers an overdue flag.",
  "Staff escalate and record completion directly. People resolve the delay.",
  "The pharmacy workspace tracks TTO requests, preparation, readiness and ward delivery.",
  "Margaret's TTO has a revised twelve-thirty target. Prescribing stays in approved systems.",
  "Her stage is now received by pharmacy. Staff can prepare or request clarification; nurses see progress."
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
$cueManifest = Join-Path $workDir "narration-cues.json"
[System.IO.File]::WriteAllText($cueManifest, (ConvertTo-Json -InputObject $cueTexts), [System.Text.UTF8Encoding]::new($false))
& $PythonExecutable (Join-Path $root "scripts\create-timed-narration.py") $cueManifest
$narrationCreated = $LASTEXITCODE -eq 0
$env:PYTHONPATH = $previousPythonPath
if (-not $narrationCreated) { throw "Patient-journey narration failed after three attempts." }

$powerPoint = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  $timelineScenes = New-Object System.Collections.Generic.List[object]
  for ($sceneIndex = 0; $sceneIndex -lt $scenes.Count; $sceneIndex++) {
    $scene = $scenes[$sceneIndex]
    $weightTotal = ($scene.Highlights | ForEach-Object { [double]$_.Weight } | Measure-Object -Sum).Sum
    foreach ($highlight in $scene.Highlights) {
      $timelineScenes.Add([PSCustomObject]@{
        SceneIndex = $sceneIndex
        SceneNumber = $sceneIndex + 1
        SceneLabel = $scene.Label
        IntroducePage = [bool]$highlight.Intro
        Tracker = $scene.Tracker
        Oval = $highlight.Oval
        Oval2 = $highlight.Oval2
        Duration = 0.0
      })
    }
  }
  if ($timelineScenes.Count -ne $cueTexts.Count) { throw "Narration and visual cue counts differ." }
  $vtt = New-Object System.Collections.Generic.List[string]
  $vtt.Add("WEBVTT"); $vtt.Add("")
  $cursor = 0.0

  for ($index = 0; $index -lt $timelineScenes.Count; $index++) {
    $timelineScene = $timelineScenes[$index]
    $slide = $presentation.Slides.Add($index + 1, 12)
    $clipPath = Join-Path $workDir ("cue-{0:00}.mp3" -f ($index + 1))
    $audio = $slide.Shapes.AddMediaObject2($clipPath, 0, -1, -100, -100, 1, 1)
    $audio.AnimationSettings.Animate = -1
    $audio.AnimationSettings.PlaySettings.PlayOnEntry = -1
    $audio.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
    $audio.AnimationSettings.PlaySettings.StopAfterSlides = 1
    $timelineScene.Duration = [Math]::Round($audio.MediaFormat.Length / 1000, 3) + 0.15
    $pictureLeft = 14.0
    $pictureTop = 12.0
    $pictureWidth = 932.0
    $pictureHeight = 516.0
    Add-CinematicBackdrop -Slide $slide
    $slide.Shapes.AddPicture($sceneImages[$timelineScene.SceneIndex], 0, -1, $pictureLeft, $pictureTop, $pictureWidth, $pictureHeight) | Out-Null
    Add-CinematicChrome -Slide $slide -SceneLabel $timelineScene.SceneLabel -SceneNumber $timelineScene.SceneNumber -IntroducePage $timelineScene.IntroducePage
    Add-PatientTracker -Slide $slide -TrackerText $timelineScene.Tracker
    $script:focusSource = $sceneImages[$timelineScene.SceneIndex]
    $script:focusDuration = $timelineScene.Duration
    if ($timelineScene.Oval) {
      $oval = $timelineScene.Oval
      Add-ZoomFocus -Slide $slide -Left ($pictureLeft + ($oval[0] * $pictureWidth / 960)) -Top ($pictureTop + ($oval[1] * $pictureHeight / 540)) -Width ($oval[2] * $pictureWidth / 960) -Height ($oval[3] * $pictureHeight / 540)
    }
    if ($timelineScene.Oval2) {
      $oval2 = $timelineScene.Oval2
      Add-ZoomFocus -Slide $slide -Left ($pictureLeft + ($oval2[0] * $pictureWidth / 960)) -Top ($pictureTop + ($oval2[1] * $pictureHeight / 540)) -Width ($oval2[2] * $pictureWidth / 960) -Height ($oval2[3] * $pictureHeight / 540)
    }
    $transition = $slide.SlideShowTransition
    $transition.AdvanceOnClick = 0
    $transition.AdvanceOnTime = -1
    $transition.AdvanceTime = $timelineScene.Duration
    $end = $cursor + $timelineScene.Duration
    $vtt.Add("$($index + 1)")
    $vtt.Add("$(Format-VttTime $cursor) --> $(Format-VttTime $end)")
    $vtt.Add($cueTexts[$index]); $vtt.Add("")
    $cursor = $end
  }
  $vtt.RemoveAt($vtt.Count - 1)
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
  durationSeconds = [Math]::Round($cursor, 1)
  highlightScenes = $timelineScenes.Count
  bytes = (Get-Item $videoPath).Length
} | ConvertTo-Json -Compress

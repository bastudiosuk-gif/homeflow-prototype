param(
  [string]$SourceDeck = "deliverables\HomeFlow_Dragons_Den_Pitch_5000_Ask.pptx",
  [string]$OutputVideo = "public\homeflow-overview.mp4",
  [string]$OutputCaptions = "public\homeflow-overview.vtt"
)

$ErrorActionPreference = "Stop"

function Get-WavDurationSeconds {
  param([Parameter(Mandatory = $true)][string]$Path)

  $stream = [System.IO.File]::OpenRead($Path)
  $reader = New-Object System.IO.BinaryReader($stream)
  try {
    $riff = -join ($reader.ReadChars(4))
    $null = $reader.ReadUInt32()
    $wave = -join ($reader.ReadChars(4))
    if ($riff -ne "RIFF" -or $wave -ne "WAVE") {
      throw "Unexpected audio format in $Path"
    }

    $byteRate = 0
    $dataSize = 0
    while ($stream.Position -lt $stream.Length) {
      $chunkId = -join ($reader.ReadChars(4))
      $chunkSize = $reader.ReadUInt32()
      if ($chunkId -eq "fmt ") {
        $null = $reader.ReadUInt16()
        $null = $reader.ReadUInt16()
        $null = $reader.ReadUInt32()
        $byteRate = $reader.ReadUInt32()
        $remaining = $chunkSize - 12
        if ($remaining -gt 0) { $null = $reader.ReadBytes($remaining) }
      } elseif ($chunkId -eq "data") {
        $dataSize = $chunkSize
        $null = $reader.ReadBytes($chunkSize)
      } else {
        $null = $reader.ReadBytes($chunkSize)
      }
      if (($chunkSize % 2) -eq 1 -and $stream.Position -lt $stream.Length) {
        $null = $reader.ReadByte()
      }
    }

    if ($byteRate -le 0 -or $dataSize -le 0) {
      throw "Could not read duration from $Path"
    }
    return [Math]::Round($dataSize / $byteRate, 2)
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
}

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

$voice = New-Object -ComObject SAPI.SpVoice
$voice.Rate = -1
$voice.Volume = 100
$preferredVoice = $voice.GetVoices() | Where-Object { $_.GetDescription() -like "Microsoft David*" } | Select-Object -First 1
if ($preferredVoice) { $voice.Voice = $preferredVoice }

$durations = @()
$audioPaths = @()
for ($index = 0; $index -lt $narrations.Count; $index++) {
  $audioPath = Join-Path $workDir ("scene-{0:00}.wav" -f ($index + 1))
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format.Type = 22
  $stream.Open($audioPath, 3, $false)
  $voice.AudioOutputStream = $stream
  $null = $voice.Speak($narrations[$index])
  $stream.Close()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($stream) | Out-Null
  $audioPaths += $audioPath
  $durations += (Get-WavDurationSeconds -Path $audioPath) + 0.7
}
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($voice) | Out-Null

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

$powerPoint = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
  $presentation = $powerPoint.Presentations.Open($sourcePath, $false, $false, $false)
  # The former integration slide referenced an earlier architecture assumption. It is omitted from the short film.
  $presentation.Slides.Item(4).Delete()

  for ($index = 0; $index -lt $presentation.Slides.Count; $index++) {
    $slide = $presentation.Slides.Item($index + 1)
    $transition = $slide.SlideShowTransition
    $transition.AdvanceOnClick = 0
    $transition.AdvanceOnTime = -1
    $transition.AdvanceTime = [Math]::Max(7, $durations[$index])

    $audio = $slide.Shapes.AddMediaObject2($audioPaths[$index], 0, -1, -100, -100, 1, 1)
    $audio.Name = "HomeFlow narration $($index + 1)"
    $audio.AnimationSettings.Animate = -1
    $audio.AnimationSettings.PlaySettings.PlayOnEntry = -1
    $audio.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
    $audio.AnimationSettings.PlaySettings.StopAfterSlides = 1
  }

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

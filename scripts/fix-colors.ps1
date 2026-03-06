$root = "C:\Users\Dinesh\Desktop\DEP_FORMS\dep_forms\app"
$files = Get-ChildItem -Recurse -Include "*.tsx" -Path $root
Write-Host "Found $($files.Count) files"
foreach ($f in $files) {
  $c = [IO.File]::ReadAllText($f.FullName)
  $orig = $c
  $c = $c.Replace('focus:ring-red-500','focus:ring-indigo-400')
  $c = $c.Replace('hover:bg-red-50','hover:bg-indigo-50')
  $c = $c.Replace('hover:bg-red-100','hover:bg-indigo-100')
  $c = $c.Replace('hover:border-red-200','hover:border-indigo-200')
  $c = $c.Replace('hover:border-red-300','hover:border-indigo-200')
  $c = $c.Replace('hover:text-red-600','hover:text-indigo-600')
  $c = $c.Replace('hover:text-red-700','hover:text-indigo-700')
  $c = $c.Replace('accent-red-600','accent-indigo-500')
  $c = $c.Replace('accent-red-400','accent-indigo-400')
  if ($c -ne $orig) {
    [IO.File]::WriteAllText($f.FullName, $c, [Text.Encoding]::UTF8)
    Write-Host "Updated: $($f.Name)"
  }
}
Write-Host "Done"

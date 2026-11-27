Pod::Spec.new do |s|
  s.name           = 'PBSBackupExclude'
  s.version        = '1.0.0'
  s.summary        = 'Keeps the Write your own night folder out of iCloud and device backups'
  s.author         = ''
  s.homepage       = 'https://peacebestillapp.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
end

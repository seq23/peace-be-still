Pod::Spec.new do |s|
  s.name           = 'PBSDeviceCheck'
  s.version        = '1.0.0'
  s.summary        = 'Apple DeviceCheck token for the private first chat'
  s.author         = ''
  s.homepage       = 'https://peacebestillapp.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'DeviceCheck'
  s.source_files   = '**/*.swift'
end

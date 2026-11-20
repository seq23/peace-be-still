Pod::Spec.new do |s|
  s.name = 'PeacePlayer'
  s.version = '1.0.0'
  s.summary = 'Background audio and native sleep timer'
  s.description = 'Audio player for Peace Be Still'
  s.license = { :type => 'MIT' }
  s.author = 'Peace Be Still'
  s.homepage = 'https://peacebestillapp.com'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end

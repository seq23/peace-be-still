import AVFoundation
import ExpoModulesCore

public final class PeacePlayerModule: Module {
  private let player = AVPlayer()
  private var timer: DispatchSourceTimer?
  private var deadline: Date?

  public func definition() -> ModuleDefinition {
    Name("PeacePlayer")
    AsyncFunction("load") { (uri: String) in
      guard let url = URL(string: uri) else { throw InvalidURLException() }
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
      try AVAudioSession.sharedInstance().setActive(true)
      self.player.replaceCurrentItem(with: AVPlayerItem(url: url))
    }.runOnQueue(.main)
    AsyncFunction("play") {
      if let deadline = self.deadline, deadline <= Date() { self.cancelTimer(); self.player.pause(); return }
      self.player.play()
    }.runOnQueue(.main)
    Function("pause") { self.player.pause() }.runOnQueue(.main)
    Function("setSleepDeadline") { (milliseconds: Double?) in
      self.cancelTimer()
      guard let milliseconds = milliseconds else { return }
      let deadline = Date(timeIntervalSince1970: milliseconds / 1000)
      self.deadline = deadline
      let timer = DispatchSource.makeTimerSource(queue: .main)
      timer.schedule(deadline: .now() + max(0, deadline.timeIntervalSinceNow))
      timer.setEventHandler { [weak self] in
        self?.player.pause()
        self?.cancelTimer()
      }
      self.timer = timer
      timer.resume()
    }.runOnQueue(.main)
    Function("dispose") { self.cancelTimer(); self.player.pause(); self.player.replaceCurrentItem(with: nil) }.runOnQueue(.main)
  }

  private func cancelTimer() { timer?.cancel(); timer = nil; deadline = nil }
}

private final class InvalidURLException: Exception {
  override var reason: String { "Invalid audio URL" }
}

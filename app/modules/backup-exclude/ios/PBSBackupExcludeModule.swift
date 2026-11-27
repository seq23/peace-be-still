// Write your own night keeps her moments and recordings in one folder (app/src/ownNight/adapters.ts). This marks
// that folder excluded from iCloud and device backups (Apple: a directory marked so is left out with everything
// in it), so "never uploaded" stays true. It answers true only when it reads the mark back; anything else is
// false, and the app then saves nothing.
import ExpoModulesCore

public class PBSBackupExcludeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PBSBackupExclude")
    Function("exclude") { (uri: String) -> Bool in
      guard var url = URL(string: uri), url.isFileURL else { return false }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      do { try url.setResourceValues(values) } catch { return false }
      url.removeAllCachedResourceValues()
      return (try? url.resourceValues(forKeys: [.isExcludedFromBackupKey]))?.isExcludedFromBackup == true
    }
  }
}

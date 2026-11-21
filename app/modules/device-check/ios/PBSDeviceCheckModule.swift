// Apple DeviceCheck's device token (the private first chat, worker/src/firstprivate.ts). The Worker,
// never the app, reads and sets the device's bit with Apple. No token (a simulator, an old OS): nil,
// and the first chat is the normal free lane.
import DeviceCheck
import ExpoModulesCore

public class PBSDeviceCheckModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PBSDeviceCheck")
    AsyncFunction("token") { (promise: Promise) in
      guard DCDevice.current.isSupported else { promise.resolve(nil); return }
      DCDevice.current.generateToken { data, _ in promise.resolve(data?.base64EncodedString()) }
    }
  }
}

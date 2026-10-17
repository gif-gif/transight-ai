import AppKit
import SwiftUI
import TransightCore

@main
struct TransightApp: App {
    @State private var store = AppStore(
        service: DemoTranslationService(),
        repository: UserDefaultsPreferencesRepository()
    )

    var body: some Scene {
        Window("Transight AI", id: "workspace") {
            WorkspaceView(store: store)
                .tint(.accentColor)
        }
        .defaultSize(width: 1060, height: 740)
        .commands {
            CommandMenu("翻译") {
                Button("开始演示翻译") { store.translate() }
                    .keyboardShortcut(.return, modifiers: .command)
                    .disabled(!store.canTranslate)
                Button("取消翻译") { store.cancelTranslation() }
                    .disabled(!store.isTranslating)
            }
        }

        Settings {
            PreferencesView(store: store)
                .frame(width: 520, height: 400)
        }

        MenuBarExtra("Transight AI", systemImage: "character.bubble") {
            MenuBarContent()
        }
    }
}

private struct MenuBarContent: View {
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        Button("打开 Transight AI") {
            openWindow(id: "workspace")
            NSApp.activate(ignoringOtherApps: true)
        }
        SettingsLink { Text("设置…") }
        Divider()
        Text("离线演示 · 不发送网络请求")
        Divider()
        Button("退出 Transight AI") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }
}

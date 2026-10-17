import SwiftUI
import TransightCore

private enum Destination: String, CaseIterable, Identifiable {
    case translate = "翻译工作台", history = "会话历史"
    var id: String { rawValue }
    var icon: String { self == .translate ? "character.bubble" : "clock.arrow.circlepath" }
}

struct WorkspaceView: View {
    @Bindable var store: AppStore
    @State private var destination: Destination? = .translate

    var body: some View {
        NavigationSplitView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 10) {
                    Image(systemName: "character.bubble.fill")
                        .font(.title).foregroundStyle(Color.accentColor)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Transight AI").font(.headline)
                        Text("译见 · macOS").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 16).padding(.top, 20)

                List(Destination.allCases, selection: $destination) { item in
                    Label(item.rawValue, systemImage: item.icon).tag(item)
                }
                .listStyle(.sidebar)

                VStack(alignment: .leading, spacing: 10) {
                    Label("开发预览", systemImage: "hammer").font(.caption.weight(.medium))
                    Text("原生体验，从理解开始。")
                        .font(.caption).foregroundStyle(.secondary)
                    SettingsLink { Label("设置", systemImage: "gearshape") }
                }
                .padding(16)
            }
            .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 260)
        } detail: {
            switch destination ?? .translate {
            case .translate:
                TranslatorView(store: store)
            case .history:
                HistoryView(store: store) { record in
                    store.restore(record)
                    destination = .translate
                }
            }
        }
        .frame(minWidth: 820, minHeight: 620)
        .toolbar {
            ToolbarItem {
                Label("离线演示", systemImage: "network.slash")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

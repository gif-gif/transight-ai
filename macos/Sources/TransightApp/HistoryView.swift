import SwiftUI
import TransightCore

struct HistoryView: View {
    @Bindable var store: AppStore
    let onSelect: (TranslationRecord) -> Void
    @State private var confirmClear = false

    var body: some View {
        Group {
            if store.history.isEmpty {
                ContentUnavailableView("暂无会话历史", systemImage: "clock", description: Text("完成的演示会在这里出现。历史仅保存在内存中，退出应用后清除。"))
            } else {
                List(store.history) { record in
                    Button { onSelect(record) } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(record.request.targetLanguage.title).font(.headline)
                                Text(record.result.isDemo ? "演示" : record.result.model)
                                    .font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Text(record.createdAt, style: .time).font(.caption).foregroundStyle(.secondary)
                            }
                            Text(record.request.text).lineLimit(2)
                            Text(record.result.text).lineLimit(2).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("返回工作台查看本条记录")
                }
                .safeAreaInset(edge: .bottom) {
                    Text("仅本次会话 · 最多 100 条 · 不写入磁盘")
                        .font(.caption).foregroundStyle(.secondary).padding(12)
                }
            }
        }
        .navigationTitle("会话历史")
        .toolbar {
            Button("清空历史", systemImage: "trash") { confirmClear = true }
                .disabled(store.history.isEmpty)
        }
        .confirmationDialog("清空本次会话的全部历史？", isPresented: $confirmClear) {
            Button("清空历史", role: .destructive) { store.clearHistory() }
        } message: {
            Text("此操作不可撤销。工作台当前显示的结果不会被清除。")
        }
    }
}

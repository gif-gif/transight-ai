import AppKit
import SwiftUI
import TransightCore

struct TranslatorView: View {
    @Bindable var store: AppStore
    @State private var copiedRecordID: UUID?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("让理解，不止于语言。")
                        .font(.largeTitle.weight(.semibold))
                    Text("Transight AI 翻译工作台")
                        .font(.title3).foregroundStyle(.secondary)
                }
                demoNotice
                inputCard
                resultCard
            }
            .padding(28)
            .frame(maxWidth: 1100, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle("翻译工作台")
    }

    private var demoNotice: some View {
        Label {
            Text("当前使用离线演示服务，输出为固定示例，不代表原文的真实翻译。文本不会发送到网络。")
                .font(.callout)
        } icon: {
            Image(systemName: "info.circle").foregroundStyle(Color.accentColor)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
    }

    private var inputCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("原文", systemImage: "text.alignleft").font(.headline)
                Spacer()
                Text("自动识别语言 · 待接入").font(.caption).foregroundStyle(.secondary)
            }
            TextEditor(text: $store.sourceText)
                .font(.body)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 140)
                .accessibilityLabel("需要翻译的原文")
            Divider()
            HStack {
                Picker("译为", selection: $store.preferences.targetLanguage) {
                    ForEach(TargetLanguage.allCases) { Text($0.title).tag($0) }
                }
                .frame(maxWidth: 210)
                Spacer()
                Text("\(store.sourceText.count) / 12,000")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(store.sourceText.count > 12_000 ? Color.red : Color.secondary)
                if store.isTranslating {
                    Button("取消") { store.cancelTranslation() }
                } else {
                    Button { store.translate() } label: {
                        Label("演示翻译", systemImage: "sparkles")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!store.canTranslate)
                    .help("Command + Return")
                }
            }
        }
        .padding(20)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.separator.opacity(0.5)))
    }

    @ViewBuilder
    private var resultCard: some View {
        if store.isTranslating {
            HStack(spacing: 12) {
                ProgressView().controlSize(.small)
                Text("正在准备演示结果…").foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, minHeight: 140)
        } else if let message = store.errorMessage {
            ContentUnavailableView {
                Label("未能完成翻译", systemImage: "exclamationmark.triangle")
            } description: {
                Text(message)
            } actions: {
                Button("重试") { store.translate() }.disabled(!store.canTranslate)
            }
        } else if let record = store.result {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Label(record.result.isDemo ? "演示结果" : "翻译结果", systemImage: "sparkles")
                        .font(.headline)
                    Text(record.result.model).font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Button {
                        NSPasteboard.general.clearContents()
                        if NSPasteboard.general.setString(record.result.text, forType: .string) {
                            copiedRecordID = record.id
                        }
                    } label: {
                        Label(copiedRecordID == record.id ? "已复制" : "复制", systemImage: copiedRecordID == record.id ? "checkmark" : "doc.on.doc")
                    }
                    .task(id: copiedRecordID) {
                        guard copiedRecordID != nil else { return }
                        do {
                            try await Task.sleep(for: .seconds(1.5))
                            copiedRecordID = nil
                        } catch {}
                    }
                }
                Text(record.result.text).font(.title3).textSelection(.enabled)
                Text("\(record.request.targetLanguage.title) · \(record.request.style.title)")
                    .font(.caption).foregroundStyle(.secondary)
                if store.sourceText.trimmingCharacters(in: .whitespacesAndNewlines) != record.request.text
                    || store.preferences.targetLanguage != record.request.targetLanguage
                    || store.preferences.style != record.request.style {
                    Label("原文或偏好已更改，请重新翻译。", systemImage: "arrow.clockwise")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.background, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(.separator.opacity(0.5)))
        } else {
            ContentUnavailableView("理解，即将发生", systemImage: "character.bubble", description: Text("输入一段文字，体验原生翻译工作流。⌘ Return 开始。"))
        }
    }
}

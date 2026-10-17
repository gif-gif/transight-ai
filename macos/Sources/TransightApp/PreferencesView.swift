import SwiftUI
import TransightCore

struct PreferencesView: View {
    @Bindable var store: AppStore

    var body: some View {
        Form {
            Section("翻译偏好") {
                Picker("默认目标语言", selection: $store.preferences.targetLanguage) {
                    ForEach(TargetLanguage.allCases) { Text($0.title).tag($0) }
                }
                Picker("表达风格", selection: $store.preferences.style) {
                    ForEach(TranslationStyle.allCases) { Text($0.title).tag($0) }
                }
                Text("偏好自动保存在本机；演示结果不随表达风格改变。")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section("隐私") {
                Toggle("保留本次会话的翻译历史", isOn: $store.preferences.rememberSessionHistory)
                Text("历史只保留在内存中。关闭此选项会立即清空已有历史；退出应用后也会清除。")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section("AI 服务 · 开发预览") {
                LabeledContent("当前服务", value: "Offline Demo")
                Text("真实 API、多模型对照和流式输出尚未接入。后续通过 TranslationService 扩展；API Key 将使用系统钥匙串保存。")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .navigationTitle("设置")
    }
}

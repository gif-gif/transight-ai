import Foundation

public enum TargetLanguage: String, CaseIterable, Codable, Sendable, Identifiable {
    case simplifiedChinese = "zh-CN", traditionalChinese = "zh-TW"
    case english = "en", japanese = "ja", korean = "ko", french = "fr"
    case german = "de", spanish = "es", russian = "ru", portuguese = "pt"

    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .simplifiedChinese: "简体中文"
        case .traditionalChinese: "繁體中文"
        case .english: "English"
        case .japanese: "日本語"
        case .korean: "한국어"
        case .french: "Français"
        case .german: "Deutsch"
        case .spanish: "Español"
        case .russian: "Русский"
        case .portuguese: "Português"
        }
    }
}

public enum TranslationStyle: String, CaseIterable, Codable, Sendable, Identifiable {
    case natural, faithful, professional
    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .natural: "自然流畅"
        case .faithful: "忠实原文"
        case .professional: "专业严谨"
        }
    }
}

/// Non-secret settings only. Future API credentials must live in Keychain, never here.
public struct Preferences: Codable, Equatable, Sendable {
    public var targetLanguage: TargetLanguage = .simplifiedChinese
    public var style: TranslationStyle = .natural
    public var rememberSessionHistory = true

    public init() {}
}

@MainActor
public protocol PreferencesRepository {
    func load() -> Preferences
    func save(_ preferences: Preferences)
}

@MainActor
public final class UserDefaultsPreferencesRepository: PreferencesRepository {
    private let defaults: UserDefaults
    private let key = "transight.mac.preferences.v1"

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func load() -> Preferences {
        guard let data = defaults.data(forKey: key),
              let preferences = try? JSONDecoder().decode(Preferences.self, from: data) else {
            return Preferences()
        }
        return preferences
    }

    public func save(_ preferences: Preferences) {
        guard let data = try? JSONEncoder().encode(preferences) else { return }
        defaults.set(data, forKey: key)
    }
}

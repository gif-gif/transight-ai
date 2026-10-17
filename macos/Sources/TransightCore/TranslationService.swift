import Foundation

public struct TranslationRequest: Equatable, Sendable {
    public static let maximumTextLength = 12_000
    public let text: String
    public let targetLanguage: TargetLanguage
    public let style: TranslationStyle

    public init(text: String, targetLanguage: TargetLanguage, style: TranslationStyle) throws {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw TranslationError.emptyText }
        guard trimmed.count <= Self.maximumTextLength else { throw TranslationError.textTooLong }
        self.text = trimmed
        self.targetLanguage = targetLanguage
        self.style = style
    }
}

public struct TranslationResult: Equatable, Sendable {
    public let text: String
    public let model: String
    public let isDemo: Bool

    public init(text: String, model: String, isDemo: Bool) {
        self.text = text
        self.model = model
        self.isDemo = isDemo
    }
}

public enum TranslationError: LocalizedError, Sendable {
    case emptyText, textTooLong

    public var errorDescription: String? {
        switch self {
        case .emptyText: "请输入需要翻译的文本。"
        case .textTooLong: "文本不能超过 12,000 个字符。"
        }
    }
}

/// Implement this boundary for an HTTP provider; the UI does not own networking or credentials.
public protocol TranslationService: Sendable {
    func translate(_ request: TranslationRequest) async throws -> TranslationResult
}

/// Fixed, offline fixtures for building the app shell. This does NOT translate arbitrary input.
public struct DemoTranslationService: TranslationService {
    public init() {}

    public func translate(_ request: TranslationRequest) async throws -> TranslationResult {
        try await Task.sleep(for: .milliseconds(450))
        try Task.checkCancellation()
        let text: String = switch request.targetLanguage {
        case .simplifiedChinese: "让语言不再成为理解世界的边界。"
        case .traditionalChinese: "讓語言不再成為理解世界的邊界。"
        case .english: "Let language connect you to the world, not limit it."
        case .japanese: "言葉を、世界を理解するための架け橋に。"
        case .korean: "언어가 세상을 이해하는 데 장벽이 되지 않도록."
        case .french: "Que la langue soit un pont vers le monde, pas une barrière."
        case .german: "Sprache soll eine Brücke zur Welt sein, keine Grenze."
        case .spanish: "Que el idioma sea un puente hacia el mundo, no una barrera."
        case .russian: "Пусть язык станет мостом к миру, а не преградой."
        case .portuguese: "Que o idioma seja uma ponte para o mundo, não uma barreira."
        }
        return TranslationResult(text: text, model: "Offline Demo", isDemo: true)
    }
}

public struct TranslationRecord: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let createdAt: Date
    public let request: TranslationRequest
    public let result: TranslationResult

    public init(request: TranslationRequest, result: TranslationResult) {
        id = UUID()
        createdAt = Date()
        self.request = request
        self.result = result
    }
}

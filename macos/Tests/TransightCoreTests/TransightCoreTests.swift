import Foundation
import Testing
@testable import TransightCore

@MainActor
private final class MemoryPreferences: PreferencesRepository {
    var value = Preferences()
    func load() -> Preferences { value }
    func save(_ preferences: Preferences) { value = preferences }
}

private struct ImmediateService: TranslationService {
    func translate(_ request: TranslationRequest) async throws -> TranslationResult {
        TranslationResult(text: "result: \(request.text)", model: "test", isDemo: false)
    }
}

private struct FailingService: TranslationService {
    func translate(_ request: TranslationRequest) async throws -> TranslationResult {
        throw TranslationError.textTooLong
    }
}

/// Intentionally ignores cancellation, simulating a provider delivering a late callback.
private actor SuspendedService: TranslationService {
    private var pending: CheckedContinuation<TranslationResult, Never>?
    private var waiter: CheckedContinuation<Void, Never>?
    func translate(_ request: TranslationRequest) async throws -> TranslationResult {
        await withCheckedContinuation { continuation in
            pending = continuation
            waiter?.resume()
            waiter = nil
        }
    }
    func waitUntilStarted() async {
        if pending != nil { return }
        await withCheckedContinuation { waiter = $0 }
    }
    func finish() {
        pending?.resume(returning: TranslationResult(text: "late result", model: "test", isDemo: false))
        pending = nil
    }
}

@Test func validatesText() throws {
    #expect(throws: TranslationError.self) {
        try TranslationRequest(text: " \n ", targetLanguage: .english, style: .natural)
    }
    #expect(throws: TranslationError.self) {
        try TranslationRequest(text: String(repeating: "a", count: 12_001), targetLanguage: .english, style: .natural)
    }
    let request = try TranslationRequest(text: "  Hello \n", targetLanguage: .english, style: .natural)
    #expect(request.text == "Hello")
    #expect(try TranslationRequest(text: String(repeating: "你", count: 12_000), targetLanguage: .english, style: .natural).text.count == 12_000)
}

@Test func demoIsExplicitlyMarked() async throws {
    let request = try TranslationRequest(text: "Example", targetLanguage: .simplifiedChinese, style: .natural)
    let result = try await DemoTranslationService().translate(request)
    #expect(result.isDemo)
    #expect(result.model == "Offline Demo")
    #expect(!result.text.isEmpty)
}

@Test @MainActor func preferencesRoundTripAndCorruptionFallback() throws {
    let suite = "transight-tests-\(UUID().uuidString)"
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let repository = UserDefaultsPreferencesRepository(defaults: defaults)
    #expect(repository.load() == Preferences())
    var preferences = Preferences()
    preferences.targetLanguage = .japanese
    preferences.style = .professional
    preferences.rememberSessionHistory = false
    repository.save(preferences)
    #expect(repository.load() == preferences)
    defaults.set(Data("broken".utf8), forKey: "transight.mac.preferences.v1")
    #expect(repository.load() == Preferences())
}

@Test @MainActor func successAndHistoryPrivacy() async throws {
    let repository = MemoryPreferences()
    let store = AppStore(service: ImmediateService(), repository: repository)
    store.sourceText = "Hello"
    await store.translate()?.value
    #expect(!store.isTranslating)
    #expect(store.result?.result.text == "result: Hello")
    #expect(store.history.count == 1)
    let record = try #require(store.history.first)
    store.sourceText = "Changed"
    store.restore(record)
    #expect(store.sourceText == "Hello")
    store.preferences.rememberSessionHistory = false
    #expect(store.history.isEmpty)
    #expect(!repository.value.rememberSessionHistory)
    await store.translate()?.value
    #expect(store.history.isEmpty)
    #expect(store.result != nil)
}

@Test @MainActor func rejectsInvalidInputAndSurfacesServiceErrors() async {
    let store = AppStore(service: FailingService(), repository: MemoryPreferences())
    store.sourceText = "  "
    #expect(!store.canTranslate)
    #expect(store.translate() == nil)
    #expect(store.errorMessage != nil)
    store.sourceText = "Hello"
    await store.translate()?.value
    #expect(!store.isTranslating)
    #expect(store.result == nil)
    #expect(store.errorMessage == TranslationError.textTooLong.localizedDescription)
    #expect(store.history.isEmpty)
}

@Test @MainActor func canceledResponseCannotUpdateState() async {
    let service = SuspendedService()
    let store = AppStore(service: service, repository: MemoryPreferences())
    let task = store.translate()
    await service.waitUntilStarted()
    #expect(store.isTranslating)
    store.cancelTranslation()
    await service.finish()
    await task?.value
    #expect(!store.isTranslating)
    #expect(store.result == nil)
    #expect(store.errorMessage == nil)
    #expect(store.history.isEmpty)
}

@Test @MainActor func historyIsBoundedAndCanBeCleared() async {
    let store = AppStore(service: ImmediateService(), repository: MemoryPreferences())
    for index in 0..<105 {
        store.sourceText = "Text \(index)"
        await store.translate()?.value
    }
    #expect(store.history.count == 100)
    #expect(store.history.first?.request.text == "Text 104")
    store.clearHistory()
    #expect(store.history.isEmpty)
}

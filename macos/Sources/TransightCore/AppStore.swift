import Foundation
import Observation

@MainActor
@Observable
public final class AppStore {
    public var sourceText = "Let language connect you to the world, not limit it."
    public var preferences: Preferences {
        didSet {
            repository.save(preferences)
            if !preferences.rememberSessionHistory { history.removeAll() }
        }
    }
    public private(set) var result: TranslationRecord?
    public private(set) var history: [TranslationRecord] = []
    public private(set) var isTranslating = false
    public private(set) var errorMessage: String?

    @ObservationIgnored private let service: any TranslationService
    @ObservationIgnored private let repository: any PreferencesRepository
    @ObservationIgnored private var task: Task<Void, Never>?
    @ObservationIgnored private var requestID: UUID?

    public init(service: any TranslationService, repository: any PreferencesRepository) {
        self.service = service
        self.repository = repository
        preferences = repository.load()
    }

    public var canTranslate: Bool {
        !isTranslating && !sourceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && sourceText.trimmingCharacters(in: .whitespacesAndNewlines).count <= TranslationRequest.maximumTextLength
    }

    /// Returned task makes async behavior testable without timing-based UI tests.
    @discardableResult
    public func translate() -> Task<Void, Never>? {
        cancelTranslation()
        result = nil
        errorMessage = nil
        let request: TranslationRequest
        do {
            request = try TranslationRequest(
                text: sourceText, targetLanguage: preferences.targetLanguage, style: preferences.style
            )
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
        let id = UUID()
        requestID = id
        isTranslating = true
        let service = service
        task = Task { [weak self] in
            do {
                let response = try await service.translate(request)
                try Task.checkCancellation()
                guard let self, self.requestID == id else { return }
                let record = TranslationRecord(request: request, result: response)
                self.result = record
                if self.preferences.rememberSessionHistory {
                    self.history.insert(record, at: 0)
                    self.history = Array(self.history.prefix(100))
                }
            } catch is CancellationError {
                // Cancellation is user intent, not an error to display.
            } catch {
                guard let self, self.requestID == id else { return }
                self.errorMessage = error.localizedDescription
            }
            guard let self, self.requestID == id else { return }
            self.isTranslating = false
            self.requestID = nil
            self.task = nil
        }
        return task
    }

    public func cancelTranslation() {
        task?.cancel()
        task = nil
        requestID = nil
        isTranslating = false
    }

    public func clearHistory() { history.removeAll() }

    public func restore(_ record: TranslationRecord) {
        cancelTranslation()
        sourceText = record.request.text
        preferences.targetLanguage = record.request.targetLanguage
        preferences.style = record.request.style
        result = record
        errorMessage = nil
    }
}

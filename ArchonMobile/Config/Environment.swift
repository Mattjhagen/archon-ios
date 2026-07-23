import Foundation

enum Environment {
    case development
    case staging
    case production

    static var current: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    var supabaseURL: URL {
        switch self {
        case .development:
            return urlFromConfig(key: "SUPABASE_URL", fallback: "http://localhost:54321")
        case .staging:
            return urlFromConfig(key: "SUPABASE_URL", fallback: "http://localhost:54321")
        case .production:
            return urlFromConfig(key: "SUPABASE_URL", fallback: "http://localhost:54321")
        }
    }

    var supabaseAnonKey: String {
        Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String
            ?? ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]
            ?? "MOCK_ANON_KEY"
    }

    var apiBaseURL: URL {
        urlFromConfig(key: "API_BASE_URL", fallback: "http://localhost:8080/api")
    }

    private func urlFromConfig(key: String, fallback: String) -> URL {
        let urlString = Bundle.main.infoDictionary?[key] as? String
            ?? ProcessInfo.processInfo.environment[key]
            ?? fallback
        guard let url = URL(string: urlString) else {
            assertionFailure("Invalid URL for \(key): \(urlString)")
            return URL(string: fallback)!
        }
        return url
    }
}

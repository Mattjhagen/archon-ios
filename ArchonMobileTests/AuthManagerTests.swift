import XCTest
@testable import ArchonMobile

@MainActor
final class AuthManagerTests: XCTestCase {

    func testUserProfileProperties() {
        let profile = AuthManager.UserProfile(
            id: "user-123",
            email: "test@example.com",
            displayName: "Test User"
        )

        XCTAssertEqual(profile.id, "user-123")
        XCTAssertEqual(profile.email, "test@example.com")
        XCTAssertEqual(profile.displayName, "Test User")
    }

    func testUserProfileWithNilOptionalFields() {
        let profile = AuthManager.UserProfile(
            id: "user-456",
            email: nil,
            displayName: nil
        )

        XCTAssertEqual(profile.id, "user-456")
        XCTAssertNil(profile.email)
        XCTAssertNil(profile.displayName)
    }

    func testAuthManagerInitialState() {
        let manager = AuthManager.shared

        XCTAssertFalse(manager.isAuthenticated)
        XCTAssertFalse(manager.isSessionExpired)
        XCTAssertNil(manager.authError)
        XCTAssertFalse(manager.isLoading)
    }

    func testAuthManagerSharedIsSingleton() {
        let first = AuthManager.shared
        let second = AuthManager.shared

        XCTAssertTrue(first === second, "AuthManager.shared should return the same instance")
    }
}


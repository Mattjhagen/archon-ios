import XCTest
@testable import ArchonMobile

@MainActor
final class SettingsViewModelExtendedTests: XCTestCase {

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: "appearance")
        UserDefaults.standard.removeObject(forKey: "apiEndpoint")
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "appearance")
        UserDefaults.standard.removeObject(forKey: "apiEndpoint")
        super.tearDown()
    }

    func testDefaultAppearanceIsSystem() {
        let vm = SettingsViewModel()
        XCTAssertEqual(vm.appearance, .system)
    }

    func testSaveAndLoadAppearance() {
        let vm = SettingsViewModel()

        vm.saveAppearance(.dark)
        XCTAssertEqual(vm.appearance, .dark)

        let reloaded = SettingsViewModel()
        XCTAssertEqual(reloaded.appearance, .dark)
    }

    func testSaveAppearanceOverwrites() {
        let vm = SettingsViewModel()

        vm.saveAppearance(.dark)
        vm.saveAppearance(.light)
        XCTAssertEqual(vm.appearance, .light)

        let reloaded = SettingsViewModel()
        XCTAssertEqual(reloaded.appearance, .light)
    }

    func testSaveAPIEndpoint() {
        let vm = SettingsViewModel()

        vm.saveAPIEndpoint("https://custom.api.com/v2")
        XCTAssertEqual(vm.apiEndpoint, "https://custom.api.com/v2")

        let reloaded = SettingsViewModel()
        XCTAssertEqual(reloaded.apiEndpoint, "https://custom.api.com/v2")
    }

    func testAPIEndpointDefaultsToEnvironment() {
        let vm = SettingsViewModel()

        let expected = Environment.current.apiBaseURL.absoluteString
        XCTAssertEqual(vm.apiEndpoint, expected)
    }

    func testAppVersionLoadsFromBundle() {
        let vm = SettingsViewModel()

        let bundleVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        if let bundleVersion {
            XCTAssertEqual(vm.appVersion, bundleVersion)
        } else {
            XCTAssertEqual(vm.appVersion, "1.0.0")
        }
    }

    func testShowResetAlertDefaultFalse() {
        let vm = SettingsViewModel()
        XCTAssertFalse(vm.showResetAlert)
    }

    func testShowDeleteAlertDefaultFalse() {
        let vm = SettingsViewModel()
        XCTAssertFalse(vm.showDeleteAlert)
    }

    func testIsSigningOutDefaultFalse() {
        let vm = SettingsViewModel()
        XCTAssertFalse(vm.isSigningOut)
    }
}

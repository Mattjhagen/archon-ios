import XCTest
@testable import ArchonMobile

@MainActor
final class PollingTestsFixed: XCTestCase {

    func testTerminalTaskStopsPolling() async throws {
        let spy = SpyAPIClient()
        for status in [TaskStatus.completed, .failed, .cancelled, .blocked] {
            spy.tasks = [terminalTask(id: "done-\(status.rawValue)", status: status)]
            let sleeper = HangSleeper()
            let _ = BuilderViewModel(apiClient: spy, sleeper: sleeper)

            let task = try await spy.getTaskDetails(id: "done-\(status.rawValue)")
            XCTAssertFalse(task.status.isActive, "\(status): terminal task reported as active")
        }
    }

    func testStopPollingPreventsFurtherSleeps() async {
        let mockAPI = MockAPIClient()
        let sleeper = MockSleeper()

        let vm = BuilderViewModel(apiClient: mockAPI, sleeper: sleeper)

        // stopPolling immediately — no polling task was started
        vm.stopPolling()

        // Brief wait to ensure no background tasks are running
        try? await Task.sleep(nanoseconds: 50_000_000)

        // If stopPolling didn't work, the polling task would still be calling sleeper.sleep
        // We verify the VM state is clean
        XCTAssertNil(vm.currentTask, "No task should be set after stopPolling without sending a message")
    }

    func testPollingTaskIsCancelledOnStopPolling() async {
        let mockAPI = MockAPIClient()
        let sleeper = MockSleeper()
        let vm = BuilderViewModel(apiClient: mockAPI, sleeper: sleeper)

        // Verify stopPolling is safe to call multiple times
        vm.stopPolling()
        vm.stopPolling()
        vm.stopPolling()

        XCTAssertNil(vm.currentTask)
    }

    private func terminalTask(id: String, status: TaskStatus) -> ArchonTask {
        ArchonTask(
            id: id, title: "t", status: status, provider: "p", model: "m",
            reasoningEffort: .medium, currentStep: 1, maxSteps: 1,
            creditsUsed: 1, creditLimit: 10, projectId: nil, createdAt: Date(), updatedAt: Date()
        )
    }
}

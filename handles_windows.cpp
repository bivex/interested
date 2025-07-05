#include <windows.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <iostream>
#include <vector>
#include <algorithm>
#include <iomanip>
#include <thread>
#include <chrono>
#include <map>

#pragma comment(lib, "psapi.lib")

struct ProcessSnapshot {
    DWORD handleCount;
    double cpuTime;
    SIZE_T workingSetSize;
    std::chrono::steady_clock::time_point timestamp;
};

struct ProcessInfo {
    DWORD processId;
    std::wstring processName;
    DWORD handleCount;
    double cpuUsage;
    SIZE_T workingSetSize;
};

class SystemMonitor {
private:
    std::vector<ProcessInfo> processes;

    // Получить количество хендлов для процесса
    DWORD GetHandleCount(HANDLE hProcess) {
        DWORD handleCount = 0;
        if (!::GetProcessHandleCount(hProcess, &handleCount)) {
            return 0;
        }
        return handleCount;
    }

    // Получить имя процесса
    std::wstring GetProcessName(DWORD processId) {
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, processId);
        if (!hProcess) {
            return L"Unknown";
        }

        wchar_t processName[MAX_PATH];
        if (GetModuleBaseNameW(hProcess, NULL, processName, MAX_PATH)) {
            CloseHandle(hProcess);
            return std::wstring(processName);
        }

        CloseHandle(hProcess);
        return L"Unknown";
    }

    // Получить использование CPU (упрощенная версия)
    double GetProcessCpuUsage(HANDLE hProcess) {
        FILETIME creationTime, exitTime, kernelTime, userTime;
        if (!GetProcessTimes(hProcess, &creationTime, &exitTime, &kernelTime, &userTime)) {
            return 0.0;
        }

        // Для точного измерения CPU нужно два замера с интервалом
        // Здесь упрощенная версия
        ULARGE_INTEGER kernel, user;
        kernel.LowPart = kernelTime.dwLowDateTime;
        kernel.HighPart = kernelTime.dwHighDateTime;
        user.LowPart = userTime.dwLowDateTime;
        user.HighPart = userTime.dwHighDateTime;

        return static_cast<double>(kernel.QuadPart + user.QuadPart) / 10000.0; // Convert to ms
    }

    // Получить размер рабочего набора памяти
    SIZE_T GetProcessWorkingSetSize(HANDLE hProcess) {
        PROCESS_MEMORY_COUNTERS pmc;
        if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
            return pmc.WorkingSetSize;
        }
        return 0;
    }

public:
    void CollectProcessInfo() {
        processes.clear();

        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnapshot == INVALID_HANDLE_VALUE) {
            std::wcerr << L"Failed to create process snapshot" << std::endl;
            return;
        }

        PROCESSENTRY32W pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32W);

        if (Process32FirstW(hSnapshot, &pe32)) {
            do {
                HANDLE hProcess = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                    FALSE,
                    pe32.th32ProcessID
                );

                if (hProcess) {
                    ProcessInfo info;
                    info.processId = pe32.th32ProcessID;
                    info.processName = pe32.szExeFile;
                    info.handleCount = GetHandleCount(hProcess);
                    info.cpuUsage = GetProcessCpuUsage(hProcess);
                    info.workingSetSize = GetProcessWorkingSetSize(hProcess);

                    // Фильтруем процессы с высокой нагрузкой
                    if (info.handleCount > 100 || info.workingSetSize > 10 * 1024 * 1024) { // > 10MB
                        processes.push_back(info);
                    }

                    CloseHandle(hProcess);
                }
            } while (Process32NextW(hSnapshot, &pe32));
        }

        CloseHandle(hSnapshot);
    }

    void DisplayTopProcessesByHandles(int topCount = 10) {
        // Сортировка по количеству хендлов
        std::sort(processes.begin(), processes.end(),
            [](const ProcessInfo& a, const ProcessInfo& b) {
                return a.handleCount > b.handleCount;
            });

        std::wcout << L"\n=== TOP " << topCount << L" PROCESSES BY HANDLE COUNT ===" << std::endl;
        std::wcout << std::left << std::setw(8) << L"PID"
            << std::setw(25) << L"Process Name"
            << std::setw(12) << L"Handles"
            << std::setw(15) << L"Memory (MB)"
            << std::setw(12) << L"CPU Time" << std::endl;
        std::wcout << std::wstring(72, L'-') << std::endl;

        int count = 0;
        for (const auto& process : processes) {
            if (count >= topCount) break;

            double memoryMB = static_cast<double>(process.workingSetSize) / (1024.0 * 1024.0);

            std::wcout << std::left << std::setw(8) << process.processId
                << std::setw(25) << process.processName
                << std::setw(12) << process.handleCount
                << std::setw(15) << std::fixed << std::setprecision(2) << memoryMB
                << std::setw(12) << std::fixed << std::setprecision(2) << process.cpuUsage
                << std::endl;
            count++;
        }
    }

    void DisplaySystemSummary() {
        DWORD totalHandles = 0;
        SIZE_T totalMemory = 0;

        for (const auto& process : processes) {
            totalHandles += process.handleCount;
            totalMemory += process.workingSetSize;
        }

        std::wcout << L"\n=== SYSTEM SUMMARY ===" << std::endl;
        std::wcout << L"Total monitored processes: " << processes.size() << std::endl;
        std::wcout << L"Total handles: " << totalHandles << std::endl;
        std::wcout << L"Total memory usage: " << std::fixed << std::setprecision(2)
            << static_cast<double>(totalMemory) / (1024.0 * 1024.0) << L" MB" << std::endl;
    }

    void FindHandleLeaks(DWORD threshold = 1000) {
        std::wcout << L"\n=== POTENTIAL HANDLE LEAKS (>" << threshold << L" handles) ===" << std::endl;

        bool found = false;
        for (const auto& process : processes) {
            if (process.handleCount > threshold) {
                std::wcout << L"WARNING: " << process.processName
                    << L" (PID: " << process.processId
                    << L") has " << process.handleCount << L" handles!" << std::endl;
                found = true;
            }
        }

        if (!found) {
            std::wcout << L"No processes with excessive handle counts detected." << std::endl;
        }
    }
};

class RealTimeMonitor {
private:
    std::map<DWORD, ProcessSnapshot> previousSnapshots;
    std::map<DWORD, std::wstring> processNames;

public:
    struct ProcessMetrics {
        DWORD processId;
        std::wstring processName;
        DWORD handleCount;
        double cpuUsagePercent;
        SIZE_T workingSetSize;
        int handleDelta; // Изменение количества хендлов
    };

    std::vector<ProcessMetrics> GetCurrentMetrics() {
        std::vector<ProcessMetrics> metrics;
        auto currentTime = std::chrono::steady_clock::now();

        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnapshot == INVALID_HANDLE_VALUE) {
            return metrics;
        }

        PROCESSENTRY32W pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32W);

        if (Process32FirstW(hSnapshot, &pe32)) {
            do {
                HANDLE hProcess = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                    FALSE,
                    pe32.th32ProcessID
                );

                if (hProcess) {
                    ProcessMetrics metric;
                    metric.processId = pe32.th32ProcessID;
                    metric.processName = pe32.szExeFile;

                    // Получаем текущие метрики
                    ::GetProcessHandleCount(hProcess, &metric.handleCount);

                    PROCESS_MEMORY_COUNTERS pmc;
                    if (GetProcessMemoryInfo(hProcess, &pmc, sizeof(pmc))) {
                        metric.workingSetSize = pmc.WorkingSetSize;
                    }

                    // Вычисляем изменение хендлов
                    auto it = previousSnapshots.find(metric.processId);
                    if (it != previousSnapshots.end()) {
                        metric.handleDelta = static_cast<int>(metric.handleCount) -
                            static_cast<int>(it->second.handleCount);
                    }
                    else {
                        metric.handleDelta = 0;
                    }

                    // Фильтруем значимые процессы
                    if (metric.handleCount > 50 || metric.workingSetSize > 5 * 1024 * 1024) {
                        metrics.push_back(metric);
                    }

                    // Сохраняем для следующего цикла
                    ProcessSnapshot snapshot;
                    snapshot.handleCount = metric.handleCount;
                    snapshot.workingSetSize = metric.workingSetSize;
                    snapshot.timestamp = currentTime;
                    previousSnapshots[metric.processId] = snapshot;
                    processNames[metric.processId] = metric.processName;

                    CloseHandle(hProcess);
                }
            } while (Process32NextW(hSnapshot, &pe32));
        }

        CloseHandle(hSnapshot);
        return metrics;
    }

    void DisplayMetrics(const std::vector<ProcessMetrics>& metrics) {
        // Очистка экрана
        system("cls");

        // Сортировка по количеству хендлов
        auto sortedMetrics = metrics;
        std::sort(sortedMetrics.begin(), sortedMetrics.end(),
            [](const ProcessMetrics& a, const ProcessMetrics& b) {
                return a.handleCount > b.handleCount;
            });

        std::wcout << L"=== REAL-TIME HANDLE MONITOR ===" << std::endl;
        std::wcout << L"Updated: " << std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count() << L"s" << std::endl;
        std::wcout << std::endl;

        std::wcout << std::left << std::setw(8) << L"PID"
            << std::setw(25) << L"Process Name"
            << std::setw(10) << L"Handles"
            << std::setw(8) << L"Delta"
            << std::setw(12) << L"Memory(MB)" << std::endl;
        std::wcout << std::wstring(63, L'-') << std::endl;

        int count = 0;
        for (const auto& metric : sortedMetrics) {
            if (count >= 20) break; // Показываем топ 20

            double memoryMB = static_cast<double>(metric.workingSetSize) / (1024.0 * 1024.0);

            std::wcout << std::left << std::setw(8) << metric.processId
                << std::setw(25) << metric.processName
                << std::setw(10) << metric.handleCount;

            // Цветовая индикация изменений
            if (metric.handleDelta > 0) {
                std::wcout << L"+";
            }
            else if (metric.handleDelta < 0) {
                std::wcout << L" ";
            }
            else {
                std::wcout << L" ";
            }

            std::wcout << std::setw(7) << metric.handleDelta
                << std::setw(12) << std::fixed << std::setprecision(1) << memoryMB
                << std::endl;
            count++;
        }

        std::wcout << L"\nPress Ctrl+C to exit..." << std::endl;
    }

    void RunContinuousMonitoring(int intervalSeconds = 2) {
        while (true) {
            auto metrics = GetCurrentMetrics();
            DisplayMetrics(metrics);
            std::this_thread::sleep_for(std::chrono::seconds(intervalSeconds));
        }
    }
};

int main() {
    std::setlocale(LC_ALL, "Russian");

    std::wcout << L"Выберите режим работы:" << std::endl;
    std::wcout << L"1 - Разовый анализ" << std::endl;
    std::wcout << L"2 - Мониторинг в реальном времени" << std::endl;
    std::wcout << L"Выбор: ";

    int choice;
    std::wcin >> choice;

    if (choice == 2) {
        RealTimeMonitor monitor;
        monitor.RunContinuousMonitoring(2); // Обновление каждые 2 секунды
    }
    else {
        SystemMonitor monitor;
        monitor.CollectProcessInfo();
        monitor.DisplayTopProcessesByHandles(15);
        monitor.DisplaySystemSummary();
        monitor.FindHandleLeaks(800);

        std::wcout << L"\nPress any key to exit..." << std::endl;
        std::wcin.get();
        std::wcin.get(); // Дополнительный вызов для обработки Enter
    }

    return 0;
}

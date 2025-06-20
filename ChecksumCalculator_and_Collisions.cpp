#include <iostream>
#include <vector>
#include <cstdint>
#include <string>
#include <iomanip>
#include <functional>
#include <chrono>
#include <random>

class ChecksumCalculator {
public:
    // Простая контрольная сумма (суммирование)
    static uint32_t simpleSum(const std::vector<uint8_t>& data) {
        uint32_t sum = 0;
        for (uint8_t byte : data) {
            sum += byte;
        }
        return sum;
    }
       // Rolling hash (используется в алгоритме Rabin-Karp)
    static uint32_t rollingHash(const std::vector<uint8_t>& data) {
        const uint32_t base = 256;
        const uint32_t mod = 1000000007; // Большое простое число
        uint32_t hash = 0;
        uint32_t power = 1;
        
        for (uint8_t byte : data) {
            hash = (hash + (byte * power) % mod) % mod;
            power = (power * base) % mod;
        }
        
        return hash;
    }
    
    // Pearson hashing (8-bit)
    static uint8_t pearsonHash(const std::vector<uint8_t>& data) {
        // Таблица перестановок для Pearson hash
        static const uint8_t T[256] = {
            98, 6, 85, 150, 36, 23, 112, 164, 135, 207, 169, 5, 26, 64, 165, 219,
            61, 20, 68, 89, 130, 63, 52, 102, 24, 229, 132, 245, 80, 216, 195, 115,
            90, 168, 156, 203, 177, 120, 2, 190, 188, 7, 100, 185, 174, 243, 162, 10,
            237, 18, 253, 225, 8, 208, 172, 244, 255, 126, 101, 79, 145, 235, 228, 121,
            123, 251, 67, 250, 161, 0, 107, 97, 241, 111, 181, 82, 249, 33, 69, 55,
            59, 153, 29, 9, 213, 167, 84, 93, 30, 46, 94, 75, 151, 114, 73, 222,
            197, 96, 210, 45, 16, 227, 248, 202, 51, 152, 252, 125, 81, 206, 215, 186,
            39, 158, 178, 187, 131, 136, 1, 49, 50, 17, 141, 91, 47, 129, 60, 99,
            154, 35, 86, 171, 105, 34, 38, 200, 147, 58, 77, 118, 173, 246, 76, 254,
            133, 232, 196, 144, 198, 124, 53, 4, 108, 74, 223, 234, 134, 230, 157, 139,
            189, 205, 199, 128, 176, 19, 211, 236, 127, 192, 231, 70, 233, 88, 146, 44,
            183, 201, 22, 83, 13, 214, 116, 109, 159, 32, 95, 226, 140, 220, 57, 12,
            221, 31, 209, 182, 143, 92, 149, 184, 148, 62, 113, 65, 37, 27, 106, 166,
            3, 14, 204, 72, 21, 41, 56, 66, 28, 193, 40, 217, 25, 54, 179, 117,
            238, 87, 240, 155, 180, 170, 242, 212, 191, 163, 78, 218, 137, 194, 175, 110,
            43, 119, 224, 71, 122, 142, 42, 160, 104, 48, 247, 103, 15, 11, 138, 239
        };
        
        uint8_t hash = 0;
        for (uint8_t byte : data) {
            hash = T[hash ^ byte];
        }
        return hash;
    }
    // Алгоритм Флетчера (Fletcher-16)
    static uint16_t fletcher16(const std::vector<uint8_t>& data) {
        uint16_t sum1 = 0;
        uint16_t sum2 = 0;
        
        for (uint8_t byte : data) {
            sum1 = (sum1 + byte) % 255;
            sum2 = (sum2 + sum1) % 255;
        }
        
        return (sum2 << 8) | sum1;
    }
    
    // CRC-32 (IEEE 802.3)
    static uint32_t crc32(const std::vector<uint8_t>& data) {
        static bool tableInitialized = false;
        static uint32_t crcTable[256];
        
        if (!tableInitialized) {
            for (int i = 0; i < 256; i++) {
                uint32_t crc = i;
                for (int j = 8; j > 0; j--) {
                    if (crc & 1) {
                        crc = (crc >> 1) ^ 0xEDB88320; // IEEE 802.3 полином
                    } else {
                        crc >>= 1;
                    }
                }
                crcTable[i] = crc;
            }
            tableInitialized = true;
        }
        
        uint32_t crc = 0xFFFFFFFF;
        for (uint8_t byte : data) {
            crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >> 8);
        }
        
        return crc ^ 0xFFFFFFFF;
    }
    
    // Модифицированная контрольная сумма с позиционным весом
    static uint32_t weightedSum(const std::vector<uint8_t>& data) {
        uint32_t sum = 0;
        for (size_t i = 0; i < data.size(); i++) {
            sum += data[i] * (i + 1);
        }
        return sum;
    }
    
    // XOR-based checksum
    static uint8_t xorChecksum(const std::vector<uint8_t>& data) {
        uint8_t checksum = 0;
        for (uint8_t byte : data) {
            checksum ^= byte;
        }
        return checksum;
    }
    
    // Adler-32 (используется в zlib)
    static uint32_t adler32(const std::vector<uint8_t>& data) {
        const uint32_t MOD_ADLER = 65521;
        uint32_t a = 1, b = 0;
        
        for (uint8_t byte : data) {
            a = (a + byte) % MOD_ADLER;
            b = (b + a) % MOD_ADLER;
        }
        
        return (b << 16) | a;
    }
    
    // Простой hash с использованием простых чисел
    static uint32_t simpleHash(const std::vector<uint8_t>& data) {
        uint32_t hash = 0;
        const uint32_t prime = 31;
        
        for (size_t i = 0; i < data.size(); i++) {
            hash = hash * prime + data[i];
        }
        
        return hash;
    }
};

// Расширенное тестирование
void comprehensiveTest() {
    std::cout << "=== Комплексное тестирование ===" << std::endl;
    
    // Различные типы ошибок
    std::vector<uint8_t> original = {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0};
    
    std::vector<std::vector<uint8_t>> errorTypes = {
        {0x12, 0x56, 0x34, 0x78, 0x9A, 0xBC, 0xDE, 0xF0}, // Перестановка соседних
        {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF1}, // Изменение 1 бита
        {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDF, 0xF0}, // Изменение в середине
        {0x13, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0}, // Изменение в начале
        {0x78, 0x34, 0x56, 0x12, 0x9A, 0xBC, 0xDE, 0xF0}, // Перестановка дальних
        {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE},       // Потеря байта
        {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x00} // Лишний байт
    };
    
    std::vector<std::string> errorNames = {
        "Перестановка соседних",
        "Изменение 1 бита",
        "Изменение в середине",
        "Изменение в начале",
        "Перестановка дальних",
        "Потеря байта",
        "Лишний байт"
    };
    
    // Тестируем каждый алгоритм
    struct Algorithm {
        std::string name;
        std::function<uint32_t(const std::vector<uint8_t>&)> func;
    };
    
    std::vector<Algorithm> algorithms = {
        {"Простая сумма", [](const auto& d) { return ChecksumCalculator::simpleSum(d); }},
        {"Fletcher-16", [](const auto& d) { return ChecksumCalculator::fletcher16(d); }},
        {"CRC-32", [](const auto& d) { return ChecksumCalculator::crc32(d); }},
        {"Взвешенная сумма", [](const auto& d) { return ChecksumCalculator::weightedSum(d); }},
        {"XOR", [](const auto& d) { return ChecksumCalculator::xorChecksum(d); }},
        {"Adler-32", [](const auto& d) { return ChecksumCalculator::adler32(d); }},
        {"Простой hash", [](const auto& d) { return ChecksumCalculator::simpleHash(d); }}
    };
    
    // Создаем таблицу результатов
    std::cout << std::left << std::setw(18) << "Алгоритм";
    for (const auto& errorName : errorNames) {
        std::cout << std::setw(12) << errorName.substr(0, 11);
    }
    std::cout << std::endl;
    
    std::cout << std::string(18 + 12 * errorNames.size(), '-') << std::endl;
    
    for (const auto& algo : algorithms) {
        std::cout << std::setw(18) << algo.name;
        
        uint32_t originalChecksum = algo.func(original);
        
        for (size_t i = 0; i < errorTypes.size(); i++) {
            uint32_t errorChecksum = algo.func(errorTypes[i]);
            bool detected = (originalChecksum != errorChecksum);
            std::cout << std::setw(12) << (detected ? "✓" : "✗");
        }
        std::cout << std::endl;
    }
}

// Тестирование производительности
void performanceTest() {
    std::cout << "\n=== Тест производительности ===" << std::endl;
    
    // Создаем большой массив данных
    std::vector<uint8_t> bigData(1000000);
    for (size_t i = 0; i < bigData.size(); i++) {
        bigData[i] = static_cast<uint8_t>(i % 256);
    }
    
    std::cout << "Размер данных: " << bigData.size() << " байт" << std::endl;
    
    auto measure = [&](const std::string& name, auto func) {
        auto start = std::chrono::high_resolution_clock::now();
        auto result = func(bigData);
        auto end = std::chrono::high_resolution_clock::now();
        
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        std::cout << std::setw(16) << name << ": " << std::setw(8) << duration.count() 
                  << " мкс, результат: 0x" << std::hex << result << std::dec << std::endl;
    };
    
    measure("Простая сумма", ChecksumCalculator::simpleSum);
    measure("Fletcher-16", ChecksumCalculator::fletcher16);
    measure("CRC-32", ChecksumCalculator::crc32);
    measure("Adler-32", ChecksumCalculator::adler32);
}
// Анализ коллизий
void collisionAnalysis() {
    std::cout << "\n=== Анализ коллизий ===" << std::endl;
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 255);
    
    const int numTests = 100000;
    const int dataSize = 8;
    
    struct CollisionStats {
        std::string name;
        std::function<uint32_t(const std::vector<uint8_t>&)> func;
        std::unordered_map<uint32_t, int> hashCounts;
        int totalCollisions = 0;
    };
    
    std::vector<CollisionStats> stats = {
        {"Простая сумма", [](const auto& d) { return ChecksumCalculator::simpleSum(d); }},
        {"Fletcher-16", [](const auto& d) { return ChecksumCalculator::fletcher16(d); }},
        {"CRC-32", [](const auto& d) { return ChecksumCalculator::crc32(d); }},
        {"XOR", [](const auto& d) { return (uint32_t)ChecksumCalculator::xorChecksum(d); }},
        {"Rolling Hash", [](const auto& d) { return ChecksumCalculator::rollingHash(d); }},
        {"Pearson", [](const auto& d) { return (uint32_t)ChecksumCalculator::pearsonHash(d); }}
    };
    
    // Генерируем случайные данные и считаем коллизии
    for (int test = 0; test < numTests; test++) {
        std::vector<uint8_t> data(dataSize);
        for (int i = 0; i < dataSize; i++) {
            data[i] = dis(gen);
        }
        
        for (auto& stat : stats) {
            uint32_t hash = stat.func(data);
            stat.hashCounts[hash]++;
        }
    }
    
    // Подсчитываем коллизии
    for (auto& stat : stats) {
        for (const auto& pair : stat.hashCounts) {
            if (pair.second > 1) {
                stat.totalCollisions += pair.second - 1;
            }
        }
    }
    
    std::cout << std::left << std::setw(16) << "Алгоритм" 
              << std::setw(12) << "Коллизии" 
              << std::setw(16) << "Уникальные хеши" 
              << "Процент коллизий" << std::endl;
    std::cout << std::string(60, '-') << std::endl;
    
    for (const auto& stat : stats) {
        double collisionRate = (double)stat.totalCollisions / numTests * 100;
        std::cout << std::setw(16) << stat.name
                  << std::setw(12) << stat.totalCollisions
                  << std::setw(16) << stat.hashCounts.size()
                  << std::fixed << std::setprecision(2) << collisionRate << "%" << std::endl;
    }
}

// Тест на специфические паттерны ошибок
void patternErrorTest() {
    std::cout << "\n=== Тест специфических паттернов ошибок ===" << std::endl;
    
    std::vector<uint8_t> base = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07};
    
    std::vector<std::pair<std::string, std::vector<uint8_t>>> patterns = {
        {"Все нули", {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}},
        {"Все единицы", {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}},
        {"Реверс", {0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00}},
        {"Циклический сдвиг", {0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x00}},
        {"Удвоение", {0x00, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03, 0x03}},
        {"Чередование", {0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF}}
    };
    
    struct Algorithm {
        std::string name;
        std::function<uint32_t(const std::vector<uint8_t>&)> func;
    };
    
    std::vector<Algorithm> algorithms = {
        {"Простая сумма", [](const auto& d) { return ChecksumCalculator::simpleSum(d); }},
        {"Fletcher-16", [](const auto& d) { return ChecksumCalculator::fletcher16(d); }},
        {"CRC-32", [](const auto& d) { return ChecksumCalculator::crc32(d); }},
        {"Pearson", [](const auto& d) { return (uint32_t)ChecksumCalculator::pearsonHash(d); }}
    };
    
    uint32_t baseChecksum[4];
    for (int i = 0; i < 4; i++) {
        baseChecksum[i] = algorithms[i].func(base);
    }
    
    std::cout << std::left << std::setw(20) << "Паттерн";
    for (const auto& algo : algorithms) {
        std::cout << std::setw(15) << algo.name;
    }
    std::cout << std::endl;
    std::cout << std::string(20 + 15 * algorithms.size(), '-') << std::endl;
    
    for (const auto& pattern : patterns) {
        std::cout << std::setw(20) << pattern.first;
        
        for (int i = 0; i < algorithms.size(); i++) {
            uint32_t checksum = algorithms[i].func(pattern.second);
            bool different = (checksum != baseChecksum[i]);
            std::cout << std::setw(15) << (different ? "✓" : "✗");
        }
        std::cout << std::endl;
    }
}
int main() {
    comprehensiveTest();
    performanceTest();
        // Новые тесты
    collisionAnalysis();
    patternErrorTest();
    
    return 0;
}

#!/usr/bin/env python3
"""
Поиск устройств с проблемами в Windows Device Manager
"""

import subprocess
import re
import sys


def get_device_manager_devices():
    """Получает список всех устройств из Device Manager"""
    try:
        # Используем PowerShell для получения информации о устройствах
        cmd = [
            "powershell",
            "-Command",
            "Get-PnpDevice | Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize",
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="cp1251", errors="ignore"
        )
        return result.stdout if result.stdout else ""
    except Exception as e:
        print(f"Ошибка получения списка устройств: {e}")
        return ""


def get_problem_devices():
    """Получает устройства с проблемами через WMI"""
    try:
        cmd = [
            "powershell",
            "-Command",
            """
            Get-WmiObject -Class Win32_PnPEntity | Where-Object {
                $_.Status -ne "OK" -and $_.Status -ne $null
            } | Select-Object Name, Status, DeviceID, ClassGuid | Format-Table -AutoSize
            """,
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="cp1251", errors="ignore"
        )
        return result.stdout if result.stdout else ""
    except Exception as e:
        print(f"Ошибка получения проблемных устройств: {e}")
        return ""


def get_usb_devices():
    """Получает USB устройства"""
    try:
        cmd = [
            "powershell",
            "-Command",
            """
            Get-WmiObject -Class Win32_USBHub | Select-Object Name, DeviceID, Status | Format-Table -AutoSize
            """,
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="cp1251", errors="ignore"
        )
        return result.stdout if result.stdout else ""
    except Exception as e:
        print(f"Ошибка получения USB устройств: {e}")
        return ""


def get_android_devices():
    """Ищет Android устройства"""
    try:
        cmd = [
            "powershell",
            "-Command",
            """
            Get-WmiObject -Class Win32_PnPEntity | Where-Object {
                $_.Name -match "Android" -or 
                $_.Name -match "ADB" -or 
                $_.Name -match "Xiaomi" -or
                $_.Name -match "Mi " -or
                $_.Name -match "USB.*Android" -or
                $_.DeviceID -match "VID_18D1" -or
                $_.DeviceID -match "VID_2717"
            } | Select-Object Name, Status, DeviceID, ClassGuid | Format-Table -AutoSize
            """,
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="cp1251", errors="ignore"
        )
        return result.stdout if result.stdout else ""
    except Exception as e:
        print(f"Ошибка поиска Android устройств: {e}")
        return ""


def main():
    print("=" * 60)
    print("ПОИСК ПРОБЛЕМНЫХ УСТРОЙСТВ В DEVICE MANAGER")
    print("=" * 60)

    print("\n1. Все устройства с проблемами:")
    print("-" * 40)
    problem_devices = get_problem_devices()
    if problem_devices and problem_devices.strip():
        print(problem_devices)
    else:
        print("Проблемных устройств не найдено")

    print("\n2. Android/Xiaomi устройства:")
    print("-" * 40)
    android_devices = get_android_devices()
    if android_devices and android_devices.strip():
        print(android_devices)
    else:
        print("Android/Xiaomi устройства не найдены")

    print("\n3. USB устройства:")
    print("-" * 40)
    usb_devices = get_usb_devices()
    if usb_devices and usb_devices.strip():
        print(usb_devices)
    else:
        print("USB устройства не найдены")

    print("\n4. Полный список устройств:")
    print("-" * 40)
    all_devices = get_device_manager_devices()
    if all_devices and all_devices.strip():
        print(all_devices)
    else:
        print("Не удалось получить список устройств")

    print("\n" + "=" * 60)
    print("РЕКОМЕНДАЦИИ:")
    print("=" * 60)
    print("1. Подключите ваше Xiaomi устройство")
    print("2. Включите отладку по USB на устройстве")
    print("3. Запустите скрипт снова")
    print("4. Ищите устройства со статусом 'Error' или 'Unknown'")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
GitHub Data Collector (GraphQL Version)
Скрипт для сбора информации о форках и issues пользователя из GitHub GraphQL API

Эта версия использует GraphQL API вместо REST API для более эффективного сбора данных.

Требования:
- Python 3.6+
- requests library
- GitHub Personal Access Token (PAT)

Установка зависимостей:
pip install requests

Использование:
1. Создайте PAT токен в GitHub (Settings → Developer settings → Personal access tokens)
2. Установите переменную окружения GITHUB_TOKEN или измените TOKEN в скрипте
3. Запустите скрипт: python github_data_collector_graphql.py

Преимущества GraphQL версии:
- Один запрос для получения всех данных
- Более эффективное использование API (меньше запросов)
- Точные поля данных без лишней информации
- Лучшая производительность для больших объемов данных
"""

import os
import json
import csv
import time
import sys
import base64
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import requests


@dataclass
class LicenseResult:
    repo_name: str
    success: bool
    license_type: str
    message: str
    already_had_license: bool = False
    error: Optional[str] = None


class GitHubLicenseBatchManager:
    """Менеджер для массового добавления лицензий в GitHub репозитории"""

    def __init__(self, token: str):
        self.token = token
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
        self.base_url = 'https://api.github.com'
        self.session = requests.Session()
        self.session.headers.update(self.headers)

        # Доступные лицензии
        self.available_licenses = [
            'MIT', 'Apache-2.0', 'GPL-3.0', 'GPL-2.0', 'BSD-3-Clause',
            'BSD-2-Clause', 'ISC', 'LGPL-3.0', 'LGPL-2.1', 'Unlicense'
        ]

    def get_authenticated_user(self) -> Optional[str]:
        """Получение имени текущего пользователя"""
        url = f'{self.base_url}/user'
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            user_data = response.json()
            return user_data.get('login')
        return None

    def get_user_info(self) -> Optional[Dict]:
        """Получение информации о пользователе"""
        url = f'{self.base_url}/user'
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            return response.json()
        return None

    def get_my_repos(self, include_forks: bool = False) -> List[Tuple[str, str, Dict]]:
        """Получение всех репозиториев пользователя"""
        url = f'{self.base_url}/user/repos'
        params = {
            'type': 'all',
            'per_page': 100,
            'sort': 'updated',
            'direction': 'desc'
        }

        all_repos = []
        page = 1

        print("🔍 Получаем список ваших репозиториев...")

        while True:
            params['page'] = page
            response = requests.get(url, headers=self.headers, params=params)

            if response.status_code != 200:
                print(f"❌ Ошибка при получении репозиториев: {response.status_code}")
                break

            repos = response.json()
            if not repos:
                break

            for repo in repos:
                # Фильтрация форков если нужно
                if not include_forks and repo.get('fork', False):
                    continue

                all_repos.append((repo['owner']['login'], repo['name'], repo))

            print(f"📄 Обработана страница {page}, найдено {len(repos)} репозиториев")
            page += 1

            if page > 100:
                break

        print(f"✅ Всего найдено {len(all_repos)} репозиториев")
        return all_repos

    def check_existing_license(self, owner: str, repo: str) -> Optional[Dict]:
        """Проверка наличия лицензии в репозитории"""
        # Проверка через API
        url = f'{self.base_url}/repos/{owner}/{repo}'
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            repo_data = response.json()
            api_license = repo_data.get('license')
            if api_license:
                return {
                    'source': 'api',
                    'license': api_license.get('name', 'Unknown'),
                    'key': api_license.get('key', '')
                }

        # Проверка файлов лицензий
        license_files = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'LICENCE', 'COPYING']

        for license_file in license_files:
            file_url = f'{self.base_url}/repos/{owner}/{repo}/contents/{license_file}'
            file_response = requests.get(file_url, headers=self.headers)

            if file_response.status_code == 200:
                return {
                    'source': 'file',
                    'license': 'Unknown (file exists)',
                    'file': license_file
                }

        return None

    def get_license_template(self, license_key: str) -> Optional[str]:
        """Получение шаблона лицензии"""
        url = f'{self.base_url}/licenses/{license_key}'
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            return response.json()['body']
        return None

    def prepare_license_content(self, license_key: str, author_name: str = None,
                               author_email: str = None, year: int = None) -> Optional[str]:
        """Подготовка содержимого лицензии с заменой placeholders"""
        license_content = self.get_license_template(license_key)
        if not license_content:
            return None

        # Замена placeholders
        current_year = year or datetime.now().year

        replacements = {
            '[year]': str(current_year),
            '[yyyy]': str(current_year),
            '[fullname]': author_name or 'Author',
            '[name of copyright owner]': author_name or 'Author',
            '[email]': author_email or 'author@example.com'
        }

        for placeholder, replacement in replacements.items():
            license_content = license_content.replace(placeholder, replacement)

        return license_content

    def add_license_to_repo(self, owner: str, repo: str, license_key: str,
                           author_name: str = None, author_email: str = None,
                           force: bool = False) -> LicenseResult:
        """Добавление лицензии в репозиторий"""
        repo_full_name = f"{owner}/{repo}"

        # Проверка существующей лицензии
        existing_license = self.check_existing_license(owner, repo)
        if existing_license and not force:
            return LicenseResult(
                repo_name=repo_full_name,
                success=False,
                license_type=existing_license['license'],
                message=f"Лицензия уже существует: {existing_license['license']}",
                already_had_license=True
            )

        # Подготовка содержимого лицензии
        license_content = self.prepare_license_content(license_key, author_name, author_email)
        if not license_content:
            return LicenseResult(
                repo_name=repo_full_name,
                success=False,
                license_type=license_key,
                message="Не удалось получить шаблон лицензии",
                error="Template not found"
            )

        # Создание файла LICENSE
        url = f'{self.base_url}/repos/{owner}/{repo}/contents/LICENSE'

        content_encoded = base64.b64encode(license_content.encode('utf-8')).decode('utf-8')

        data = {
            'message': f'Add {license_key} license',
            'content': content_encoded,
            'committer': {
                'name': author_name or 'GitHub API',
                'email': author_email or 'noreply@github.com'
            }
        }

        response = requests.put(url, headers=self.headers, json=data)

        if response.status_code == 201:
            return LicenseResult(
                repo_name=repo_full_name,
                success=True,
                license_type=license_key,
                message="Лицензия успешно добавлена"
            )
        else:
            error_msg = "Unknown error"
            if response.status_code == 409:
                error_msg = "Файл LICENSE уже существует"
            elif response.status_code == 403:
                error_msg = "Нет прав на запись в репозиторий"
            elif response.status_code == 404:
                error_msg = "Репозиторий не найден"

            return LicenseResult(
                repo_name=repo_full_name,
                success=False,
                license_type=license_key,
                message=f"Ошибка добавления лицензии: {error_msg}",
                error=f"HTTP {response.status_code}"
            )

    def batch_add_licenses(self, license_key: str, author_name: str = None,
                          author_email: str = None, include_forks: bool = False,
                          force: bool = False, exclude_repos: List[str] = None,
                          include_only: List[str] = None) -> List[LicenseResult]:
        """Массовое добавление лицензий во все репозитории"""

        exclude_repos = exclude_repos or []

        # Получение информации о пользователе
        user_info = self.get_user_info()
        if user_info and not author_name:
            author_name = user_info.get('name') or user_info.get('login')
        if user_info and not author_email:
            author_email = user_info.get('email')

        # Получение списка репозиториев
        repos = self.get_my_repos(include_forks=include_forks)

        # Фильтрация репозиториев
        if include_only:
            repos = [(o, r, d) for o, r, d in repos if f"{o}/{r}" in include_only]

        repos = [(o, r, d) for o, r, d in repos if f"{o}/{r}" not in exclude_repos]

        if not repos:
            print("❌ Нет репозиториев для обработки")
            return []

        print(f"\n🚀 Начинаем добавление лицензии {license_key} в {len(repos)} репозиториев")
        print(f"👤 Автор: {author_name}")
        print(f"📧 Email: {author_email}")
        print(f"🔄 Принудительное обновление: {'Да' if force else 'Нет'}")

        results = []

        for i, (owner, repo, repo_data) in enumerate(repos, 1):
            print(f"\n[{i}/{len(repos)}] Обработка {owner}/{repo}...")

            # Задержка для избежания rate limiting
            if i > 1:
                time.sleep(1)

            result = self.add_license_to_repo(
                owner, repo, license_key, author_name, author_email, force
            )

            results.append(result)

            # Вывод результата
            if result.success:
                print(f"✅ {result.message}")
            elif result.already_had_license:
                print(f"⚠️ {result.message}")
            else:
                print(f"❌ {result.message}")

        return results

    def interactive_batch_setup(self):
        """Интерактивная настройка batch добавления лицензий"""
        print("🎯 Интерактивная настройка добавления лицензий")
        print("=" * 50)

        # Получение информации о пользователе
        user_info = self.get_user_info()
        if not user_info:
            print("❌ Не удалось получить информацию о пользователе")
            return

        username = user_info.get('login')
        user_name = user_info.get('name') or username
        user_email = user_info.get('email')

        print(f"👤 Пользователь: {username}")
        print(f"📝 Имя: {user_name}")
        print(f"📧 Email: {user_email or 'Не указан'}")

        # Выбор лицензии
        print("\n📋 Доступные лицензии:")
        for i, license_type in enumerate(self.available_licenses, 1):
            print(f"{i}. {license_type}")

        while True:
            try:
                choice = input(f"\nВыберите лицензию (1-{len(self.available_licenses)}): ").strip()
                license_index = int(choice) - 1
                if 0 <= license_index < len(self.available_licenses):
                    selected_license = self.available_licenses[license_index]
                    break
                else:
                    print("❌ Неверный выбор")
            except ValueError:
                print("❌ Введите число")

        # Настройка автора
        custom_name = input(f"\nИмя автора [{user_name}]: ").strip()
        author_name = custom_name if custom_name else user_name

        custom_email = input(f"Email автора [{user_email or 'noreply@github.com'}]: ").strip()
        author_email = custom_email if custom_email else (user_email or 'noreply@github.com')

        # Дополнительные опции
        include_forks = input("\nВключить форки? (y/n) [n]: ").strip().lower() in ['y', 'yes']
        force = input("Принудительно обновить существующие лицензии? (y/n) [n]: ").strip().lower() in ['y', 'yes']

        # Исключения
        exclude_input = input("\nРепозитории для исключения (через запятую): ").strip()
        exclude_repos = [repo.strip() for repo in exclude_input.split(',') if repo.strip()]

        # Подтверждение
        print("\n📊 Настройки:")
        print(f"   Лицензия: {selected_license}")
        print(f"   Автор: {author_name}")
        print(f"   Email: {author_email}")
        print(f"   Включить форки: {'Да' if include_forks else 'Нет'}")
        print(f"   Принудительное обновление: {'Да' if force else 'Нет'}")
        print(f"   Исключить: {', '.join(exclude_repos) if exclude_repos else 'Нет'}")

        confirm = input("\nПродолжить? (y/n): ").strip().lower()
        if confirm not in ['y', 'yes']:
            print("❌ Отменено")
            return

        # Запуск batch обработки
        results = self.batch_add_licenses(
            license_key=selected_license,
            author_name=author_name,
            author_email=author_email,
            include_forks=include_forks,
            force=force,
            exclude_repos=exclude_repos
        )

        # Отчет
        self.print_batch_report(results)

        # Сохранение отчета
        save_report = input("\n💾 Сохранить отчет в файл? (y/n): ").strip().lower()
        if save_report in ['y', 'yes']:
            self.save_batch_report(results, selected_license)

    def print_batch_report(self, results: List[LicenseResult]):
        """Вывод отчета о batch операции"""
        print("\n" + "=" * 80)
        print("📊 ОТЧЕТ О ДОБАВЛЕНИИ ЛИЦЕНЗИЙ")
        print("=" * 80)

        successful = [r for r in results if r.success]
        already_licensed = [r for r in results if r.already_had_license]
        failed = [r for r in results if not r.success and not r.already_had_license]

        print(f"\n✅ Успешно добавлено: {len(successful)}")
        print(f"⚠️ Уже имели лицензию: {len(already_licensed)}")
        print(f"❌ Ошибки: {len(failed)}")
        print(".1f")
        if successful:
            print("\n{'='*20} УСПЕШНО ДОБАВЛЕНО {'='*20}")
            for result in successful:
                print(f"✅ {result.repo_name} - {result.license_type}")

        if already_licensed:
            print("\n{'='*20} УЖЕ ИМЕЛИ ЛИЦЕНЗИЮ {'='*20}")
            for result in already_licensed:
                print(f"⚠️ {result.repo_name} - {result.license_type}")

        if failed:
            print("\n{'='*20} ОШИБКИ {'='*20}")
            for result in failed:
                print(f"❌ {result.repo_name} - {result.message}")

    def save_batch_report(self, results: List[LicenseResult], license_type: str):
        """Сохранение отчета в файл"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"license_batch_report_{license_type}_{timestamp}.json"

        report_data = {
            'timestamp': datetime.now().isoformat(),
            'license_type': license_type,
            'total_repos': len(results),
            'successful': len([r for r in results if r.success]),
            'already_licensed': len([r for r in results if r.already_had_license]),
            'failed': len([r for r in results if not r.success and not r.already_had_license]),
            'results': [
                {
                    'repo_name': r.repo_name,
                    'success': r.success,
                    'license_type': r.license_type,
                    'message': r.message,
                    'already_had_license': r.already_had_license,
                    'error': r.error
                }
                for r in results
            ]
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        print(f"💾 Отчет сохранен в {filename}")

    def check_topics_presence(self) -> Dict[str, Any]:
        """
        Проверяет наличие тегов (топиков) во всех репозиториях пользователя
        """
        print("🏷️ Проверяем наличие тегов (топиков) во всех репозиториях...")

        # Создаем экземпляр GitHubDataCollector для получения данных с топиками через GraphQL
        collector = GitHubDataCollector(self.token)
        repos = collector.get_user_repositories()

        if not repos:
            return {"error": "Не удалось получить репозитории"}

        topics_status = {
            "with_topics": [],
            "without_topics": [],
            "errors": []
        }

        print(f"Анализируем {len(repos)} репозиториев...")

        for i, repo_data in enumerate(repos, 1):
            repo_full_name = repo_data.get("nameWithOwner", "unknown/unknown")
            print(f"  {i}/{len(repos)}: {repo_full_name}")

            try:
                # Проверяем топики через GraphQL
                repository_topics = repo_data.get("repositoryTopics", {}).get("nodes", [])
                has_topics_graphql = bool(repository_topics and len(repository_topics) > 0)

                current_topics = []
                if has_topics_graphql:
                    current_topics = [node.get("topic", {}).get("name", "") for node in repository_topics]

                if has_topics_graphql:
                    topics_status["with_topics"].append({
                        "repo": repo_full_name,
                        "topics": current_topics,
                        "topics_count": len(current_topics),
                        "url": f"https://github.com/{repo_full_name}",
                        "stars": repo_data.get("stargazerCount", 0)
                    })
                else:
                    topics_status["without_topics"].append({
                        "repo": repo_full_name,
                        "url": f"https://github.com/{repo_full_name}",
                        "stars": repo_data.get("stargazerCount", 0),
                        "description": repo_data.get("description", "")
                    })

            except Exception as e:
                topics_status["errors"].append({
                    "repo": repo_full_name,
                    "error": str(e)
                })

        result = {
            "total_repos": len(repos),
            "with_topics_count": len(topics_status["with_topics"]),
            "without_topics_count": len(topics_status["without_topics"]),
            "errors_count": len(topics_status["errors"]),
            "topics_percentage": round(len(topics_status["with_topics"]) / len(repos) * 100, 1) if repos else 0,
            "details": topics_status
        }

        print("\n🏷️ РЕЗУЛЬТАТЫ ПРОВЕРКИ ТЕГОВ:")
        print(f"Всего репозиториев: {result['total_repos']}")
        print(f"С тегами: {result['with_topics_count']} ({result['topics_percentage']}%)")
        print(f"Без тегов: {result['without_topics_count']}")
        print(f"Ошибки проверки: {result['errors_count']}")

        return result

    def save_topics_check_to_csv(self, topics_data: Dict[str, Any], filename: str):
        """Сохранить результаты проверки тегов в CSV"""
        if not topics_data or "details" not in topics_data:
            print("Нет данных для сохранения")
            return

        details = topics_data["details"]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Заголовок
            writer.writerow(["Анализ наличия тегов (топиков)"])
            writer.writerow([])

            # Общая статистика
            writer.writerow(["Общая статистика"])
            writer.writerow(["Показатель", "Значение"])
            writer.writerow(["Всего репозиториев", topics_data.get("total_repos", 0)])
            writer.writerow(["С тегами", f"{topics_data.get('with_topics_count', 0)} ({topics_data.get('topics_percentage', 0)}%)"])
            writer.writerow(["Без тегов", topics_data.get("without_topics_count", 0)])
            writer.writerow(["Ошибки", topics_data.get("errors_count", 0)])
            writer.writerow([])

            # Репозитории с тегами
            if details.get("with_topics"):
                writer.writerow(["Репозитории С ТЕГАМИ"])
                writer.writerow(["Репозиторий", "Количество тегов", "Теги", "Звезды", "URL"])
                for repo in sorted(details["with_topics"], key=lambda x: x.get("topics_count", 0), reverse=True):
                    topics_str = ", ".join(repo.get("topics", [])[:5])  # Ограничим до 5 тегов для читаемости
                    if len(repo.get("topics", [])) > 5:
                        topics_str += f" (+{len(repo.get('topics', [])) - 5} ещё)"
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("topics_count", 0),
                        topics_str,
                        repo.get("stars", 0),
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Репозитории без тегов
            if details.get("without_topics"):
                writer.writerow(["Репозитории БЕЗ ТЕГОВ"])
                writer.writerow(["Репозиторий", "Звезды", "Описание", "URL"])
                for repo in sorted(details["without_topics"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("description", "")[:50] if repo.get("description") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Ошибки
            if details.get("errors"):
                writer.writerow(["ОШИБКИ ПРОВЕРКИ"])
                writer.writerow(["Репозиторий", "Ошибка"])
                for error in details["errors"]:
                    writer.writerow([
                        error.get("repo", ""),
                        error.get("error", "")
                    ])

        print(f"Результаты проверки тегов сохранены в {filename}")

    def check_readme_presence(self, include_forks: bool = False) -> Dict[str, Any]:
        """
        Проверяет наличие README файлов во всех репозиториях пользователя
        """
        print("🔍 Проверяем наличие README файлов во всех репозиториях...")

        # Получаем список репозиториев
        repos = self.get_my_repos(include_forks=include_forks)

        if not repos:
            return {"error": "Не удалось получить репозитории"}

        readme_status = {
            "with_readme": [],
            "without_readme": [],
            "errors": []
        }

        print(f"Анализируем {len(repos)} репозиториев...")

        for i, (owner, repo, repo_data) in enumerate(repos, 1):
            repo_full_name = f"{owner}/{repo}"
            print(f"  {i}/{len(repos)}: {repo_full_name}")

            try:
                # Проверяем README файлы через API
                readme_files = ["README.md", "README.rst", "README.txt", "README", "readme.md", "Readme.md"]
                has_readme = False
                readme_found = None

                for readme_file in readme_files:
                    readme_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{readme_file}"
                    readme_response = self.session.get(readme_url)
                    if readme_response.status_code == 200:
                        has_readme = True
                        readme_found = readme_file
                        break

                if has_readme:
                    readme_status["with_readme"].append({
                        "repo": repo_full_name,
                        "readme_file": readme_found,
                        "url": f"https://github.com/{repo_full_name}",
                        "stars": repo_data.get("stargazerCount", 0)
                    })
                else:
                    readme_status["without_readme"].append({
                        "repo": repo_full_name,
                        "url": f"https://github.com/{repo_full_name}",
                        "stars": repo_data.get("stargazerCount", 0),
                        "description": repo_data.get("description", "")
                    })

            except Exception as e:
                readme_status["errors"].append({
                    "repo": repo_full_name,
                    "error": str(e)
                })

        result = {
            "total_repos": len(repos),
            "with_readme_count": len(readme_status["with_readme"]),
            "without_readme_count": len(readme_status["without_readme"]),
            "errors_count": len(readme_status["errors"]),
            "readme_percentage": round(len(readme_status["with_readme"]) / len(repos) * 100, 1) if repos else 0,
            "details": readme_status
        }

        print("\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ README:")
        print(f"Всего репозиториев: {result['total_repos']}")
        print(f"С README: {result['with_readme_count']} ({result['readme_percentage']}%)")
        print(f"Без README: {result['without_readme_count']}")
        print(f"Ошибки проверки: {result['errors_count']}")

        return result

    def save_readme_check_to_csv(self, readme_data: Dict[str, Any], filename: str):
        """Сохранить результаты проверки README в CSV"""
        if not readme_data or "details" not in readme_data:
            print("Нет данных для сохранения")
            return

        details = readme_data["details"]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Заголовок
            writer.writerow(["Анализ наличия README файлов"])
            writer.writerow([])

            # Общая статистика
            writer.writerow(["Общая статистика"])
            writer.writerow(["Показатель", "Значение"])
            writer.writerow(["Всего репозиториев", readme_data.get("total_repos", 0)])
            writer.writerow(["С README", f"{readme_data.get('with_readme_count', 0)} ({readme_data.get('readme_percentage', 0)}%)"])
            writer.writerow(["Без README", readme_data.get("without_readme_count", 0)])
            writer.writerow(["Ошибки", readme_data.get("errors_count", 0)])
            writer.writerow([])

            # Репозитории с README
            if details.get("with_readme"):
                writer.writerow(["Репозитории С README"])
                writer.writerow(["Репозиторий", "Файл README", "Звезды", "URL"])
                for repo in sorted(details["with_readme"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("readme_file", ""),
                        repo.get("stars", 0),
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Репозитории без README
            if details.get("without_readme"):
                writer.writerow(["Репозитории БЕЗ README"])
                writer.writerow(["Репозиторий", "Звезды", "Описание", "URL"])
                for repo in sorted(details["without_readme"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("description", "")[:50] if repo.get("description") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Ошибки
            if details.get("errors"):
                writer.writerow(["ОШИБКИ ПРОВЕРКИ"])
                writer.writerow(["Репозиторий", "Ошибка"])
                for error in details["errors"]:
                    writer.writerow([
                        error.get("repo", ""),
                        error.get("error", "")
                    ])

        print(f"Результаты проверки README сохранены в {filename}")


class GitHubDataCollector:
    """Класс для сбора данных из GitHub API"""

    def __init__(self, token: str, username: str = None):
        """
        Инициализация коллектора

        Args:
            token: GitHub Personal Access Token
            username: Имя пользователя GitHub (если None, будет получено автоматически)
        """
        self.token = token
        self.username = username
        self.base_url = "https://api.github.com"
        self.session = requests.Session()

        # Настройка сессии
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GitHub-Data-Collector-GraphQL/1.0"
        })

        # Получаем username если не указан
        if not self.username:
            self.username = self._get_current_user()

    def _get_current_user(self) -> str:
        """Получить имя текущего пользователя"""
        response = self.session.get(f"{self.base_url}/user")
        response.raise_for_status()
        return response.json()["login"]

    def _make_request(self, url: str, params: Dict = None) -> Dict:
        """
        Сделать запрос к API с обработкой ошибок и rate limiting

        Args:
            url: URL для запроса
            params: Параметры запроса

        Returns:
            JSON ответ от API
        """
        while True:
            response = self.session.get(url, params=params)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 403:
                # Rate limit или другие ограничения
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                wait_time = max(reset_time - time.time(), 60)  # Минимум 60 секунд
                print(f"Rate limit exceeded. Waiting {wait_time:.0f} seconds...")
                time.sleep(wait_time)
                continue
            else:
                response.raise_for_status()

    def _make_graphql_request(self, query: str, variables: Dict = None) -> Dict:
        """
        Сделать GraphQL запрос с обработкой ошибок и rate limiting

        Args:
            query: GraphQL запрос
            variables: Переменные для запроса

        Returns:
            JSON ответ от GraphQL API
        """
        while True:
            payload = {"query": query}
            if variables:
                payload["variables"] = variables

            response = self.session.post(
                f"{self.base_url}/graphql",
                json=payload
            )

            if response.status_code == 200:
                result = response.json()
                if "errors" in result:
                    raise Exception(f"GraphQL errors: {result['errors']}")
                return result["data"]
            elif response.status_code == 403:
                # Rate limit или другие ограничения
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                wait_time = max(reset_time - time.time(), 60)  # Минимум 60 секунд
                print(f"Rate limit exceeded. Waiting {wait_time:.0f} seconds...")
                time.sleep(wait_time)
                continue
            else:
                response.raise_for_status()

    def get_all_forks(self) -> List[Dict[str, Any]]:
        """
        Получить все форки пользователя через GraphQL

        Returns:
            Список форков с информацией о каждом
        """
        print("Получение списка форков через GraphQL...")

        forks = []
        cursor = None

        while True:
            query = """
            query($username: String!, $after: String) {
              user(login: $username) {
                repositories(
                  first: 100,
                  isFork: true,
                  orderBy: {field: CREATED_AT, direction: ASC},
                  after: $after
                ) {
                  nodes {
                    name
                    nameWithOwner
                    url
                    createdAt
                    pushedAt
                    updatedAt
                    description
                    primaryLanguage {
                      name
                    }
                    forkCount
                    stargazerCount
                    parent {
                      nameWithOwner
                      url
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
            """

            variables = {
                "username": self.username,
                "after": cursor
            }

            result = self._make_graphql_request(query, variables)

            if not result.get("user") or not result["user"].get("repositories"):
                break

            repos = result["user"]["repositories"]
            page_forks = repos["nodes"]
            forks.extend(page_forks)

            print(f"Порция: найдено {len(page_forks)} форков (всего: {len(forks)})")

            # Проверяем, есть ли еще страницы
            if not repos["pageInfo"]["hasNextPage"]:
                break

            cursor = repos["pageInfo"]["endCursor"]

        print(f"Всего найдено форков: {len(forks)}")
        return forks

    def get_all_issues(self) -> List[Dict[str, Any]]:
        """
        Получить все issues пользователя через GraphQL (включая закрытые)

        Returns:
            Список issues с информацией о каждом
        """
        print("Получение списка issues через GraphQL...")

        issues = []
        cursor = None

        while True:
            query = """
            query($username: String!, $after: String) {
              user(login: $username) {
                issues(
                  first: 100,
                  orderBy: {field: CREATED_AT, direction: ASC},
                  states: [OPEN, CLOSED],
                  after: $after
                ) {
                  nodes {
                    title
                    url
                    state
                    createdAt
                    closedAt
                    updatedAt
                    comments {
                      totalCount
                    }
                    labels(first: 10) {
                      nodes {
                        name
                      }
                    }
                    repository {
                      nameWithOwner
                      url
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
            """

            variables = {
                "username": self.username,
                "after": cursor
            }

            result = self._make_graphql_request(query, variables)

            if not result.get("user") or not result["user"].get("issues"):
                break

            user_issues = result["user"]["issues"]
            page_issues = user_issues["nodes"]
            issues.extend(page_issues)

            print(f"Порция: найдено {len(page_issues)} issues (всего: {len(issues)})")

            # Проверяем, есть ли еще страницы
            if not user_issues["pageInfo"]["hasNextPage"]:
                break

            cursor = user_issues["pageInfo"]["endCursor"]

        print(f"Всего найдено issues: {len(issues)}")
        return issues

    def save_to_json(self, data: Dict[str, Any], filename: str):
        """Сохранить данные в JSON файл"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Данные сохранены в {filename}")

    def save_forks_to_csv(self, forks: List[Dict[str, Any]], filename: str):
        """Сохранить форки в CSV файл (GraphQL формат)"""
        if not forks:
            print("Нет форков для сохранения")
            return

        fieldnames = [
            'name', 'nameWithOwner', 'createdAt', 'pushedAt', 'updatedAt',
            'url', 'description', 'primaryLanguage', 'forkCount', 'stargazerCount',
            'parent_nameWithOwner', 'parent_url'
        ]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for fork in forks:
                parent = fork.get('parent', {})
                primary_language = fork.get('primaryLanguage', {})

                row = {
                    'name': fork.get('name', ''),
                    'nameWithOwner': fork.get('nameWithOwner', ''),
                    'createdAt': fork.get('createdAt', ''),
                    'pushedAt': fork.get('pushedAt', ''),
                    'updatedAt': fork.get('updatedAt', ''),
                    'url': fork.get('url', ''),
                    'description': fork.get('description', ''),
                    'primaryLanguage': primary_language.get('name', '') if primary_language else '',
                    'forkCount': fork.get('forkCount', 0),
                    'stargazerCount': fork.get('stargazerCount', 0),
                    'parent_nameWithOwner': parent.get('nameWithOwner', ''),
                    'parent_url': parent.get('url', '')
                }
                writer.writerow(row)

        print(f"Форки сохранены в {filename}")

    def save_issues_to_csv(self, issues: List[Dict[str, Any]], filename: str):
        """Сохранить issues в CSV файл (GraphQL формат)"""
        if not issues:
            print("Нет issues для сохранения")
            return

        fieldnames = [
            'title', 'state', 'createdAt', 'closedAt', 'updatedAt',
            'url', 'repository_nameWithOwner', 'repository_url',
            'comments_totalCount', 'labels'
        ]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for issue in issues:
                repo = issue.get('repository', {})
                comments = issue.get('comments', {})
                labels_data = issue.get('labels', {}).get('nodes', [])
                labels = [label['name'] for label in labels_data]

                row = {
                    'title': issue.get('title', ''),
                    'state': issue.get('state', ''),
                    'createdAt': issue.get('createdAt', ''),
                    'closedAt': issue.get('closedAt', ''),
                    'updatedAt': issue.get('updatedAt', ''),
                    'url': issue.get('url', ''),
                    'repository_nameWithOwner': repo.get('nameWithOwner', ''),
                    'repository_url': repo.get('url', ''),
                    'comments_totalCount': comments.get('totalCount', 0) if comments else 0,
                    'labels': '; '.join(labels)
                }
                writer.writerow(row)

        print(f"Issues сохранены в {filename}")

    def get_user_profile_stats(self) -> Dict[str, Any]:
        """
        Получить статистику профиля пользователя для "раскачки" аккаунта

        Returns:
            Статистика профиля
        """
        print("Получение статистики профиля...")

        query = """
        query($username: String!) {
          user(login: $username) {
            login
            name
            bio
            company
            location
            websiteUrl
            email
            twitterUsername
            createdAt
            updatedAt
            followers {
              totalCount
            }
            following {
              totalCount
            }
            repositories {
              totalCount
            }
            repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
              totalCount
            }
            starredRepositories {
              totalCount
            }
            issues(first: 1, states: [OPEN, CLOSED]) {
              totalCount
            }
            pullRequests(first: 1, states: [OPEN, CLOSED, MERGED]) {
              totalCount
            }
            contributionsCollection {
              totalCommitContributions
              totalIssueContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
              totalRepositoryContributions
              totalCommitContributions
              restrictedContributionsCount
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
        """

        variables = {"username": self.username}
        result = self._make_graphql_request(query, variables)

        if not result.get("user"):
            return {}

        user = result["user"]

        # Анализ языков программирования
        languages = self._get_user_languages()

        # Анализ топ репозиториев
        top_repos = self._get_top_repositories()

        # Анализ трендов активности
        activity_trends = self._analyze_activity_trends(user.get("contributionsCollection", {}))

        profile_stats = {
            "basic_info": {
                "login": user.get("login"),
                "name": user.get("name"),
                "bio": user.get("bio"),
                "company": user.get("company"),
                "location": user.get("location"),
                "website": user.get("websiteUrl"),
                "email": user.get("email"),
                "twitter": user.get("twitterUsername"),
                "created_at": user.get("createdAt"),
                "updated_at": user.get("updatedAt")
            },
            "social_stats": {
                "followers": user.get("followers", {}).get("totalCount", 0),
                "following": user.get("following", {}).get("totalCount", 0),
                "repositories": user.get("repositories", {}).get("totalCount", 0),
                "starred_repos": user.get("starredRepositories", {}).get("totalCount", 0),
                "contributed_to": user.get("repositoriesContributedTo", {}).get("totalCount", 0)
            },
            "contribution_stats": {
                "total_issues": user.get("issues", {}).get("totalCount", 0),
                "total_pull_requests": user.get("pullRequests", {}).get("totalCount", 0),
                "total_commits": user.get("contributionsCollection", {}).get("totalCommitContributions", 0),
                "total_issue_contributions": user.get("contributionsCollection", {}).get("totalIssueContributions", 0),
                "total_pr_contributions": user.get("contributionsCollection", {}).get("totalPullRequestContributions", 0),
                "total_pr_review_contributions": user.get("contributionsCollection", {}).get("totalPullRequestReviewContributions", 0),
                "total_repo_contributions": user.get("contributionsCollection", {}).get("totalRepositoryContributions", 0),
                "total_contributions_this_year": user.get("contributionsCollection", {}).get("contributionCalendar", {}).get("totalContributions", 0)
            },
            "languages": languages,
            "top_repositories": top_repos,
            "activity_trends": activity_trends
        }

        print("Статистика профиля получена")
        return profile_stats

    def _get_user_languages(self) -> Dict[str, Any]:
        """Получить статистику языков программирования пользователя"""
        print("Анализ языков программирования...")

        query = """
        query($username: String!) {
          user(login: $username) {
            repositories(first: 100, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
              nodes {
                primaryLanguage {
                  name
                }
                languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                  edges {
                    size
                    node {
                      name
                    }
                  }
                  totalSize
                }
              }
            }
          }
        }
        """

        variables = {"username": self.username}
        result = self._make_graphql_request(query, variables)

        languages_stats = {}
        total_size = 0

        if result.get("user") and result["user"].get("repositories"):
            for repo in result["user"]["repositories"]["nodes"]:
                if repo.get("languages"):
                    for lang in repo["languages"]["edges"]:
                        lang_name = lang["node"]["name"]
                        lang_size = lang["size"]

                        if lang_name in languages_stats:
                            languages_stats[lang_name] += lang_size
                        else:
                            languages_stats[lang_name] = lang_size

                        total_size += lang_size

        # Преобразуем в проценты и сортируем
        languages_percent = {}
        for lang, size in languages_stats.items():
            languages_percent[lang] = round((size / total_size * 100), 1) if total_size > 0 else 0

        sorted_languages = dict(sorted(languages_percent.items(), key=lambda x: x[1], reverse=True))

        return {
            "by_percentage": sorted_languages,
            "by_bytes": dict(sorted(languages_stats.items(), key=lambda x: x[1], reverse=True)),
            "total_languages": len(sorted_languages)
        }

    def _get_top_repositories(self) -> List[Dict[str, Any]]:
        """Получить топ репозиториев по звездам и форкам"""
        print("Получение топ репозиториев...")

        query = """
        query($username: String!) {
          user(login: $username) {
            topRepositories(first: 10, orderBy: {field: STARGAZERS, direction: DESC}) {
              nodes {
                nameWithOwner
                description
                url
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
                createdAt
                updatedAt
                isArchived
                isFork
              }
            }
          }
        }
        """

        variables = {"username": self.username}
        result = self._make_graphql_request(query, variables)

        top_repos = []
        if result.get("user") and result["user"].get("topRepositories"):
            for repo in result["user"]["topRepositories"]["nodes"]:
                if not repo.get("isFork"):  # Только собственные репозитории
                    top_repos.append({
                        "name": repo.get("nameWithOwner"),
                        "description": repo.get("description"),
                        "url": repo.get("url"),
                        "stars": repo.get("stargazerCount", 0),
                        "forks": repo.get("forkCount", 0),
                        "language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                        "created_at": repo.get("createdAt"),
                        "updated_at": repo.get("updatedAt"),
                        "is_archived": repo.get("isArchived", False)
                    })

        return top_repos

    def _analyze_activity_trends(self, contributions: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ трендов активности"""
        calendar = contributions.get("contributionCalendar", {})
        weeks = calendar.get("weeks", [])

        # Анализ последних 52 недель (год)
        recent_weeks = weeks[-52:] if len(weeks) > 52 else weeks

        weekly_contributions = []
        monthly_contributions = {}
        daily_patterns = {i: 0 for i in range(7)}  # 0-6: Понедельник-Воскресенье

        total_contributions = 0
        active_days = 0
        max_daily = 0

        for week in recent_weeks:
            week_total = 0
            for day in week.get("contributionDays", []):
                count = day.get("contributionCount", 0)
                date_str = day.get("date", "")

                if count > 0:
                    active_days += 1
                    total_contributions += count
                    week_total += count
                    max_daily = max(max_daily, count)

                # Анализ по дням недели (0 = Понедельник, 6 = Воскресенье)
                if date_str:
                    try:
                        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        weekday = date_obj.weekday()  # 0 = Понедельник
                        daily_patterns[weekday] += count
                    except:
                        pass

                # Анализ по месяцам
                if date_str:
                    try:
                        month_key = date_str[:7]  # YYYY-MM
                        if month_key in monthly_contributions:
                            monthly_contributions[month_key] += count
                        else:
                            monthly_contributions[month_key] = count
                    except:
                        pass

            weekly_contributions.append(week_total)

        # Находим самый активный день недели
        most_active_day = max(daily_patterns.items(), key=lambda x: x[1])[0]
        day_names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

        # Средняя активность
        avg_weekly = sum(weekly_contributions) / len(weekly_contributions) if weekly_contributions else 0
        avg_daily = total_contributions / len(recent_weeks) / 7 if recent_weeks else 0

        return {
            "total_contributions_last_year": total_contributions,
            "active_days_last_year": active_days,
            "average_weekly_contributions": round(avg_weekly, 1),
            "average_daily_contributions": round(avg_daily, 1),
            "max_daily_contributions": max_daily,
            "most_active_day": day_names[most_active_day] if most_active_day < len(day_names) else "Unknown",
            "monthly_contributions": dict(sorted(monthly_contributions.items())),
            "consistency_score": round((active_days / (len(recent_weeks) * 7)) * 100, 1) if recent_weeks else 0
        }

    def get_user_repositories(self) -> List[Dict[str, Any]]:
        """
        Получить все собственные репозитории пользователя (не форки)

        Returns:
            Список собственных репозиториев
        """
        print("Получение собственных репозиториев пользователя...")

        repositories = []
        cursor = None

        while True:
            query = """
            query($username: String!, $after: String) {
              user(login: $username) {
                repositories(
                  first: 100,
                  isFork: false,
                  orderBy: {field: CREATED_AT, direction: DESC},
                  after: $after
                ) {
                  nodes {
                    name
                    nameWithOwner
                    url
                    createdAt
                    description
                    forkCount
                    stargazerCount
                    repositoryTopics(first: 10) {
                      nodes {
                        topic {
                          name
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
            """

            variables = {
                "username": self.username,
                "after": cursor
            }

            result = self._make_graphql_request(query, variables)

            if not result.get("user") or not result["user"].get("repositories"):
                break

            repos = result["user"]["repositories"]
            page_repos = repos["nodes"]
            repositories.extend(page_repos)

            print(f"Порция: найдено {len(page_repos)} репозиториев (всего: {len(repositories)})")

            # Проверяем, есть ли еще страницы
            if not repos["pageInfo"]["hasNextPage"]:
                break

            cursor = repos["pageInfo"]["endCursor"]

        print(f"Всего найдено собственных репозиториев: {len(repositories)}")
        return repositories

    def get_repositories_stars_sorted(self) -> List[Dict[str, Any]]:
        """
        Получить все собственные репозитории пользователя отсортированные по количеству звезд

        Returns:
            Список репозиториев отсортированных по звездам (от большего к меньшему)
        """
        print("Получение репозиториев отсортированных по звездам...")

        repositories = []
        cursor = None

        max_pages = 5  # Ограничение для избежания перегрузки API
        page_count = 0

        while page_count < max_pages:
            # Упрощенный запрос для избежания 502 ошибки
            query = """
            query($username: String!, $after: String) {
              user(login: $username) {
                repositories(
                  first: 30,  # Уменьшили размер страницы
                  isFork: false,
                  orderBy: {field: STARGAZERS, direction: DESC},
                  after: $after
                ) {
                  nodes {
                    name
                    nameWithOwner
                    url
                    createdAt
                    description
                    primaryLanguage {
                      name
                    }
                    forkCount
                    stargazerCount
                    isArchived
                    diskUsage
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
            """

            variables = {
                "username": self.username,
                "after": cursor
            }

            try:
                result = self._make_graphql_request(query, variables)

                if not result.get("user") or not result["user"].get("repositories"):
                    break

                repos = result["user"]["repositories"]
                page_repos = repos["nodes"]
                repositories.extend(page_repos)

                print(f"Порция {page_count + 1}: найдено {len(page_repos)} репозиториев (всего: {len(repositories)})")

                # Проверяем, есть ли еще страницы
                if not repos["pageInfo"]["hasNextPage"]:
                    break

                cursor = repos["pageInfo"]["endCursor"]
                page_count += 1

                # Небольшая пауза между запросами
                time.sleep(0.5)

            except Exception as e:
                print(f"Ошибка при получении страницы {page_count + 1}: {e}")
                break

        print(f"Всего найдено репозиториев: {len(repositories)}")

        # Сортируем по количеству звезд (на всякий случай, хотя GraphQL уже сортирует)
        repositories.sort(key=lambda x: x.get('stargazerCount', 0), reverse=True)

        return repositories

    def save_repositories_stars_to_csv(self, repositories: List[Dict[str, Any]], filename: str):
        """Сохранить репозитории отсортированные по звездам в CSV"""
        if not repositories:
            print("Нет репозиториев для сохранения")
            return

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Репозитории отсортированные по звездам (⭐)"])
            writer.writerow([])
            writer.writerow(["Рейтинг", "Репозиторий", "Звезды", "Форки", "Язык", "Создан", "Обновлен", "Архив", "Приватный", "Размер (KB)", "Issues", "PRs", "Releases", "Описание"])
            writer.writerow([])

            for i, repo in enumerate(repositories, 1):
                primary_language = repo.get('primaryLanguage', {})
                issues = repo.get('issues', {})
                pull_requests = repo.get('pullRequests', {})
                releases = repo.get('releases', {})

                # Преобразуем размер из байтов в KB
                disk_usage_kb = round(repo.get('diskUsage', 0) / 1024, 1) if repo.get('diskUsage') else 0

                writer.writerow([
                    f"#{i}",
                    repo.get('nameWithOwner', ''),
                    repo.get('stargazerCount', 0),
                    repo.get('forkCount', 0),
                    primary_language.get('name', '') if primary_language else '',
                    repo.get('createdAt', '')[:10] if repo.get('createdAt') else '',
                    repo.get('updatedAt', '')[:10] if repo.get('updatedAt') else '',
                    "Да" if repo.get('isArchived') else "Нет",
                    "Да" if repo.get('isPrivate') else "Нет",
                    disk_usage_kb,
                    issues.get('totalCount', 0) if issues else 0,
                    pull_requests.get('totalCount', 0) if pull_requests else 0,
                    releases.get('totalCount', 0) if releases else 0,
                    (repo.get('description', '') or '')[:100]  # Ограничиваем описание 100 символами
                ])

            # Статистика в конце файла
            writer.writerow([])
            writer.writerow(["=== СТАТИСТИКА ==="])

            total_stars = sum(repo.get('stargazerCount', 0) for repo in repositories)
            total_forks = sum(repo.get('forkCount', 0) for repo in repositories)
            total_size = sum(repo.get('diskUsage', 0) for repo in repositories) / 1024 / 1024  # в MB

            writer.writerow(["Всего репозиториев", len(repositories)])
            writer.writerow(["Всего звезд", total_stars])
            writer.writerow(["Всего форков", total_forks])
            writer.writerow(["Среднее звезд на репозиторий", round(total_stars / len(repositories), 2) if repositories else 0])
            writer.writerow(["Общий размер репозиториев", f"{round(total_size, 2)} MB"])

            # Топ по звездам
            if repositories:
                top_repo = repositories[0]
                writer.writerow(["Топ репозиторий по звездам", f"{top_repo.get('nameWithOwner')} ({top_repo.get('stargazerCount', 0)} ⭐)"])

            # Распределение по языкам
            writer.writerow([])
            writer.writerow(["=== РАСПРЕДЕЛЕНИЕ ПО ЯЗЫКАМ ==="])

            languages = {}
            for repo in repositories:
                lang = repo.get('primaryLanguage', {}).get('name', 'Unknown') if repo.get('primaryLanguage') else 'Unknown'
                languages[lang] = languages.get(lang, 0) + 1

            sorted_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)
            for lang, count in sorted_languages[:10]:  # Топ 10 языков
                writer.writerow([lang, count])

        print(f"Репозитории по звездам сохранены в {filename}")

    def get_repository_analytics(self, repo_name: str) -> Dict[str, Any]:
        """
        Получить детальную аналитику по конкретному репозиторию

        Args:
            repo_name: Полное имя репозитория (owner/name)

        Returns:
            Детальная аналитика репозитория
        """
        print(f"Получение детальной аналитики для {repo_name}...")

        # Разбираем owner/name
        try:
            owner, name = repo_name.split('/', 1)
        except ValueError:
            return {"error": f"Неверный формат репозитория: {repo_name}"}

        # Упрощенный запрос для избежания перегрузки API
        query = """
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            nameWithOwner
            description
            createdAt
            updatedAt
            pushedAt
            isArchived
            isPrivate
            isFork
            forkCount
            stargazerCount
            watchers {
              totalCount
            }
            primaryLanguage {
              name
            }
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              totalSize
              edges {
                size
                node {
                  name
                }
              }
            }
            diskUsage
            issues(states: [OPEN, CLOSED]) {
              totalCount
            }
            pullRequests(states: [OPEN, CLOSED, MERGED]) {
              totalCount
            }
            releases {
              totalCount
            }
            licenseInfo {
              name
            }
            repositoryTopics(first: 5) {
              nodes {
                topic {
                  name
                }
              }
            }
          }
        }
        """

        variables = {"owner": owner, "name": name}

        try:
            result = self._make_graphql_request(query, variables)

            if not result.get("repository"):
                return {"error": f"Репозиторий {repo_name} не найден"}

            repo = result["repository"]

            # Расчет дополнительных метрик
            analytics = {
                "basic_info": {
                    "name": repo.get("nameWithOwner"),
                    "description": repo.get("description"),
                    "created_at": repo.get("createdAt"),
                    "updated_at": repo.get("updatedAt"),
                    "pushed_at": repo.get("pushedAt"),
                    "is_archived": repo.get("isArchived"),
                    "is_private": repo.get("isPrivate"),
                    "is_fork": repo.get("isFork")
                },
                "popularity": {
                    "stars": repo.get("stargazerCount", 0),
                    "forks": repo.get("forkCount", 0),
                    "watchers": repo.get("watchers", {}).get("totalCount", 0)
                },
                "activity": {
                    "total_commits": repo.get("defaultBranchRef", {}).get("target", {}).get("history", {}).get("totalCount", 0),
                    "issues_total": repo.get("issues", {}).get("totalCount", 0),
                    "pull_requests_total": repo.get("pullRequests", {}).get("totalCount", 0),
                    "releases_total": repo.get("releases", {}).get("totalCount", 0),
                    "tags_total": repo.get("tags", {}).get("totalCount", 0)
                },
                "technical": {
                    "primary_language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                    "disk_usage_kb": round(repo.get("diskUsage", 0) / 1024, 1) if repo.get("diskUsage") else 0,
                    "license": repo.get("licenseInfo", {}).get("name") if repo.get("licenseInfo") else None,
                    "collaborators": repo.get("collaborators", {}).get("totalCount", 0),
                    "contributors": repo.get("mentionableUsers", {}).get("totalCount", 0),
                    "vulnerabilities": repo.get("vulnerabilityAlerts", {}).get("totalCount", 0)
                },
                "topics": [node["topic"]["name"] for node in repo.get("repositoryTopics", {}).get("nodes", [])],
                "languages": self._analyze_repo_languages(repo.get("languages", {}))
            }

            # Расчет производных метрик
            analytics["ratios"] = {
                "forks_to_stars_ratio": round(repo.get("forkCount", 0) / max(repo.get("stargazerCount", 1), 1), 2),
                "issues_to_stars_ratio": round(repo.get("issues", {}).get("totalCount", 0) / max(repo.get("stargazerCount", 1), 1), 2),
                "activity_score": round((repo.get("stargazerCount", 0) + repo.get("forkCount", 0) + repo.get("watchers", {}).get("totalCount", 0)) / max(repo.get("diskUsage", 1), 1) * 1000, 2)
            }

            # Возраст проекта
            if repo.get("createdAt"):
                created_date = datetime.fromisoformat(repo["createdAt"].replace('Z', '+00:00'))
                now = datetime.now(created_date.tzinfo)
                age_days = (now - created_date).days
                analytics["age"] = {
                    "days": age_days,
                    "months": round(age_days / 30, 1),
                    "years": round(age_days / 365, 1)
                }

            return analytics

        except Exception as e:
            return {"error": f"Ошибка при получении аналитики для {repo_name}: {str(e)}"}

    def _analyze_repo_languages(self, languages_data: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ языков для конкретного репозитория"""
        if not languages_data:
            return {"languages": {}, "total_size": 0}

        languages = {}
        total_size = languages_data.get("totalSize", 0)

        for edge in languages_data.get("edges", []):
            lang_name = edge["node"]["name"]
            lang_size = edge["size"]
            languages[lang_name] = {
                "bytes": lang_size,
                "percentage": round((lang_size / total_size * 100), 1) if total_size > 0 else 0
            }

        return {
            "languages": languages,
            "total_size": total_size,
            "total_size_kb": round(total_size / 1024, 1)
        }

    def get_top_repositories_analytics(self, repos_list: List[Dict[str, Any]], limit: int = None, batch_size: int = 3) -> List[Dict[str, Any]]:
        """
        Получить детальную аналитику для списка репозиториев

        Args:
            repos_list: Список репозиториев для анализа
            limit: Максимальное количество репозиториев (None = все из списка)
            batch_size: Размер батча для обработки (меньше = меньше нагрузки на API)

        Returns:
            Список с детальной аналитикой репозиториев
        """
        # Определяем количество для анализа
        if limit is None:
            repos_to_analyze = repos_list
        else:
            repos_to_analyze = repos_list[:limit]

        total_to_analyze = len(repos_to_analyze)

        if total_to_analyze == 0:
            print("Нет репозиториев для анализа")
            return []

        print(f"Получение детальной аналитики для {total_to_analyze} репозиториев (батчами по {batch_size})...")

        analytics = []

        # Обрабатываем батчами для контроля нагрузки на API
        for batch_start in range(0, total_to_analyze, batch_size):
            batch_end = min(batch_start + batch_size, total_to_analyze)
            batch_repos = repos_to_analyze[batch_start:batch_end]

            print(f"Обработка батча {batch_start//batch_size + 1}/{(total_to_analyze + batch_size - 1)//batch_size}: {batch_start+1}-{batch_end}")

            batch_analytics = []
            for i, repo in enumerate(batch_repos):
                repo_name = repo.get("nameWithOwner")
                stars = repo.get("stargazerCount", 0)
                if repo_name:
                    print(f"  Анализ {batch_start + i + 1}/{total_to_analyze}: {repo_name} ({stars}⭐)")
                    repo_analytics = self.get_repository_analytics(repo_name)
                    if "error" not in repo_analytics:
                        batch_analytics.append(repo_analytics)
                    else:
                        print(f"  Пропускаем {repo_name}: {repo_analytics.get('error', 'Unknown error')}")

                    # Пауза между запросами в батче
                    if i < len(batch_repos) - 1:
                        time.sleep(2.5)  # Увеличенная пауза для надежности

            analytics.extend(batch_analytics)

            # Пауза между батчами
            if batch_end < total_to_analyze:
                batch_pause = min(batch_size * 3, 15)  # Максимум 15 секунд между батчами
                print(f"Пауза между батчами... ({batch_pause} сек)")
                time.sleep(batch_pause)

        print(f"Полный анализ завершен: {len(analytics)}/{total_to_analyze} репозиториев")
        return analytics

    def save_repository_analytics_to_csv(self, analytics: List[Dict[str, Any]], filename: str):
        """Сохранить детальную аналитику репозиториев в CSV"""
        if not analytics:
            print("Нет данных аналитики для сохранения")
            return

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Детальная аналитика репозиториев"])
            writer.writerow([])

            for i, repo in enumerate(analytics, 1):
                writer.writerow([f"=== РЕПОЗИТОРИЙ #{i}: {repo['basic_info']['name']} ==="])

                # Базовая информация
                basic = repo['basic_info']
                writer.writerow(["Базовая информация"])
                writer.writerow(["Создан", basic.get('created_at', '')[:10]])
                writer.writerow(["Обновлен", basic.get('updated_at', '')[:10]])
                writer.writerow(["Push", basic.get('pushed_at', '')[:10]])
                writer.writerow(["Архив", "Да" if basic.get('is_archived') else "Нет"])
                writer.writerow(["Приватный", "Да" if basic.get('is_private') else "Нет"])
                writer.writerow(["Форк", "Да" if basic.get('is_fork') else "Нет"])
                writer.writerow([])

                # Популярность
                pop = repo['popularity']
                writer.writerow(["Популярность"])
                writer.writerow(["Звезды", pop.get('stars', 0)])
                writer.writerow(["Форки", pop.get('forks', 0)])
                writer.writerow(["Watchers", pop.get('watchers', 0)])
                writer.writerow([])

                # Активность
                act = repo['activity']
                writer.writerow(["Активность"])
                writer.writerow(["Коммиты", act.get('total_commits', 0)])
                writer.writerow(["Issues", act.get('issues_total', 0)])
                writer.writerow(["PRs", act.get('pull_requests_total', 0)])
                writer.writerow(["Releases", act.get('releases_total', 0)])
                writer.writerow(["Tags", act.get('tags_total', 0)])
                writer.writerow([])

                # Техническая информация
                tech = repo['technical']
                writer.writerow(["Техническая информация"])
                writer.writerow(["Основной язык", tech.get('primary_language', '')])
                writer.writerow(["Размер (KB)", tech.get('disk_usage_kb', 0)])
                writer.writerow(["Лицензия", tech.get('license', '')])
                writer.writerow(["Коллабораторы", tech.get('collaborators', 0)])
                writer.writerow(["Контрибьюторы", tech.get('contributors', 0)])
                writer.writerow(["Уязвимости", tech.get('vulnerabilities', 0)])
                writer.writerow([])

                # Соотношения
                ratios = repo.get('ratios', {})
                writer.writerow(["Метрики эффективности"])
                writer.writerow(["Форки/Звезды", ratios.get('forks_to_stars_ratio', 0)])
                writer.writerow(["Issues/Звезды", ratios.get('issues_to_stars_ratio', 0)])
                writer.writerow(["Activity Score", ratios.get('activity_score', 0)])
                writer.writerow([])

                # Возраст
                age = repo.get('age', {})
                if age:
                    writer.writerow(["Возраст проекта"])
                    writer.writerow(["Дни", age.get('days', 0)])
                    writer.writerow(["Месяцы", age.get('months', 0)])
                    writer.writerow(["Годы", age.get('years', 0)])
                    writer.writerow([])

                # Языки
                languages = repo.get('languages', {}).get('languages', {})
                if languages:
                    writer.writerow(["Языки программирования"])
                    for lang, data in languages.items():
                        writer.writerow([lang, f"{data['percentage']}%", f"{round(data['bytes']/1024, 1)} KB"])
                    writer.writerow([])

                # Темы
                topics = repo.get('topics', [])
                if topics:
                    writer.writerow(["Темы/Тэги"])
                    writer.writerow([", ".join(topics)])
                    writer.writerow([])

                writer.writerow([])  # Пустая строка между репозиториями

        print(f"Детальная аналитика репозиториев сохранена в {filename}")

    def get_starred_repositories_analysis(self) -> Dict[str, Any]:
        """
        Анализ репозиториев, которые пользователь отметил звездочкой
        """
        print("Анализ starred репозиториев...")

        starred = []
        cursor = None

        while True:
            query = """
            query($username: String!, $after: String) {
              user(login: $username) {
                starredRepositories(first: 100, after: $after, orderBy: {field: STARRED_AT, direction: DESC}) {
                  nodes {
                    nameWithOwner
                    description
                    stargazerCount
                    forkCount
                    primaryLanguage {
                      name
                    }
                    createdAt
                    updatedAt
                    owner {
                      login
                      __typename
                    }
                    repositoryTopics(first: 5) {
                      nodes {
                        topic {
                          name
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
            """

            variables = {
                "username": self.username,
                "after": cursor
            }

            result = self._make_graphql_request(query, variables)

            if not result.get("user") or not result["user"].get("starredRepositories"):
                break

            repos = result["user"]["starredRepositories"]
            page_repos = repos["nodes"]
            starred.extend(page_repos)

            print(f"Порция: найдено {len(page_repos)} starred репозиториев (всего: {len(starred)})")

            # Убираем ограничение, собираем все starred репозитории
            if not repos["pageInfo"]["hasNextPage"]:
                break

            cursor = repos["pageInfo"]["endCursor"]

            # Небольшая пауза между запросами
            time.sleep(0.5)

        print(f"Всего starred репозиториев: {len(starred)}")

        # Анализ starred репозиториев
        analysis = self._analyze_starred_repositories(starred)

        return {
            "starred_repositories": starred,
            "analysis": analysis
        }

    def _analyze_starred_repositories(self, starred: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Анализ starred репозиториев для понимания интересов пользователя"""

        if not starred:
            return {"error": "Нет starred репозиториев для анализа"}

        # Анализ по языкам
        languages = {}
        for repo in starred:
            lang = repo.get('primaryLanguage', {}).get('name', 'Unknown') if repo.get('primaryLanguage') else 'Unknown'
            languages[lang] = languages.get(lang, 0) + 1

        # Анализ по типам владельцев
        owner_types = {}
        for repo in starred:
            owner_type = repo.get('owner', {}).get('__typename', 'Unknown')
            owner_types[owner_type] = owner_types.get(owner_type, 0) + 1

        # Анализ по популярности (звезды)
        popularity_ranges = {
            "0-10": 0,
            "11-100": 0,
            "101-1000": 0,
            "1001-10000": 0,
            "10000+": 0
        }

        for repo in starred:
            stars = repo.get('stargazerCount', 0)
            if stars <= 10:
                popularity_ranges["0-10"] += 1
            elif stars <= 100:
                popularity_ranges["11-100"] += 1
            elif stars <= 1000:
                popularity_ranges["101-1000"] += 1
            elif stars <= 10000:
                popularity_ranges["1001-10000"] += 1
            else:
                popularity_ranges["10000+"] += 1

        # Топ тем
        topics = {}
        for repo in starred:
            repo_topics = repo.get('repositoryTopics', {}).get('nodes', [])
            for topic_node in repo_topics:
                topic_name = topic_node.get('topic', {}).get('name', '')
                if topic_name:
                    topics[topic_name] = topics.get(topic_name, 0) + 1

        # Все starred репозитории отсортированные по дате (уже отсортированы в запросе)
        all_starred_sorted = starred

        return {
            "total_starred": len(starred),
            "languages": dict(sorted(languages.items(), key=lambda x: x[1], reverse=True)),
            "owner_types": owner_types,
            "popularity_distribution": popularity_ranges,
            "top_topics": dict(sorted(topics.items(), key=lambda x: x[1], reverse=True)[:20]),
            "all_starred_repos": [
                {
                    "name": repo.get('nameWithOwner', ''),
                    "stars": repo.get('stargazerCount', 0),
                    "language": repo.get('primaryLanguage', {}).get('name') if repo.get('primaryLanguage') else None,
                    "description": repo.get('description', '')[:150] if repo.get('description') else '',
                    "created_at": repo.get('createdAt', ''),
                    "owner_type": repo.get('owner', {}).get('__typename', 'Unknown') if repo.get('owner') else 'Unknown'
                }
                for repo in all_starred_sorted
            ]
        }

    def get_repository_contributors_analysis(self, repo_name: str) -> Dict[str, Any]:
        """
        Анализ контрибьюторов конкретного репозитория
        """
        print(f"Анализ контрибьюторов для {repo_name}...")

        try:
            owner, name = repo_name.split('/', 1)
        except ValueError:
            return {"error": f"Неверный формат репозитория: {repo_name}"}

        query = """
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            collaborators(first: 20) {
              nodes {
                login
                name
                company
                location
                contributions
              }
            }
            mentionableUsers(first: 50) {
              nodes {
                login
                name
                company
                location
                contributions
              }
            }
          }
        }
        """

        variables = {"owner": owner, "name": name}

        try:
            result = self._make_graphql_request(query, variables)

            if not result.get("repository"):
                return {"error": f"Репозиторий {repo_name} не найден"}

            repo = result["repository"]

            collaborators = repo.get('collaborators', {}).get('nodes', [])
            contributors = repo.get('mentionableUsers', {}).get('nodes', [])

            # Анализ по компаниям
            companies = {}
            locations = {}

            for user in collaborators + contributors:
                company = user.get('company', '').strip() or 'Unknown'
                location = user.get('location', '').strip() or 'Unknown'

                companies[company] = companies.get(company, 0) + 1
                locations[location] = locations.get(location, 0) + 1

            return {
                "repository": repo_name,
                "collaborators_count": len(collaborators),
                "contributors_count": len(contributors),
                "companies": dict(sorted(companies.items(), key=lambda x: x[1], reverse=True)),
                "locations": dict(sorted(locations.items(), key=lambda x: x[1], reverse=True)),
                "top_contributors": [
                    {
                        "login": user.get('login', ''),
                        "name": user.get('name', ''),
                        "company": user.get('company', ''),
                        "location": user.get('location', ''),
                        "contributions": user.get('contributions', 0)
                    }
                    for user in sorted(contributors, key=lambda x: x.get('contributions', 0), reverse=True)[:10]
                ]
            }

        except Exception as e:
            return {"error": f"Ошибка при анализе контрибьюторов {repo_name}: {str(e)}"}

    def save_starred_analysis_to_csv(self, starred_data: Dict[str, Any], filename: str):
        """Сохранить анализ starred репозиториев в CSV"""
        if not starred_data or "analysis" not in starred_data:
            print("Нет данных для анализа starred репозиториев")
            return

        analysis = starred_data["analysis"]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Анализ Starred Репозиториев"])
            writer.writerow([])
            writer.writerow(["Общая статистика"])
            writer.writerow(["Всего starred", analysis.get("total_starred", 0)])
            writer.writerow([])

            # Языки
            writer.writerow(["Распределение по языкам"])
            writer.writerow(["Язык", "Количество"])
            for lang, count in analysis.get("languages", {}).items():
                writer.writerow([lang, count])
            writer.writerow([])

            # Типы владельцев
            writer.writerow(["Типы владельцев"])
            writer.writerow(["Тип", "Количество"])
            for owner_type, count in analysis.get("owner_types", {}).items():
                writer.writerow([owner_type, count])
            writer.writerow([])

            # Популярность
            writer.writerow(["Распределение по популярности"])
            writer.writerow(["Диапазон звезд", "Количество"])
            for range_name, count in analysis.get("popularity_distribution", {}).items():
                writer.writerow([range_name, count])
            writer.writerow([])

            # Топ тем
            writer.writerow(["Топ тем (топ-20)"])
            writer.writerow(["Тема", "Количество"])
            for topic, count in list(analysis.get("top_topics", {}).items())[:20]:
                writer.writerow([topic, count])
            writer.writerow([])

            # Все starred репозитории (отсортированные по дате starred - от новых к старым)
            writer.writerow(["Все starred репозитории (от новых к старым)"])
            writer.writerow(["#", "Репозиторий", "Звезды", "Язык", "Тип владельца", "Описание"])
            for i, repo in enumerate(analysis.get("all_starred_repos", []), 1):
                writer.writerow([
                    i,
                    repo.get("name", ""),
                    repo.get("stars", 0),
                    repo.get("language", ""),
                    repo.get("owner_type", ""),
                    repo.get("description", "")[:100]
                ])

        print(f"Анализ starred репозиториев сохранен в {filename}")

    def save_stars_distribution_to_csv(self, repositories: List[Dict[str, Any]], filename: str):
        """Сохранить распределение звезд по диапазонам в CSV"""
        if not repositories:
            print("Нет данных для анализа распределения звезд")
            return

        # Группируем по диапазонам звезд
        ranges = {
            "0 звезд": 0,
            "1-5 звезд": 0,
            "6-10 звезд": 0,
            "11-25 звезд": 0,
            "26-50 звезд": 0,
            "51-100 звезд": 0,
            "101-500 звезд": 0,
            "501+ звезд": 0
        }

        for repo in repositories:
            stars = repo.get('stargazerCount', 0)
            if stars == 0:
                ranges["0 звезд"] += 1
            elif stars <= 5:
                ranges["1-5 звезд"] += 1
            elif stars <= 10:
                ranges["6-10 звезд"] += 1
            elif stars <= 25:
                ranges["11-25 звезд"] += 1
            elif stars <= 50:
                ranges["26-50 звезд"] += 1
            elif stars <= 100:
                ranges["51-100 звезд"] += 1
            elif stars <= 500:
                ranges["101-500 звезд"] += 1
            else:
                ranges["501+ звезд"] += 1

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Распределение звезд по диапазонам"])
            writer.writerow([])
            writer.writerow(["Диапазон", "Количество репозиториев", "Процент"])

            total_repos = len(repositories)
            for range_name, count in ranges.items():
                percentage = round((count / total_repos * 100), 1) if total_repos > 0 else 0
                writer.writerow([range_name, count, f"{percentage}%"])

            writer.writerow([])
            writer.writerow(["=== ИНСАЙТЫ ==="])

            # Анализ популярности
            popular_repos = sum(count for range_name, count in ranges.items() if "звезд" in range_name and not range_name.startswith("0") and not range_name.startswith("1-5"))
            popular_percentage = round((popular_repos / total_repos * 100), 1) if total_repos > 0 else 0

            writer.writerow(["Репозитории с 6+ звездами", f"{popular_repos} ({popular_percentage}%)"])

            zero_star_repos = ranges["0 звезд"]
            zero_percentage = round((zero_star_repos / total_repos * 100), 1) if total_repos > 0 else 0
            writer.writerow(["Репозитории без звезд", f"{zero_star_repos} ({zero_percentage}%)"])

        print(f"Распределение звезд сохранено в {filename}")

    def get_forks_of_user_repos(self, repositories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Получить все форки репозиториев пользователя (форки, сделанные другими пользователями)

        Args:
            repositories: Список собственных репозиториев пользователя

        Returns:
            Список форков других пользователей
        """
        print("Получение форков от собственных репозиториев...")

        all_forks = []

        for repo in repositories:
            repo_name = repo.get('nameWithOwner', '')
            fork_count = repo.get('forkCount', 0)

            if fork_count == 0:
                continue

            print(f"Получение форков для {repo_name} ({fork_count} форков)...")

            repo_forks = []
            cursor = None

            while True:
                query = """
                query($owner: String!, $name: String!, $after: String) {
                  repository(owner: $owner, name: $name) {
                    forks(first: 100, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
                      nodes {
                        name
                        nameWithOwner
                        url
                        createdAt
                        pushedAt
                        updatedAt
                        description
                        primaryLanguage {
                          name
                        }
                        stargazerCount
                        owner {
                          login
                        }
                      }
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                    }
                  }
                }
                """

                # Разбираем owner/name из nameWithOwner
                try:
                    owner, name = repo_name.split('/', 1)
                except ValueError:
                    continue

                variables = {
                    "owner": owner,
                    "name": name,
                    "after": cursor
                }

                try:
                    result = self._make_graphql_request(query, variables)

                    if not result.get("repository") or not result["repository"].get("forks"):
                        break

                    forks_data = result["repository"]["forks"]
                    page_forks = forks_data["nodes"]

                    # Добавляем информацию об оригинальном репозитории
                    for fork in page_forks:
                        fork['_original_repo'] = repo_name
                        fork['_original_url'] = repo.get('url', '')

                    repo_forks.extend(page_forks)

                    # Проверяем, есть ли еще страницы
                    if not forks_data["pageInfo"]["hasNextPage"]:
                        break

                    cursor = forks_data["pageInfo"]["endCursor"]

                except Exception as e:
                    print(f"Ошибка при получении форков для {repo_name}: {e}")
                    break

            all_forks.extend(repo_forks)
            print(f"Найдено {len(repo_forks)} форков для {repo_name}")

        print(f"Всего найдено форков от собственных репозиториев: {len(all_forks)}")
        return all_forks

    def save_forks_of_user_repos_to_csv(self, forks: List[Dict[str, Any]], filename: str):
        """Сохранить форки собственных репозиториев в CSV файл"""
        if not forks:
            print("Нет форков собственных репозиториев для сохранения")
            return

        fieldnames = [
            'fork_name', 'fork_nameWithOwner', 'fork_createdAt', 'fork_pushedAt', 'fork_updatedAt',
            'fork_url', 'fork_description', 'fork_primaryLanguage', 'fork_stargazerCount',
            'fork_owner_login', 'original_repo', 'original_url'
        ]

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for fork in forks:
                owner = fork.get('owner', {})
                primary_language = fork.get('primaryLanguage', {})

                row = {
                    'fork_name': fork.get('name', ''),
                    'fork_nameWithOwner': fork.get('nameWithOwner', ''),
                    'fork_createdAt': fork.get('createdAt', ''),
                    'fork_pushedAt': fork.get('pushedAt', ''),
                    'fork_updatedAt': fork.get('updatedAt', ''),
                    'fork_url': fork.get('url', ''),
                    'fork_description': fork.get('description', ''),
                    'fork_primaryLanguage': primary_language.get('name', '') if primary_language else '',
                    'fork_stargazerCount': fork.get('stargazerCount', 0),
                    'fork_owner_login': owner.get('login', ''),
                    'original_repo': fork.get('_original_repo', ''),
                    'original_url': fork.get('_original_url', '')
                }
                writer.writerow(row)

        print(f"Форки собственных репозиториев сохранены в {filename}")

    def save_profile_stats_to_csv(self, profile_stats: Dict[str, Any], filename: str):
        """Сохранить статистику профиля в CSV для анализа роста аккаунта"""
        if not profile_stats:
            print("Нет данных профиля для сохранения")
            return

        # Основная статистика профиля
        basic_info = profile_stats.get("basic_info", {})
        social_stats = profile_stats.get("social_stats", {})
        contribution_stats = profile_stats.get("contribution_stats", {})

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Заголовок
            writer.writerow(["GitHub Profile Growth Analytics"])
            writer.writerow([])

            # Базовая информация
            writer.writerow(["=== BASIC PROFILE INFO ==="])
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Username", basic_info.get("login", "")])
            writer.writerow(["Name", basic_info.get("name", "")])
            writer.writerow(["Bio", basic_info.get("bio", "")])
            writer.writerow(["Company", basic_info.get("company", "")])
            writer.writerow(["Location", basic_info.get("location", "")])
            writer.writerow(["Website", basic_info.get("website", "")])
            writer.writerow(["Email", basic_info.get("email", "")])
            writer.writerow(["Twitter", basic_info.get("twitter", "")])
            writer.writerow(["Profile Created", basic_info.get("created_at", "")])
            writer.writerow(["Last Updated", basic_info.get("updated_at", "")])
            writer.writerow([])

            # Социальная статистика
            writer.writerow(["=== SOCIAL STATISTICS ==="])
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Followers", social_stats.get("followers", 0)])
            writer.writerow(["Following", social_stats.get("following", 0)])
            writer.writerow(["Public Repositories", social_stats.get("repositories", 0)])
            writer.writerow(["Starred Repositories", social_stats.get("starred_repos", 0)])
            writer.writerow(["Contributed To", social_stats.get("contributed_to", 0)])
            writer.writerow([])

            # Статистика контрибьюций
            writer.writerow(["=== CONTRIBUTION STATISTICS ==="])
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Total Issues Created", contribution_stats.get("total_issues", 0)])
            writer.writerow(["Total Pull Requests", contribution_stats.get("total_pull_requests", 0)])
            writer.writerow(["Total Commits", contribution_stats.get("total_commits", 0)])
            writer.writerow(["Issue Contributions", contribution_stats.get("total_issue_contributions", 0)])
            writer.writerow(["PR Contributions", contribution_stats.get("total_pr_contributions", 0)])
            writer.writerow(["PR Review Contributions", contribution_stats.get("total_pr_review_contributions", 0)])
            writer.writerow(["Repository Contributions", contribution_stats.get("total_repo_contributions", 0)])
            writer.writerow(["Contributions This Year", contribution_stats.get("total_contributions_this_year", 0)])
            writer.writerow([])

        print(f"Статистика профиля сохранена в {filename}")

    def save_languages_to_csv(self, languages: Dict[str, Any], filename: str):
        """Сохранить статистику языков программирования в CSV"""
        if not languages:
            print("Нет данных о языках для сохранения")
            return

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Programming Languages Statistics"])
            writer.writerow([])
            writer.writerow(["Language", "Percentage", "Total Bytes"])
            writer.writerow([])

            by_percentage = languages.get("by_percentage", {})
            by_bytes = languages.get("by_bytes", {})

            for lang in by_percentage.keys():
                percentage = by_percentage.get(lang, 0)
                bytes_count = by_bytes.get(lang, 0)
                writer.writerow([lang, f"{percentage}%", bytes_count])

            writer.writerow([])
            writer.writerow(["Total Languages", languages.get("total_languages", 0)])

        print(f"Статистика языков сохранена в {filename}")

    def save_top_repos_to_csv(self, top_repos: List[Dict[str, Any]], filename: str):
        """Сохранить топ репозиториев в CSV"""
        if not top_repos:
            print("Нет топ репозиториев для сохранения")
            return

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Top Repositories by Stars"])
            writer.writerow([])
            writer.writerow(["Repository", "Stars", "Forks", "Language", "Created", "Updated", "Archived"])

            for repo in top_repos:
                writer.writerow([
                    repo.get("name", ""),
                    repo.get("stars", 0),
                    repo.get("forks", 0),
                    repo.get("language", ""),
                    repo.get("created_at", "")[:10] if repo.get("created_at") else "",
                    repo.get("updated_at", "")[:10] if repo.get("updated_at") else "",
                    "Yes" if repo.get("is_archived") else "No"
                ])

        print(f"Топ репозиториев сохранен в {filename}")

    def save_activity_trends_to_csv(self, activity_trends: Dict[str, Any], filename: str):
        """Сохранить тренды активности в CSV"""
        if not activity_trends:
            print("Нет данных об активности для сохранения")
            return

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow(["Activity Trends & Growth Analytics"])
            writer.writerow([])
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Total Contributions (Last Year)", activity_trends.get("total_contributions_last_year", 0)])
            writer.writerow(["Active Days (Last Year)", activity_trends.get("active_days_last_year", 0)])
            writer.writerow(["Average Weekly Contributions", activity_trends.get("average_weekly_contributions", 0)])
            writer.writerow(["Average Daily Contributions", activity_trends.get("average_daily_contributions", 0)])
            writer.writerow(["Max Daily Contributions", activity_trends.get("max_daily_contributions", 0)])
            writer.writerow(["Most Active Day", activity_trends.get("most_active_day", "")])
            writer.writerow(["Consistency Score (%)", activity_trends.get("consistency_score", 0)])
            writer.writerow([])

            # Месячные контрибьюции
            writer.writerow(["Monthly Contributions"])
            writer.writerow(["Month", "Contributions"])
            monthly = activity_trends.get("monthly_contributions", {})
            for month, count in monthly.items():
                writer.writerow([month, count])

        print(f"Тренды активности сохранены в {filename}")

    def unstar_all_repositories(self, confirm: bool = False, batch_size: int = 10) -> Dict[str, Any]:
        """
        Удалить звезды со ВСЕХ starred репозиториев

        Args:
            confirm: Подтверждение операции (для безопасности)
            batch_size: Количество репозиториев для обработки за раз

        Returns:
            Результат операции
        """
        if not confirm:
            print("❌ ОПАСНАЯ ОПЕРАЦИЯ!")
            print("Эта команда удалит ВСЕ ваши starred репозитории!")
            print("Это действие НЕЛЬЗЯ отменить!")
            print("")
            print("Для подтверждения добавьте параметр confirm=True")
            print("Пример: collector.unstar_all_repositories(confirm=True)")
            return {"error": "Требуется подтверждение", "unstarred": 0}

        print("⚠️  НАЧИНАЕМ ОПЕРАЦИЮ УДАЛЕНИЯ ВСЕХ ЗВЕЗД!")
        print("Это действие нельзя отменить!")

        # Получаем все starred репозитории
        starred_analysis = self.get_starred_repositories_analysis()
        starred_repos = starred_analysis.get("analysis", {}).get("all_starred_repos", [])

        if not starred_repos:
            return {"message": "Нет starred репозиториев для удаления", "unstarred": 0}

        total_to_unstar = len(starred_repos)
        print(f"Найдено {total_to_unstar} starred репозиториев для удаления")

        # Создаем резервную копию перед удалением
        backup_file = f"starred_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(starred_repos, f, indent=2, ensure_ascii=False)
        print(f"📁 Резервная копия сохранена в {backup_file}")

        unstarred_count = 0
        errors = []

        # Обрабатываем батчами
        for i in range(0, total_to_unstar, batch_size):
            batch_end = min(i + batch_size, total_to_unstar)
            batch_repos = starred_repos[i:batch_end]

            print(f"Обработка батча {i//batch_size + 1}/{(total_to_unstar + batch_size - 1)//batch_size}: {i+1}-{batch_end}")

            for j, repo in enumerate(batch_repos):
                repo_name = repo.get("name", "")
                try:
                    # Используем REST API для unstar
                    owner, name = repo_name.split('/', 1)
                    url = f"{self.base_url}/user/starred/{owner}/{name}"

                    response = self.session.delete(url)

                    if response.status_code == 204:
                        unstarred_count += 1
                        print(f"  ✅ {i + j + 1}/{total_to_unstar}: {repo_name}")
                    elif response.status_code == 403:
                        # Проверяем на rate limit
                        remaining = response.headers.get("X-RateLimit-Remaining", "unknown")
                        reset_time = response.headers.get("X-RateLimit-Reset", "unknown")

                        if remaining == "0":
                            # Rate limit exceeded
                            reset_timestamp = int(reset_time) if reset_time.isdigit() else 0
                            wait_time = max(reset_timestamp - int(time.time()), 60)
                            print(f"  ⏳ Rate limit! Ждем {wait_time} сек до {time.strftime('%H:%M:%S', time.localtime(reset_timestamp))}")
                            time.sleep(wait_time)
                            # Повторяем попытку после ожидания
                            response = self.session.delete(url)
                            if response.status_code == 204:
                                unstarred_count += 1
                                print(f"  ✅ {i + j + 1}/{total_to_unstar}: {repo_name} (после ожидания)")
                                continue

                        # Если не rate limit, то проблема с правами токена
                        error_msg = f"403 Forbidden - проверьте права токена. Требуется scope 'user' для управления starred репозиториями"
                        errors.append(f"{repo_name}: {error_msg}")
                        print(f"  ❌ {i + j + 1}/{total_to_unstar}: {repo_name} - {error_msg}")

                        # Показываем детали для отладки
                        print(f"      Осталось запросов: {remaining}")
                        print(f"      Сброс лимита: {reset_time}")
                        if response.text:
                            print(f"      Ответ сервера: {response.text[:200]}")

                    elif response.status_code == 404:
                        error_msg = f"404 Not Found - репозиторий {repo_name} не найден или уже не starred"
                        errors.append(f"{repo_name}: {error_msg}")
                        print(f"  ⚠️  {i + j + 1}/{total_to_unstar}: {repo_name} - {error_msg}")

                    else:
                        error_msg = f"HTTP {response.status_code}: {response.text[:100] if response.text else 'Неизвестная ошибка'}"
                        errors.append(f"{repo_name}: {error_msg}")
                        print(f"  ❌ {i + j + 1}/{total_to_unstar}: {repo_name} - {error_msg}")

                except Exception as e:
                    error_msg = f"Ошибка при обработке {repo_name}: {str(e)}"
                    errors.append(error_msg)
                    print(f"  ❌ {i + j + 1}/{total_to_unstar}: {repo_name} - {error_msg}")

            # Пауза между батчами
            if batch_end < total_to_unstar:
                pause_time = min(batch_size, 30)  # Максимум 30 секунд
                print(f"Пауза между батчами... ({pause_time} сек)")
                time.sleep(pause_time)

        result = {
            "total_attempted": total_to_unstar,
            "successfully_unstarred": unstarred_count,
            "errors_count": len(errors),
            "errors": errors[:10],  # Показываем только первые 10 ошибок
            "backup_file": backup_file,
            "success_rate": round((unstarred_count / total_to_unstar) * 100, 1) if total_to_unstar > 0 else 0
        }

        print("\n🎯 ОПЕРАЦИЯ ЗАВЕРШЕНА!")
        print(f"✅ Успешно удалено звезд: {unstarred_count}/{total_to_unstar}")
        print(f"❌ Ошибок: {len(errors)}")
        print(f"📁 Резервная копия: {backup_file}")

        return result

    def check_repository_files(self, repo_owner: str, repo_name: str) -> Dict[str, Any]:
        """
        Проверяем наличие файлов LICENSE и README через GitHub Contents API
        """
        try:
            # Проверяем различные варианты файлов лицензии
            license_files = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING", "COPYING.md"]
            has_license = False
            license_found = None

            for license_file in license_files:
                license_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{license_file}"
                license_response = self.session.get(license_url)
                if license_response.status_code == 200:
                    has_license = True
                    license_found = license_file
                    break

            # Проверяем различные варианты README файлов
            readme_files = ["README.md", "README.rst", "README.txt", "README", "readme.md", "Readme.md"]
            has_readme = False
            readme_found = None

            for readme_file in readme_files:
                readme_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{readme_file}"
                readme_response = self.session.get(readme_url)
                if readme_response.status_code == 200:
                    has_readme = True
                    readme_found = readme_file
                    break

            return {
                "has_license_file": has_license,
                "license_file": license_found,
                "has_readme_file": has_readme,
                "readme_file": readme_found
            }
        except Exception as e:
            return {
                "has_license_file": False,
                "has_readme_file": False,
                "error": str(e)
            }

    def analyze_repository_quality(self) -> Dict[str, Any]:
        """
        Анализ качества репозиториев - проверка на отсутствие важных элементов
        """
        print("🔍 Анализируем качество репозиториев...")

        # Получаем все репозитории пользователя
        user_repos = self.get_user_repositories()

        if not user_repos:
            return {"error": "Не удалось получить репозитории пользователя"}

        quality_issues = {
            "missing_description": [],
            "missing_license": [],
            "missing_topics": [],
            "missing_readme": [],
            "low_quality_score": []
        }

        total_repos = len(user_repos)
        analyzed = 0

        print(f"Анализируем {total_repos} репозиториев...")

        for repo in user_repos:
            repo_name = repo.get("nameWithOwner", "")
            analyzed += 1

            print(f"  {analyzed}/{total_repos}: {repo_name}")

            # Проверяем описание
            if not repo.get("description") or repo.get("description", "").strip() == "":
                quality_issues["missing_description"].append({
                    "repo": repo_name,
                    "url": repo.get("url", ""),
                    "stars": repo.get("stargazerCount", 0),
                    "updated": repo.get("updatedAt", "")
                })

            # Проверяем лицензию (GraphQL + проверка файлов)
            has_license_graphql = bool(repo.get("licenseInfo"))

            if not has_license_graphql:
                # Дополнительная проверка через Contents API
                try:
                    owner, name = repo_name.split('/', 1)
                    files_check = self.check_repository_files(owner, name)
                    has_license_file = files_check.get("has_license_file", False)

                    if not has_license_file:
                        quality_issues["missing_license"].append({
                            "repo": repo_name,
                            "url": repo.get("url", ""),
                            "stars": repo.get("stargazerCount", 0),
                            "updated": repo.get("updatedAt", "")
                        })
                except Exception as e:
                    # Если не можем проверить файлы, считаем что лицензии нет
                    quality_issues["missing_license"].append({
                        "repo": repo_name,
                        "url": repo.get("url", ""),
                        "stars": repo.get("stargazerCount", 0),
                        "updated": repo.get("updatedAt", "")
                    })

            # Проверяем топики/теги (GraphQL)
            repository_topics = repo.get("repositoryTopics", {}).get("nodes", [])
            has_topics_graphql = bool(repository_topics and len(repository_topics) > 0)

            if not has_topics_graphql:
                quality_issues["missing_topics"].append({
                    "repo": repo_name,
                    "url": repo.get("url", ""),
                    "stars": repo.get("stargazerCount", 0),
                    "updated": repo.get("updatedAt", "")
                })

            # Проверяем README (через Contents API)
            try:
                owner, name = repo_name.split('/', 1)
                files_check = self.check_repository_files(owner, name)
                has_readme_file = files_check.get("has_readme_file", False)

                if not has_readme_file:
                    quality_issues["missing_readme"].append({
                        "repo": repo_name,
                        "url": repo.get("url", ""),
                        "stars": repo.get("stargazerCount", 0),
                        "size_kb": repo.get("diskUsage", 0),
                        "updated": repo.get("updatedAt", "")
                    })
            except Exception as e:
                # Если не можем проверить, используем размер как индикатор
                size_kb = repo.get("diskUsage", 0)
                if size_kb < 10:  # Менее 10KB - возможно нет README
                    quality_issues["missing_readme"].append({
                        "repo": repo_name,
                        "url": repo.get("url", ""),
                        "stars": repo.get("stargazerCount", 0),
                        "size_kb": size_kb,
                        "updated": repo.get("updatedAt", "")
                    })

        # Вычисляем общую статистику
        stats = {
            "total_repositories": total_repos,
            "analyzed_repositories": analyzed,
            "quality_score": round((1 - sum(len(v) for v in quality_issues.values()) / (total_repos * 4)) * 100, 1),
            "issues_summary": {
                "missing_description": len(quality_issues["missing_description"]),
                "missing_license": len(quality_issues["missing_license"]),
                "missing_topics": len(quality_issues["missing_topics"]),
                "missing_readme": len(quality_issues["missing_readme"])
            }
        }

        # Определяем репозитории с низким качеством (более 2 проблем)
        for repo in user_repos:
            repo_name = repo.get("nameWithOwner", "")
            issues_count = sum(1 for issue_list in quality_issues.values()
                             for issue in issue_list if issue["repo"] == repo_name)

            if issues_count >= 2:
                quality_issues["low_quality_score"].append({
                    "repo": repo_name,
                    "url": repo.get("url", ""),
                    "stars": repo.get("stargazerCount", 0),
                    "issues_count": issues_count,
                    "updated": repo.get("updatedAt", "")
                })

        result = {
            "statistics": stats,
            "quality_issues": quality_issues
        }

        print("\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА КАЧЕСТВА:")
        print(f"Всего репозиториев: {stats['total_repositories']}")
        print(".1f")
        print(f"Без описания: {stats['issues_summary']['missing_description']}")
        print(f"Без лицензии: {stats['issues_summary']['missing_license']}")
        print(f"Без тегов: {stats['issues_summary']['missing_topics']}")
        print(f"Возможно без README: {stats['issues_summary']['missing_readme']}")
        print(f"Низкое качество (2+ проблем): {len(quality_issues['low_quality_score'])}")

        return result

    def save_quality_analysis_to_csv(self, quality_data: Dict[str, Any], filename: str):
        """Сохранить анализ качества репозиториев в CSV"""
        if not quality_data or "quality_issues" not in quality_data:
            print("Нет данных для анализа качества")
            return

        stats = quality_data.get("statistics", {})
        issues = quality_data.get("quality_issues", {})

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Заголовок
            writer.writerow(["Анализ качества репозиториев"])
            writer.writerow([])

            # Общая статистика
            writer.writerow(["Общая статистика"])
            writer.writerow(["Показатель", "Значение"])
            writer.writerow(["Всего репозиториев", stats.get("total_repositories", 0)])
            writer.writerow(["Проанализировано", stats.get("analyzed_repositories", 0)])
            writer.writerow(["Общий балл качества", ".1f"])
            writer.writerow([])

            # Проблемы по категориям
            writer.writerow(["Проблемы по категориям"])
            writer.writerow(["Категория", "Количество", "Процент"])
            issues_summary = stats.get("issues_summary", {})
            total = stats.get("total_repositories", 1)

            categories = [
                ("Без описания", "missing_description"),
                ("Без лицензии", "missing_license"),
                ("Без тегов", "missing_topics"),
                ("Возможно без README", "missing_readme")
            ]

            for category_name, category_key in categories:
                count = issues_summary.get(category_key, 0)
                percentage = round((count / total) * 100, 1) if total > 0 else 0
                writer.writerow([category_name, count, f"{percentage}%"])
            writer.writerow([])

            # Репозитории без описания
            if issues.get("missing_description"):
                writer.writerow(["Репозитории БЕЗ ОПИСАНИЯ"])
                writer.writerow(["Репозиторий", "Звезды", "Последнее обновление", "URL"])
                for repo in sorted(issues["missing_description"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("updated", "")[:10] if repo.get("updated") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Репозитории без лицензии
            if issues.get("missing_license"):
                writer.writerow(["Репозитории БЕЗ ЛИЦЕНЗИИ"])
                writer.writerow(["Репозиторий", "Звезды", "Последнее обновление", "URL"])
                for repo in sorted(issues["missing_license"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("updated", "")[:10] if repo.get("updated") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Репозитории без тегов
            if issues.get("missing_topics"):
                writer.writerow(["Репозитории БЕЗ ТЕГОВ"])
                writer.writerow(["Репозиторий", "Звезды", "Последнее обновление", "URL"])
                for repo in sorted(issues["missing_topics"], key=lambda x: x.get("stars", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("updated", "")[:10] if repo.get("updated") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Репозитории с низким качеством
            if issues.get("low_quality_score"):
                writer.writerow(["НИЗКОЕ КАЧЕСТВО (2+ ПРОБЛЕМЫ)"])
                writer.writerow(["Репозиторий", "Звезды", "Проблем", "Последнее обновление", "URL"])
                for repo in sorted(issues["low_quality_score"], key=lambda x: x.get("issues_count", 0), reverse=True):
                    writer.writerow([
                        repo.get("repo", ""),
                        repo.get("stars", 0),
                        repo.get("issues_count", 0),
                        repo.get("updated", "")[:10] if repo.get("updated") else "",
                        repo.get("url", "")
                    ])
                writer.writerow([])

            # Рекомендации
            writer.writerow(["РЕКОМЕНДАЦИИ ДЛЯ УЛУЧШЕНИЯ"])
            writer.writerow(["1. Добавьте описания к репозиториям - это помогает пользователям понять, что делает проект"])
            writer.writerow(["2. Выберите подходящую лицензию (MIT, Apache 2.0, GPL и т.д.)"])
            writer.writerow(["3. Добавьте теги/топики для лучшего поиска и категоризации"])
            writer.writerow(["4. Создайте README.md с инструкциями по установке и использованию"])
            writer.writerow(["5. Начните с репозиториев, у которых больше звезд - они дают больший эффект"])

        print(f"Анализ качества сохранен в {filename}")

    def collect_all_data(self):
        """Собрать все данные и сохранить в файлы"""
        print(f"Начинаем сбор данных для пользователя: {self.username}")

        # Получаем статистику профиля для роста аккаунта
        profile_stats = self.get_user_profile_stats()

        # Получаем форки (форки других репозиториев)
        forks = self.get_all_forks()

        # Получаем собственные репозитории
        user_repos = self.get_user_repositories()

        # Получаем репозитории отсортированные по звездам
        repos_stars_sorted = self.get_repositories_stars_sorted()

        # Получаем анализ starred репозиториев
        starred_analysis = self.get_starred_repositories_analysis()

        # Получаем детальную аналитику по всем репозиториям с звездами
        repos_with_stars = [repo for repo in repos_stars_sorted if repo.get('stargazerCount', 0) > 0]
        all_repos_analytics = self.get_top_repositories_analytics(repos_with_stars, limit=None, batch_size=3)

        # Получаем форки собственных репозиториев
        forks_of_user_repos = self.get_forks_of_user_repos(user_repos)

        # Получаем issues
        issues = self.get_all_issues()

        # Анализируем качество репозиториев
        quality_analysis = self.analyze_repository_quality()

        # Готовим данные для сохранения
        data = {
            "username": self.username,
            "collected_at": datetime.now().isoformat(),
            "profile_stats": profile_stats,  # статистика для роста аккаунта
            "starred_analysis": starred_analysis,  # анализ starred репозиториев
            "quality_analysis": quality_analysis,  # анализ качества репозиториев
            "forks": forks,  # форки других репозиториев
            "user_repositories": user_repos,  # собственные репозитории
            "repositories_stars_sorted": repos_stars_sorted,  # репозитории отсортированные по звездам
            "all_repositories_analytics": all_repos_analytics,  # детальная аналитика всех репозиториев с звездами
            "forks_of_user_repos": forks_of_user_repos,  # форки собственных репозиториев
            "issues": issues,
            "summary": {
                "total_forks": len(forks),  # форки других репозиториев
                "total_user_repos": len(user_repos),  # собственные репозитории
                "total_repos_stars_sorted": len(repos_stars_sorted),  # репозитории по звездам
                "total_forks_of_user_repos": len(forks_of_user_repos),  # форки собственных репозиториев
                "total_issues": len(issues),
                "open_issues": len([i for i in issues if i.get('state') == 'OPEN']),
                "closed_issues": len([i for i in issues if i.get('state') == 'CLOSED']),
                "total_stars_all_repos": sum(repo.get('stargazerCount', 0) for repo in repos_stars_sorted),
                "average_stars_per_repo": round(sum(repo.get('stargazerCount', 0) for repo in repos_stars_sorted) / len(repos_stars_sorted), 2) if repos_stars_sorted else 0,
                "all_repos_analyzed": len(all_repos_analytics)  # количество проанализированных репозиториев
            }
        }

        # Сохраняем в JSON
        self.save_to_json(data, "github_data.json")

        # Сохраняем статистику профиля для роста аккаунта
        self.save_profile_stats_to_csv(profile_stats, "github_profile_growth.csv")
        self.save_languages_to_csv(profile_stats.get("languages", {}), "github_languages.csv")
        self.save_top_repos_to_csv(profile_stats.get("top_repositories", []), "github_top_repos.csv")
        self.save_activity_trends_to_csv(profile_stats.get("activity_trends", {}), "github_activity_trends.csv")

        # Сохраняем анализ starred репозиториев
        self.save_starred_analysis_to_csv(starred_analysis, "github_starred_analysis.csv")

        # Сохраняем форки в CSV
        self.save_forks_to_csv(forks, "github_forks.csv")

        # Сохраняем репозитории отсортированные по звездам
        self.save_repositories_stars_to_csv(repos_stars_sorted, "github_repos_stars_sorted.csv")

        # Сохраняем распределение звезд
        self.save_stars_distribution_to_csv(repos_stars_sorted, "github_stars_distribution.csv")

        # Сохраняем детальную аналитику всех репозиториев с звездами
        self.save_repository_analytics_to_csv(all_repos_analytics, "github_top_repos_detailed_analytics.csv")

        # Сохраняем форки собственных репозиториев в CSV
        self.save_forks_of_user_repos_to_csv(forks_of_user_repos, "github_forks_of_user_repos.csv")

        # Сохраняем issues в CSV
        self.save_issues_to_csv(issues, "github_issues.csv")

        # Сохраняем анализ качества репозиториев
        self.save_quality_analysis_to_csv(quality_analysis, "github_quality_analysis.csv")

        print("Сбор данных завершен!")
        print(f"Форков других репозиториев: {len(forks)}")
        print(f"Собственных репозиториев: {len(user_repos)}")
        print(f"Репозиториев по звездам: {len(repos_stars_sorted)}")
        print(f"Всего звезд на всех репозиториях: {sum(repo.get('stargazerCount', 0) for repo in repos_stars_sorted)}")
        print(f"Starred репозиториев: {starred_analysis.get('analysis', {}).get('total_starred', 0)}")
        print(f"Детальная аналитика всех репозиториев с звездами: {len(all_repos_analytics)}")
        print(f"Форков собственных репозиториев: {len(forks_of_user_repos)}")
        print(f"Issues: {len(issues)}")
        print(f"Статистика профиля для роста аккаунта собрана!")


def main():
    """Главная функция"""
    # Проверка аргументов командной строки
    if len(sys.argv) > 1:
        if sys.argv[1] == '--license-manager':
            # Запуск менеджера лицензий
            token = "github_pat_1"
            if not token:
                print("❌ Токен не найден!")
                return

            license_manager = GitHubLicenseBatchManager(token)

            username = license_manager.get_authenticated_user()
            if not username:
                print("❌ Ошибка аутентификации. Проверьте токен.")
                return

            print(f"👤 Добро пожаловать, {username}!")
            license_manager.interactive_batch_setup()
            return

        elif sys.argv[1] == '--demo-unstar':
            demo_unstar_warning()
            return

        elif sys.argv[1] == '--check-readme':
            # Проверка наличия README файлов
            token = "github_pat_1"
            if not token:
                print("❌ Токен не найден!")
                return

            license_manager = GitHubLicenseBatchManager(token)

            username = license_manager.get_authenticated_user()
            if not username:
                print("❌ Ошибка аутентификации. Проверьте токен.")
                return

            print(f"👤 Добро пожаловать, {username}!")

            # Проверяем наличие README во всех репозиториях
            readme_data = license_manager.check_readme_presence(include_forks=False)
            license_manager.save_readme_check_to_csv(readme_data, "github_readme_check.csv")
            return

        elif sys.argv[1] == '--check-topics':
            # Проверка наличия тегов (топиков)
            token = "github_pat_1"
            if not token:
                print("❌ Токен не найден!")
                return

            license_manager = GitHubLicenseBatchManager(token)

            username = license_manager.get_authenticated_user()
            if not username:
                print("❌ Ошибка аутентификации. Проверьте токен.")
                return

            print(f"👤 Добро пожаловать, {username}!")

            # Проверяем наличие тегов во всех репозиториях
            topics_data = license_manager.check_topics_presence()
            license_manager.save_topics_check_to_csv(topics_data, "github_topics_check.csv")
            return

    # Получаем токен из переменной окружения или запрашиваем у пользователя
    token = "github_pat_1"

    if not token:
        print("GitHub Personal Access Token не найден!")
        print("Создайте PAT в GitHub (Settings → Developer settings → Personal access tokens)")
        print("И установите переменную окружения GITHUB_TOKEN или введите токен ниже:")
        token = input("Введите ваш GitHub PAT: ").strip()

    if not token:
        print("Токен не предоставлен. Выход.")
        return

    try:
        # Создаем коллектор
        collector = GitHubDataCollector(token)

        # Собираем данные
        collector.collect_all_data()

    except requests.exceptions.RequestException as e:
        print(f"Ошибка при работе с GitHub API: {e}")
    except KeyboardInterrupt:
        print("\nОперация прервана пользователем")
    except Exception as e:
        print(f"Неожиданная ошибка: {e}")


def demo_unstar_warning():
    token = "---"
    collector = GitHubDataCollector(token)
    result = collector.unstar_all_repositories(confirm=True, batch_size=5)
    print(result)

    print("Удаление звезд завершено!")
    print(f"Успешно удалено звезд: {result.get('successfully_unstarred', 0)}")
    print(f"Ошибок: {result.get('errors_count', 0)}")
    print(f"Резервная копия: {result.get('backup_file', 'Не создана')}")
    print(f"Успешность: {result.get('success_rate', 0)}%")


if __name__ == "__main__":
    # Проверяем аргументы командной строки
    if len(sys.argv) > 1 and sys.argv[1] == "--demo-unstar":
        demo_unstar_warning()
    else:
        main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор бюджетного калькулятора для OpenOffice Calc из JSON
"""

import json
import sys
from datetime import datetime
from pathlib import Path

try:
    from odf.opendocument import OpenDocumentSpreadsheet
    from odf.style import Style, TextProperties, ParagraphProperties, TableColumnProperties, TableCellProperties
    from odf.text import P
    from odf.table import Table, TableColumn, TableRow, TableCell
    from odf.number import NumberStyle, Number, Text as NumberText, CurrencyStyle, CurrencySymbol
except ImportError:
    print("Установка необходимых библиотек...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "odfpy", "--break-system-packages"])
    from odf.opendocument import OpenDocumentSpreadsheet
    from odf.style import Style, TextProperties, ParagraphProperties, TableColumnProperties, TableCellProperties
    from odf.text import P
    from odf.table import Table, TableColumn, TableRow, TableCell
    from odf.number import NumberStyle, Number, Text as NumberText, CurrencyStyle, CurrencySymbol


def load_budget_data(json_file):
    """Загрузка данных бюджета из JSON файла"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Ошибка: Файл {json_file} не найден!")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Ошибка при чтении JSON: {e}")
        sys.exit(1)


def create_styles(doc, currency_symbol="₴"):
    """Создание стилей для документа"""
    
    # Стиль для заголовков
    header_style = Style(name="HeaderStyle", family="table-cell")
    header_style.addElement(TextProperties(fontweight="bold", fontsize="14pt"))
    header_style.addElement(ParagraphProperties(textalign="center"))
    header_style.addElement(TableCellProperties(backgroundcolor="#4472C4"))
    doc.styles.addElement(header_style)
    
    # Стиль для категорий
    category_style = Style(name="CategoryStyle", family="table-cell")
    category_style.addElement(TextProperties(fontweight="bold", fontsize="12pt"))
    category_style.addElement(TableCellProperties(backgroundcolor="#D9E1F2"))
    doc.styles.addElement(category_style)
    
    # Стиль для итогов
    total_style = Style(name="TotalStyle", family="table-cell")
    total_style.addElement(TextProperties(fontweight="bold", fontsize="12pt"))
    total_style.addElement(TableCellProperties(backgroundcolor="#F4B084"))
    doc.styles.addElement(total_style)
    
    # Стиль для денежных значений
    currency_style = CurrencyStyle(name="CurrencyStyle")
    currency_style.addElement(Number(decimalplaces="2", minintegerdigits="1", grouping="true"))
    currency_style.addElement(NumberText(text=" "))
    currency_style.addElement(CurrencySymbol(language="uk", country="UA", text=currency_symbol))
    doc.styles.addElement(currency_style)
    
    # Стиль для ячеек с валютой
    currency_cell_style = Style(name="CurrencyCellStyle", family="table-cell", datastylename="CurrencyStyle")
    doc.styles.addElement(currency_cell_style)
    
    # Стиль для положительного баланса
    positive_style = Style(name="PositiveStyle", family="table-cell", datastylename="CurrencyStyle")
    positive_style.addElement(TableCellProperties(backgroundcolor="#C6EFCE"))
    doc.styles.addElement(positive_style)
    
    # Стиль для отрицательного баланса
    negative_style = Style(name="NegativeStyle", family="table-cell", datastylename="CurrencyStyle")
    negative_style.addElement(TableCellProperties(backgroundcolor="#FFC7CE"))
    doc.styles.addElement(negative_style)
    
    return {
        'header': header_style,
        'category': category_style,
        'total': total_style,
        'currency': currency_cell_style,
        'positive': positive_style,
        'negative': negative_style
    }


def create_cell(text, value=None, formula=None, style=None, value_type="string"):
    """Создание ячейки с текстом, значением или формулой"""
    cell = TableCell()
    
    if style:
        cell.setAttribute("stylename", style.getAttribute("name"))
    
    if formula:
        cell.setAttribute("formula", formula)
        cell.setAttribute("valuetype", "float")
    elif value is not None:
        if value_type == "float":
            cell.setAttribute("valuetype", "float")
            cell.setAttribute("value", str(value))
        else:
            cell.setAttribute("valuetype", value_type)
    
    if text is not None:
        p = P()
        p.addText(str(text))
        cell.addElement(p)
    
    return cell


def add_section(table, title, items, start_row, styles, currency):
    """Добавление секции (доходы, расходы, накопления) в таблицу
    
    Args:
        start_row: номер строки в документе, где будет размещён заголовок секции (1-based)
    
    Returns:
        номер строки, где размещена строка ИТОГО
    """
    
    # Заголовок секции (будет на строке start_row)
    header_row = TableRow()
    header_row.addElement(create_cell(title, style=styles['category']))
    header_row.addElement(create_cell(f"Сумма ({currency})", style=styles['category']))
    header_row.addElement(create_cell("Периодичность", style=styles['category']))
    table.addElement(header_row)
    
    # Элементы секции начинаются со следующей строки
    data_start_row = start_row + 1
    current_row = data_start_row
    for item in items:
        row = TableRow()
        row.addElement(create_cell(item['name']))
        row.addElement(create_cell(
            item['amount'], 
            value=item['amount'], 
            style=styles['currency'], 
            value_type="float"
        ))
        row.addElement(create_cell(item.get('frequency', 'Ежемесячно')))
        table.addElement(row)
        current_row += 1
    
    # Итого для секции (current_row указывает на строку ПОСЛЕ последнего элемента данных)
    total_row_number = current_row
    total_row = TableRow()
    total_label = "ИТОГО " + title.lower() + ":"
    total_row.addElement(create_cell(total_label, style=styles['total']))
    # Диапазон: от первой строки данных до последней (не включая строку итога)
    end_data_row = current_row - 1
    total_formula = f"of:=SUM([.B{data_start_row}:.B{end_data_row}])"
    total_row.addElement(create_cell("", formula=total_formula, style=styles['total']))
    total_row.addElement(create_cell("", style=styles['total']))
    table.addElement(total_row)
    
    return total_row_number  # Возвращаем номер строки с итогом


def add_dated_expenses_section(table, dated_expenses, start_row, styles, currency):
    """Добавление секции точечных расходов с датами"""
    
    # Заголовок секции
    header_row = TableRow()
    header_row.addElement(create_cell("ТОЧЕЧНЫЕ РАСХОДЫ (ПО ДАТАМ)", style=styles['category']))
    header_row.addElement(create_cell(f"Сумма ({currency})", style=styles['category']))
    header_row.addElement(create_cell("Дата", style=styles['category']))
    table.addElement(header_row)
    
    # Сортировка по дате
    sorted_expenses = sorted(dated_expenses, key=lambda x: x.get('date', ''))
    
    # Элементы секции
    data_start_row = start_row + 1
    current_row = data_start_row
    for item in sorted_expenses:
        row = TableRow()
        row.addElement(create_cell(item['name']))
        row.addElement(create_cell(
            item['amount'], 
            value=item['amount'], 
            style=styles['currency'], 
            value_type="float"
        ))
        row.addElement(create_cell(item.get('date', '')))
        table.addElement(row)
        current_row += 1
    
    # Итого для секции
    total_row_number = current_row
    total_row = TableRow()
    total_row.addElement(create_cell("ИТОГО точечные расходы:", style=styles['total']))
    end_data_row = current_row - 1
    total_formula = f"of:=SUM([.B{data_start_row}:.B{end_data_row}])"
    total_row.addElement(create_cell("", formula=total_formula, style=styles['total']))
    total_row.addElement(create_cell("", style=styles['total']))
    table.addElement(total_row)
    
    return total_row_number


def create_budget_from_json(json_file):
    """Создание документа калькулятора бюджета из JSON"""
    
    # Загрузка данных
    data = load_budget_data(json_file)
    
    # Получение параметров
    period = data.get('period', datetime.now().strftime("%B %Y"))
    currency = data.get('currency', '₴')
    
    # Создание документа
    doc = OpenDocumentSpreadsheet()
    styles = create_styles(doc, currency)
    
    # Создание таблицы
    table = Table(name="Бюджет")
    
    # Настройка ширины колонок
    table.addElement(TableColumn(numbercolumnsrepeated=1))  # Название
    table.addElement(TableColumn(numbercolumnsrepeated=1))  # Сумма
    table.addElement(TableColumn(numbercolumnsrepeated=1))  # Периодичность
    
    # Заголовок документа
    title_row = TableRow()
    title_row.addElement(create_cell("КАЛЬКУЛЯТОР БЮДЖЕТА", style=styles['header']))
    title_row.addElement(create_cell("", style=styles['header']))
    title_row.addElement(create_cell("", style=styles['header']))
    table.addElement(title_row)
    
    # Пустая строка
    table.addElement(TableRow())
    
    # Период
    date_row = TableRow()
    date_row.addElement(create_cell("Период:"))
    date_row.addElement(create_cell(period))
    date_row.addElement(create_cell(""))
    table.addElement(date_row)
    
    # Пустая строка
    table.addElement(TableRow())
    
    current_row = 5  # Следующая свободная строка (строка 5 - это где будет первый заголовок секции)
    total_rows = {}
    
    # === ДОХОДЫ ===
    if 'incomes' in data and data['incomes']:
        income_total_row = add_section(
            table, 
            "ДОХОДЫ", 
            data['incomes'], 
            current_row,  # Заголовок "ДОХОДЫ" будет на этой строке
            styles, 
            currency
        )
        total_rows['income'] = income_total_row
        table.addElement(TableRow())  # Пустая строка
        current_row = income_total_row + 2  # +1 за пустую строку, +1 для следующего заголовка
    
    # === ПОСТОЯННЫЕ РАСХОДЫ ===
    if 'fixed_expenses' in data and data['fixed_expenses']:
        fixed_total_row = add_section(
            table, 
            "ПОСТОЯННЫЕ РАСХОДЫ", 
            data['fixed_expenses'], 
            current_row, 
            styles, 
            currency
        )
        total_rows['fixed'] = fixed_total_row
        table.addElement(TableRow())  # Пустая строка
        current_row = fixed_total_row + 2
    
    # === ПЕРЕМЕННЫЕ РАСХОДЫ ===
    if 'variable_expenses' in data and data['variable_expenses']:
        variable_total_row = add_section(
            table, 
            "ПЕРЕМЕННЫЕ РАСХОДЫ", 
            data['variable_expenses'], 
            current_row, 
            styles, 
            currency
        )
        total_rows['variable'] = variable_total_row
        table.addElement(TableRow())  # Пустая строка
        current_row = variable_total_row + 2
    
    # === НАКОПЛЕНИЯ ===
    if 'savings' in data and data['savings']:
        savings_total_row = add_section(
            table, 
            "НАКОПЛЕНИЯ И ЦЕЛИ", 
            data['savings'], 
            current_row, 
            styles, 
            currency
        )
        total_rows['savings'] = savings_total_row
        table.addElement(TableRow())  # Пустая строка
        current_row = savings_total_row + 2
    
    # === ТОЧЕЧНЫЕ РАСХОДЫ ===
    if 'dated_expenses' in data and data['dated_expenses']:
        dated_total_row = add_dated_expenses_section(
            table, 
            data['dated_expenses'], 
            current_row, 
            styles, 
            currency
        )
        total_rows['dated'] = dated_total_row
        table.addElement(TableRow())  # Пустая строка
        current_row = dated_total_row + 2
    
    # Пустая строка
    table.addElement(TableRow())
    
    # === ИТОГОВЫЙ БАЛАНС ===
    # Всего расходов
    total_expenses_row = TableRow()
    total_expenses_row.addElement(create_cell("ВСЕГО РАСХОДОВ:", style=styles['total']))
    
    # Формула суммы всех расходов
    expense_cells = []
    if 'fixed' in total_rows:
        expense_cells.append(f"[.B{total_rows['fixed']}]")
    if 'variable' in total_rows:
        expense_cells.append(f"[.B{total_rows['variable']}]")
    if 'savings' in total_rows:
        expense_cells.append(f"[.B{total_rows['savings']}]")
    if 'dated' in total_rows:
        expense_cells.append(f"[.B{total_rows['dated']}]")
    
    if expense_cells:
        total_expenses_formula = f"of:={'+'.join(expense_cells)}"
        total_expenses_row.addElement(create_cell("", formula=total_expenses_formula, style=styles['total']))
    else:
        total_expenses_row.addElement(create_cell(0, value=0, style=styles['total'], value_type="float"))
    
    total_expenses_row.addElement(create_cell("", style=styles['total']))
    table.addElement(total_expenses_row)
    current_row += 1
    
    # Баланс (остаток)
    balance_row = TableRow()
    balance_row.addElement(create_cell("ОСТАТОК:", style=styles['total']))
    
    if 'income' in total_rows:
        balance_formula = f"of:=[.B{total_rows['income']}]-[.B{current_row}]"
        balance_row.addElement(create_cell("", formula=balance_formula, style=styles['total']))
    else:
        balance_row.addElement(create_cell(0, value=0, style=styles['total'], value_type="float"))
    
    balance_row.addElement(create_cell("", style=styles['total']))
    table.addElement(balance_row)
    
    # Добавление таблицы в документ
    doc.spreadsheet.addElement(table)
    
    return doc


def main():
    """Главная функция"""
    
    # Проверка аргументов командной строки
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    else:
        json_file = "/home/claude/budget_example.json"
    
    print(f"Чтение данных из: {json_file}")
    
    # Создание документа
    doc = create_budget_from_json(json_file)
    
    # Определение имени выходного файла
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        json_path = Path(json_file)
        output_name = json_path.stem + "_budget.ods"
        output_file = f"/mnt/user-data/outputs/{output_name}"
    
    # Сохранение документа
    doc.save(output_file)
    
    print(f"✓ Документ успешно создан: {output_file}")
    print("\nИспользование:")
    print(f"  python3 {sys.argv[0]} [путь_к_json] [выходной_файл.ods]")
    print("\nПример JSON структуры:")
    print("""
{
  "period": "Октябрь 2025",
  "currency": "₴",
  "incomes": [
    {"name": "Зарплата", "amount": 25000, "frequency": "Ежемесячно"}
  ],
  "fixed_expenses": [
    {"name": "Аренда", "amount": 8000, "frequency": "Ежемесячно"}
  ],
  "variable_expenses": [
    {"name": "Продукты", "amount": 6000, "frequency": "Ежемесячно"}
  ],
  "savings": [
    {"name": "Резервный фонд", "amount": 3000, "frequency": "Ежемесячно"}
  ],
  "dated_expenses": [
    {"name": "День рождения", "amount": 2000, "date": "2025-10-15"},
    {"name": "Страховка авто", "amount": 5000, "date": "2025-10-20"}
  ]
}
    """)


if __name__ == "__main__":
    main()

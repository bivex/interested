using System;
using System.Drawing;
using System.Globalization;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Threading;

namespace TopMostClock
{
    public partial class MainWindow : Window
    {
        private DispatcherTimer? timer;
        private DispatcherTimer? breakTimer;
        private NotifyIcon? trayIcon;
        private DateTime nextBreakTime;
        private bool isBreakTimeSet = false;

        public MainWindow()
        {
            InitializeComponent();
            LoadPosition();
            InitializeTimer();
            InitializeBreakTimer();
            InitializeTrayIcon();
            UpdateDateTime();
            
            // Проверяем, что элемент существует
            if (BreakTimerTextBlock != null)
            {
                SetNextBreakTime();
            }
            else
            {
                this.Title = "Desktop Clock - Ошибка: BreakTimerTextBlock не найден";
            }
        }

        private void InitializeTimer()
        {
            timer = new DispatcherTimer();
            timer.Interval = TimeSpan.FromSeconds(1);
            timer.Tick += Timer_Tick;
            timer.Start();
        }

        private void InitializeBreakTimer()
        {
            breakTimer = new DispatcherTimer();
            breakTimer.Interval = TimeSpan.FromSeconds(1);
            breakTimer.Tick += BreakTimer_Tick;
            breakTimer.Start();
        }

        private void InitializeTrayIcon()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.Text = "TopMost Clock";
            trayIcon.Visible = true;

            // Создаем контекстное меню
            var contextMenu = new ContextMenuStrip();
            contextMenu.Items.Add("Показать", null, ShowWindow_Click);
            contextMenu.Items.Add("Скрыть", null, HideWindow_Click);
            contextMenu.Items.Add("-"); // Разделитель
            contextMenu.Items.Add("Установить перекур", null, SetBreakTime_Click);
            contextMenu.Items.Add("Сбросить перекур", null, ResetBreakTime_Click);
            contextMenu.Items.Add("-"); // Разделитель
            contextMenu.Items.Add("Выход", null, Exit_Click);

            trayIcon.ContextMenuStrip = contextMenu;
            trayIcon.DoubleClick += TrayIcon_DoubleClick;
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            UpdateDateTime();
        }

        private void UpdateDateTime()
        {
            DateTime now = DateTime.Now;
            
            // Обновляем время
            TimeTextBlock.Text = now.ToString("HH:mm:ss");
            
            // Обновляем дату (на русском языке)
            CultureInfo russianCulture = new CultureInfo("ru-RU");
            DateTextBlock.Text = now.ToString("d MMMM yyyy", russianCulture);
        }

        private void BreakTimer_Tick(object? sender, EventArgs e)
        {
            if (isBreakTimeSet)
            {
                DateTime now = DateTime.Now;
                TimeSpan timeUntilBreak = nextBreakTime - now;

                // Отладочная информация в заголовке
                this.Title = $"Desktop Clock - Перекур через {timeUntilBreak.Hours:D2}:{timeUntilBreak.Minutes:D2} (Tick)";

                if (timeUntilBreak.TotalSeconds <= 0)
                {
                    // Время перекура!
                    ShowBreakNotification();
                    SetNextBreakTime(); // Устанавливаем следующий перекур
                    // Обновляем отображение после установки нового времени
                    UpdateBreakTimerDisplay();
                }
                else
                {
                    // Обновляем отображение времени до перекура
                    UpdateBreakTimerDisplay();
                }
            }
        }

        private void UpdateBreakTimerDisplay()
        {
            try
            {
                // Принудительно обновляем UI в главном потоке
                this.Dispatcher.Invoke(() =>
                {
                    if (BreakTimerTextBlock == null)
                    {
                        this.Title = "Desktop Clock - Ошибка: BreakTimerTextBlock не найден";
                        return;
                    }

                    if (isBreakTimeSet)
                    {
                        DateTime now = DateTime.Now;
                        TimeSpan timeUntilBreak = nextBreakTime - now;
                        
                        if (timeUntilBreak.TotalSeconds > 0)
                        {
                            string displayText = $"{timeUntilBreak.Hours:D2}:{timeUntilBreak.Minutes:D2}";
                            BreakTimerTextBlock.Text = displayText;
                            
                            // Отладочная информация в заголовке окна
                            this.Title = $"Desktop Clock - Перекур через {displayText}";
                        }
                        else
                        {
                            BreakTimerTextBlock.Text = "00:00";
                            this.Title = "Desktop Clock - Время перекура!";
                        }
                    }
                    else
                    {
                        BreakTimerTextBlock.Text = "--:--";
                        this.Title = "Desktop Clock";
                    }
                });
            }
            catch (Exception ex)
            {
                // Если что-то пошло не так, показываем в заголовке
                this.Title = $"Desktop Clock - Ошибка: {ex.Message}";
            }
        }

        private void SetNextBreakTime()
        {
            // Устанавливаем перекур через 2 часа от текущего времени
            nextBreakTime = DateTime.Now.AddHours(2);
            isBreakTimeSet = true;
            
            // Отладочная информация
            this.Title = $"Desktop Clock - Перекур установлен на {nextBreakTime:HH:mm}";
            
            UpdateBreakTimerDisplay(); // Обновляем отображение сразу
        }

        private void ShowBreakNotification()
        {
            // Показываем уведомление в трее
            if (trayIcon != null)
            {
                trayIcon.ShowBalloonTip(5000, "Время перекура!", "Пора сделать перерыв! ☕", ToolTipIcon.Info);
            }

            // Делаем окно более заметным
            this.WindowState = WindowState.Normal;
            this.Show();
            this.Activate();
        }

        // Перетаскивание окна
        private void Border_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ButtonState == MouseButtonState.Pressed)
            {
                this.DragMove();
            }
        }

        // Обработчики событий трея
        private void ShowWindow_Click(object? sender, EventArgs e)
        {
            this.Show();
            this.WindowState = WindowState.Normal;
        }

        private void HideWindow_Click(object? sender, EventArgs e)
        {
            this.Hide();
        }

        private void Exit_Click(object? sender, EventArgs e)
        {
            trayIcon?.Dispose();
            timer?.Stop();
            System.Windows.Application.Current.Shutdown();
        }

        private void TrayIcon_DoubleClick(object? sender, EventArgs e)
        {
            if (this.IsVisible)
            {
                this.Hide();
            }
            else
            {
                this.Show();
                this.WindowState = WindowState.Normal;
            }
        }

        private void SetBreakTime_Click(object? sender, EventArgs e)
        {
            // Устанавливаем перекур через 2 часа
            SetNextBreakTime();
            if (trayIcon != null)
            {
                trayIcon.ShowBalloonTip(3000, "Перекур установлен", $"Следующий перекур в {nextBreakTime:HH:mm}", ToolTipIcon.Info);
            }
        }

        private void ResetBreakTime_Click(object? sender, EventArgs e)
        {
            // Сбрасываем таймер перекура
            isBreakTimeSet = false;
            UpdateBreakTimerDisplay(); // Обновляем отображение
            if (trayIcon != null)
            {
                trayIcon.ShowBalloonTip(3000, "Перекур сброшен", "Таймер перекура отключен", ToolTipIcon.Info);
            }
        }

        private void LoadPosition()
        {
            // Загрузка сохраненной позиции из настроек
            this.Left = Settings.Instance.WindowLeft;
            this.Top = Settings.Instance.WindowTop;
        }

        private void SavePosition()
        {
            // Сохранение позиции
            Settings.Instance.WindowLeft = this.Left;
            Settings.Instance.WindowTop = this.Top;
        }

        protected override void OnClosed(EventArgs e)
        {
            SavePosition();
            trayIcon?.Dispose();
            timer?.Stop();
            breakTimer?.Stop();
            base.OnClosed(e);
        }
    }
} 

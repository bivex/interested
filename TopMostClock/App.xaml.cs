using System.Windows;

namespace TopMostClock
{
    public partial class App : System.Windows.Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            // Создаем и показываем главное окно
            MainWindow mainWindow = new MainWindow();
            mainWindow.Show();
        }
    }
} 

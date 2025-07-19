using System.Configuration;

namespace TopMostClock
{
    public class Settings
    {
        private static Settings? _instance;
        private static readonly object _lock = new object();

        public static Settings Instance
        {
            get
            {
                if (_instance == null)
                {
                    lock (_lock)
                    {
                        _instance ??= new Settings();
                    }
                }
                return _instance;
            }
        }

        public double WindowLeft
        {
            get => GetSetting("WindowLeft", 100.0);
            set => SetSetting("WindowLeft", value);
        }

        public double WindowTop
        {
            get => GetSetting("WindowTop", 100.0);
            set => SetSetting("WindowTop", value);
        }

        private double GetSetting(string key, double defaultValue)
        {
            try
            {
                string? value = ConfigurationManager.AppSettings[key];
                return value != null && double.TryParse(value, out double result) ? result : defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private void SetSetting(string key, double value)
        {
            try
            {
                Configuration config = ConfigurationManager.OpenExeConfiguration(ConfigurationUserLevel.None);
                config.AppSettings.Settings.Remove(key);
                config.AppSettings.Settings.Add(key, value.ToString());
                config.Save(ConfigurationSaveMode.Modified);
                ConfigurationManager.RefreshSection("appSettings");
            }
            catch
            {
                // Игнорируем ошибки сохранения настроек
            }
        }
    }
} 

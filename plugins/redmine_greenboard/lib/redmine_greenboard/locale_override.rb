module RedmineGreenboard
  # Wording overrides (e.g. "チケット" -> "課題") must load after every other
  # plugin's locales, so they are appended once all plugins are initialised.
  class LocaleOverride < Redmine::Hook::Listener
    FILES = Dir.glob(File.expand_path('../../config/locales_override/*.yml', __dir__))

    def after_plugins_loaded(_context = {})
      Rails.application.config.i18n.load_path += FILES
      ::I18n.load_path += FILES
      ::I18n.reload!
    end
  end
end

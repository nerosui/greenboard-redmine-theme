module RedmineGreenboard
  # The default queries ("担当しているチケット", "My bookmarks" etc.) are stored in the DB
  # with the wording that was current when the default data was loaded, so the locale
  # override cannot reach them. Display those exact legacy names with the current translation.
  module QueryNamePatch
    LEGACY_NAMES = {
      'ウォッチしているチケット' => :label_watched_issues,
      '報告したチケット' => :label_reported_issues,
      '担当しているチケット' => :label_assigned_to_me_issues,
      '更新したチケット' => :label_updated_issues,
      'My bookmarks' => :label_my_bookmarks
    }.freeze

    def name
      value = super
      key = LEGACY_NAMES[value]
      key ? ::I18n.t(key) : value
    end
  end
end

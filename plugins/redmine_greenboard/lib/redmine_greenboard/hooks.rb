module RedmineGreenboard
  class Hooks < Redmine::Hook::ViewListener
    render_on :view_projects_show_left, partial: 'greenboard/project_activity'
    render_on :view_projects_show_right, partial: 'greenboard/project_summary'

    # Small JSON payload for the theme JS (status / tracker names, timeline wording),
    # so client-side decorations never hard-code ids or Japanese copy.
    def view_layouts_base_html_head(_context = {})
      data = {
        statuses: IssueStatus.sorted.map { |s| { id: s.id, name: s.name, closed: s.is_closed? } },
        trackers: Tracker.sorted.map { |t| { id: t.id, name: t.name } },
        # project name -> identifier, for issue keys (DEMO-21) on cross-project pages
        projects: gb_visible_projects,
        actions: ViewHelper::GB_ACTION_KEYS.transform_values { |k| ::I18n.t(k) },
        noauthor: ViewHelper::GB_TYPE_LABELS.transform_values { |k| ::I18n.t(:gb_act_noauthor, type: ::I18n.t(k)) },
        text: {
          other: ::I18n.t(:gb_act_other), today: ::I18n.t(:label_today), yesterday: ::I18n.t(:label_yesterday),
          total: ::I18n.t(:gb_total_time), show_all: ::I18n.t(:gb_show_all), show_less: ::I18n.t(:gb_show_less),
          see_all: ::I18n.t(:gb_see_all), see_all_count: ::I18n.t(:gb_see_all_count), add_block: ::I18n.t(:gb_add_block), anonymous: ::I18n.t(:label_user_anonymous),
          days_left: ::I18n.t(:gb_days_left), hours_total: ::I18n.t(:gb_hours_total),
          log_time_title: ::I18n.t(:gb_log_time_title), edit_time_title: ::I18n.t(:gb_edit_time_title),
          issue_search_placeholder: ::I18n.t(:gb_issue_search_placeholder), hours_unit: ::I18n.t(:gb_hours_unit),
          roadmap_filtered: ::I18n.t(:gb_roadmap_filtered), roadmap_all_trackers: ::I18n.t(:gb_roadmap_all_trackers),
          roadmap_tracker_heading: ::I18n.t(:gb_roadmap_tracker_heading),
          activity_period: ::I18n.t(:gb_activity_period), show_more: ::I18n.t(:gb_show_more),
          heading_anchor: ::I18n.t(:gb_heading_anchor), actions: ::I18n.t(:button_actions),
          edit_document: ::I18n.t(:gb_edit_document), empty_body: ::I18n.t(:gb_empty_body),
          cal_more: ::I18n.t(:gb_cal_more), cancel: ::I18n.t(:button_cancel),
          report_add: ::I18n.t(:gb_report_add), all_users: ::I18n.t(:gb_all_users),
          year_option: ::I18n.t(:gb_year_option), period_from: ::I18n.t(:gb_period_from),
          # label_version is overridden to マイルストーン; software / page versions still say バージョン
          version_label: ::I18n.t(:field_version), milestone_label: ::I18n.t(:label_version)
        }
      }
      json = ERB::Util.json_escape(data.to_json)
      %(<script type="application/json" id="gb-data">#{json}</script>).html_safe
    rescue StandardError => e
      Rails.logger.warn("[greenboard] gb-data: #{e.message}")
      ''
    end

    private

    def gb_visible_projects
      return [] unless User.current.logged?

      Project.visible.limit(500).pluck(:name, :identifier).map { |n, i| { name: n, identifier: i } }
    rescue StandardError
      []
    end
  end
end

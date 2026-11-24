module RedmineGreenboard
  # Small view helpers shared by the Greenboard partials (dashboard blocks,
  # project home hooks). Mirrors GB.avatarIndex / GB.initial in the theme JS so
  # that the same user gets the same colour on server- and client-rendered avatars.
  module ViewHelper
    GB_ACTION_KEYS = {
      'issue' => :gb_act_issue_add, 'issue-closed' => :gb_act_issue_close,
      'issue-edit' => :gb_act_issue_edit, 'issue-note' => :gb_act_issue_comment,
      'wiki-page' => :gb_act_wiki, 'news' => :gb_act_news, 'document' => :gb_act_document,
      'attachment' => :gb_act_file, 'changeset' => :gb_act_changeset, 'message' => :gb_act_message,
      'reply' => :gb_act_message, 'time-entry' => :gb_act_time, 'project' => :gb_act_project
    }.freeze

    GB_TYPE_LABELS = {
      'document' => :label_document, 'attachment' => :label_attachment, 'news' => :label_news,
      'wiki-page' => :label_wiki_page, 'message' => :label_message, 'reply' => :label_message,
      'changeset' => :label_revision, 'issue' => :label_issue, 'issue-closed' => :label_issue,
      'issue-edit' => :label_issue, 'issue-note' => :label_issue, 'time-entry' => :label_spent_time,
      'project' => :label_project
    }.freeze

    GB_TYPE_ICONS = {
      'document' => 'document', 'attachment' => 'attachment', 'news' => 'news', 'wiki-page' => 'wiki-page',
      'message' => 'message', 'reply' => 'message', 'changeset' => 'changeset', 'time-entry' => 'time',
      'project' => 'projects'
    }.freeze

    # Wording for events without an author (e.g. documents): "文書が追加されました".
    def gb_event_action_without_author(event)
      type = gb_event_type(event)
      l(:gb_act_noauthor, type: l(GB_TYPE_LABELS[type] || :label_activity))
    end

    # Round badge with the module icon, used in place of an avatar when there is no author.
    def gb_event_type_avatar(event, size = 28)
      icon = GB_TYPE_ICONS[gb_event_type(event)] || 'issue'
      content_tag(:span, sprite_icon(icon), class: "gb-avatar gb-avatar--#{size} gb-avatar--type", 'aria-hidden' => 'true')
    end

    def gb_avatar_index(name)
      name.to_s.encode('UTF-16LE').unpack('v*').sum % 8
    rescue StandardError
      0
    end

    def gb_initial(name)
      first = name.to_s.strip.grapheme_clusters.first
      first ? first.upcase : '?'
    end

    # <span class="gb-avatar gb-avatar--28" data-av="3" aria-hidden="true">X</span>
    def gb_avatar(user, size = 28)
      name = user.respond_to?(:name) ? user.name.to_s : user.to_s
      anonymous = user.nil? || (user.respond_to?(:anonymous?) && user.anonymous?) || name.blank?
      if anonymous
        content_tag(:span, '?', class: "gb-avatar gb-avatar--#{size} gb-avatar--anon", 'aria-hidden' => 'true')
      else
        content_tag(:span, gb_initial(name), class: "gb-avatar gb-avatar--#{size}",
                                              data: { av: gb_avatar_index(name) }, 'aria-hidden' => 'true')
      end
    end

    # Rounded-square project initial avatar, deterministic colour.
    def gb_project_avatar(project, size = 36)
      content_tag(:span, gb_initial(project.name), class: "gb-proj-avatar gb-proj-avatar--#{size}",
                                                    data: { av: gb_avatar_index(project.name) }, 'aria-hidden' => 'true')
    end

    # Plain-text excerpt: drops the most common Markdown / Textile markers.
    def gb_plain_excerpt(text, length = 160)
      t = text.to_s.dup
      t.gsub!(/```.*?```/m, ' ')
      t.gsub!(/<[^>]+>/, ' ')
      t.gsub!(/^\s{0,3}(?:[#>]+|[-*+]\s|\d+\.\s|h\d\.\s|bq\.\s)/, '')
      t.gsub!(/(\*\*|__|~~|`)/, '')
      t.gsub!(/\[([^\]]+)\]\([^)]+\)/, '\\1')
      truncate(t.squish, length: length)
    end

    def gb_event_type(event)
      event.event_type.to_s.split(' ').first.to_s
    end

    def gb_event_action(event)
      l(GB_ACTION_KEYS[gb_event_type(event)] || :gb_act_other)
    end

    # The issue an activity event is about (issue, journal, time entry), or nil.
    def gb_event_issue(event)
      case event
      when Issue then event
      when Journal then event.journalized.is_a?(Issue) ? event.journalized : nil
      when TimeEntry then event.issue
      end
    rescue StandardError
      nil
    end

    # Backlog-style issue key "DEMO-21" (same format as GB.il.issueKey in the theme JS).
    def gb_issue_key(issue)
      ident = issue.project&.identifier.to_s
      ident.empty? ? "##{issue.id}" : "#{ident.upcase}-#{issue.id}"
    end

    def gb_tracker_badge(tracker)
      return ''.html_safe unless tracker

      content_tag(:span, tracker.name, class: "gb-tracker gb-tracker-#{tracker.id}")
    end

    def gb_status_pill(status)
      return ''.html_safe unless status

      content_tag(:span, status.name, class: "gb-status gb-status-#{status.id}")
    end

    # "ステータス: 未対応 → 処理中" for journals that changed the status.
    def gb_journal_status_change(event)
      return nil unless event.is_a?(Journal)

      detail = event.details.detect { |d| d.property == 'attr' && d.prop_key == 'status_id' }
      return nil unless detail

      from = IssueStatus.find_by(id: detail.old_value)
      to = IssueStatus.find_by(id: detail.value)
      return nil unless to

      [from, to]
    rescue StandardError
      nil
    end

    # Timeline day heading (DESIGN §6.5): 「今日」 / 「昨日」 / 「YYYY/MM/DD」.
    def gb_event_day_label(date)
      today = User.current.today
      if date == today
        l(:label_today)
      elsif date == today - 1
        l(:label_yesterday)
      else
        date.strftime('%Y/%m/%d')
      end
    end

    # Timeline time column (DESIGN §6.5): absolute clock time 「HH:MM」 (24h) in the user's time zone.
    def gb_event_clock(event)
      gb_user_time(event.event_datetime).strftime('%H:%M')
    end

    # Full date-time for the <time> title: 「YYYY/MM/DD HH:MM」.
    def gb_event_clock_title(event)
      gb_user_time(event.event_datetime).strftime('%Y/%m/%d %H:%M')
    end

    def gb_user_time(time)
      User.current.convert_time_to_user_timezone(time)
    rescue StandardError
      time.localtime
    end

    def gb_event_date(event)
      User.current.time_to_date(event.event_datetime)
    rescue StandardError
      event.event_datetime.to_date
    end
  end

  # Timeline data for core's activity lists (/activity, /projects/:id/activity, /users/:id), which the theme
  # (15-c-timeline.js) rewrites into the .gb-timeline DOM of _timeline.html.erb. Core's markup only knows a
  # journal's new status, so the old one is sent from here: { journal id => [old status id, new status id] }.
  # `days` lists the day headings in core's order (newest first) as ISO dates, for 今日 / 昨日 / YYYY/MM/DD.
  # `times` gives, per day (same order as `days`), each event's epoch milliseconds in core's row order
  # (ActivitiesHelper#sort_activity_events groups rows by issue), so the theme can list a day newest first
  # like the dashboard / project home timeline (ACCEPTANCE L3) with second precision.
  class TimelineHooks < Redmine::Hook::ViewListener
    # Core's row order within a day: newest group first, each group's events newest first.
    def self.core_row_order(events)
      by_group = events.group_by(&:event_group)
      rows = []
      events.sort_by(&:event_datetime).reverse_each do |event|
        group = by_group.delete(event.event_group)
        rows.concat(group.sort_by(&:event_datetime).reverse) if group
      end
      rows
    end

    def view_layouts_base_body_bottom(context = {})
      controller = context[:controller]
      events_by_day = controller&.instance_variable_get(:@events_by_day)
      return '' unless events_by_day.is_a?(Hash) && events_by_day.any?

      statuses = {}
      events_by_day.each_value do |events|
        events.each do |e|
          next unless e.is_a?(Journal)

          detail = e.details.detect { |d| d.property == 'attr' && d.prop_key == 'status_id' }
          statuses[e.id] = [detail.old_value.presence&.to_i, detail.value.presence&.to_i] if detail
        end
      end
      today = User.current.today
      day_keys = events_by_day.keys.sort.reverse
      times = day_keys.map do |day|
        self.class.core_row_order(events_by_day[day]).map { |e| (e.event_datetime.to_f * 1000).round }
      end
      data = {
        today: today.iso8601, yesterday: (today - 1).iso8601,
        days: day_keys.map(&:iso8601), times: times, status: statuses
      }
      json = ERB::Util.json_escape(data.to_json)
      %(<script type="application/json" id="gb-timeline-data">#{json}</script>).html_safe
    rescue StandardError => e
      Rails.logger.warn("[greenboard] gb-timeline-data: #{e.message}")
      ''
    end
  end
end

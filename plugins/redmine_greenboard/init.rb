require File.expand_path('lib/redmine_greenboard/my_page_patch', __dir__)
require File.expand_path('lib/redmine_greenboard/view_helper', __dir__)
require File.expand_path('lib/redmine_greenboard/hooks', __dir__)
require File.expand_path('lib/redmine_greenboard/locale_override', __dir__)
require File.expand_path('lib/redmine_greenboard/query_name_patch', __dir__)
require File.expand_path('lib/redmine_greenboard/gantt_patch', __dir__)

Redmine::Plugin.register :redmine_greenboard do
  name 'Greenboard'
  author 'nerosui'
  description 'Greenboard テーマ用のダッシュボードブロックと既定値を提供します。'
  version '0.2.0'
  requires_redmine version_or_higher: '6.0'
end

Redmine::MyPage.singleton_class.prepend(RedmineGreenboard::MyPagePatch)

Query.prepend(RedmineGreenboard::QueryNamePatch) unless Query <= RedmineGreenboard::QueryNamePatch

unless Redmine::Helpers::Gantt <= RedmineGreenboard::GanttPatch
  Redmine::Helpers::Gantt.prepend(RedmineGreenboard::GanttPatch)
end

ActiveSupport.on_load(:action_view) do
  include RedmineGreenboard::ViewHelper
end

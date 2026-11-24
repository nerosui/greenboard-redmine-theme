module RedmineGreenboard
  # Gantt version label: core rounds the progress (28.5 -> 29%) while the project home, roadmap and version
  # page show it floored (28%). Same label as core otherwise, with the percentage floored (DESIGN §6.8).
  module GanttPatch
    def line_for_version(version, options)
      # Skip versions that don't have a start_date
      if version.is_a?(Version) && version.due_date && version.start_date
        label = "#{h(version)} #{h(version.visible_fixed_issues.completed_percent.to_f.floor)}%"
        label = h("#{version.project} -") + label unless @project && @project == version.project
        line(version.start_date, version.due_date,
             version.visible_fixed_issues.completed_percent,
             true, label, options, version)
      end
    end
  end
end

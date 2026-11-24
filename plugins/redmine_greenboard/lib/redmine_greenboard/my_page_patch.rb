module RedmineGreenboard
  # Default dashboard layout for users who have not customised their page yet.
  module MyPagePatch
    def default_layout
      {
        'top' => ['gb_projects'],
        'left' => ['issuesassignedtome', 'issueswatched'],
        'right' => ['gb_updates']
      }
    end
  end
end

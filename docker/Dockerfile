# Redmine 6 + Greenboard theme + redmine_greenboard plugin + redmine_issues_panel (board)
# Build from the repository root:  docker compose -f docker/compose.example.yaml up -d --build
FROM redmine:6

ARG ISSUES_PANEL_VERSION=v1.2.2

# Kanban board: https://github.com/redmica/redmine_issues_panel
RUN git clone --depth 1 --branch "${ISSUES_PANEL_VERSION}" \
      https://github.com/redmica/redmine_issues_panel.git plugins/redmine_issues_panel \
 && rm -rf plugins/redmine_issues_panel/.git \
 && chown -R redmine:redmine plugins/redmine_issues_panel

COPY --chown=redmine:redmine themes/greenboard themes/greenboard
COPY --chown=redmine:redmine plugins/redmine_greenboard plugins/redmine_greenboard

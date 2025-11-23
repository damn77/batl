## Tournament view
Main tournament view page that should be consistent for all users
Displays all information related to specific tournament

### Core parts
- General data
- Rules
- Player list
- Format display

### General data
- Displays all general tournament info

### Rules
    - hidden by default and opens as popup modal
    - rule complexity icon
        - DEFAULT - rules are defined only on tournament level
        - MODIFIED - rule change was defined on group or round level
        - SPECIFIC - rule change was configured on specific match
        - DEFAULT < MODIFIED < SPECIFIC

### Player list
- shows list of players registered to tournament
- can show waitlisted players
    - hidden by default
- player general data
    - name
    - ranking
    - seed
    - status
        - registered
        - waitlisted
        - active
        - eliminated
        - winner
- player format specific data (only visible what is applicable)
    - groups
        - group name
        - position
    - knockout
        - round
        - bracket (main competition, consolation, numeric identifier)
    - combined
        - both groups and knockout data
    - swiss
        - placement after last fully finished round

### Format display
- graphical display tournament structure and matches
- groups are displayed as tables
- brackets are tree-like diagrams
- each group and bracket need to be minimizable
    - all are minimized by default

### Research
Research libraries
    - https://github.com/Drarig29/brackets-manager.js/
    - https://github.com/Drarig29/brackets-viewer.js
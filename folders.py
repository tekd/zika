.gitignore
# hopefully we will have public in ignore list

package.json
# npm package for styleguide PRECOMPILED SASS files
# Styleguide Updates to be done via `npm update`

source/
  vendor/
    styleguide/   # styleguide precompiled SASS, JS and Image files
      images/**
      components/**
      foundation.min.css
      jquery-2.1.4.min.js
      slick.css
      slick.js
  
  static/
    images/       # site specific images
    scripts.js    # site specific js

  templates/      
    _base.html    # boilerplate base. Base setup for a styleguide enabled site. Can be tweaked for each project.
    index.html    # index example. Will be tweaked for the project needs
                  # temp vinyl files whould not be saved here, or at least kept in .gitignore
  data/
    global.yaml     # global data file, available anywhere in the system using {{global.variable}}
    pages/        # any file.yaml in this folder, will be conpiled into a pages.yaml(json) file for generatePages()

  sass/           # site specific styles. Specific components, tweaks or new reusable components are added here.
    styles.scss   # @import ../vendor/styleguide/* and _custom.scss
    _custom.scss

gulpfile.js
# simple tasks - copying files, minification, etc
# imports 'extra-tasks.js'

extra_tasks.js
# long file with the big generic tasks, like generatePages(), concatenate multiple yaml files into one single file, etc.
# Initial Extra Tasks
# 1- plug data.json into nunjucks tasks.
# 2- generatePages() - cleaned version of OGRX. Generate html files from yaml items
# 3- concatenateYaml() - generate one long yaml(JSON) file from multiple YAML files in a specific folder

# Markdown/Front-matter - will come in teh future
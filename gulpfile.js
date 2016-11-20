var del             = require('del'),
    gulp            = require('gulp'),
    yaml            = require('gulp-yaml'),
    File            = require('vinyl'),
    fs              = require('fs'),
    md5             = require('md5'),
    data            = require('gulp-data'),
    minimist        = require('minimist'),
    flatten         = require('gulp-flatten'),
    es              = require('event-stream'),
    plumber         = require('gulp-plumber'),
    intercept       = require('gulp-intercept'),
    sass            = require('gulp-sass'),
    shell           = require('gulp-shell'),
    uglify          = require('gulp-uglify'),
    ghPages         = require('gulp-gh-pages'),
    imagemin        = require('gulp-imagemin'),
    imageResize     = require('gulp-image-resize'),
    cache           = require('gulp-cache'),
    changed         = require('gulp-changed'),
    sourcemaps      = require('gulp-sourcemaps'),
    browserSync     = require('browser-sync'),
    runSequence     = require('run-sequence').use(gulp),
    contentful      = require('contentful'),
    nunjucksRender  = require('gulp-nunjucks-render');

// Clean Dist
gulp.task('clean', function () {
  return del(['public']);
});

// Browser Sync
gulp.task('browserSync', function () {
  browserSync({
    server: {
      baseDir: 'public'
    }
  });
});

// AUTO GENERATED PAGES
// set up nunjucks environment
function nunjucksEnv(env) {
  env.addFilter('slug', slugify);
  env.addFilter('dateFilter', dateFilter);
  // env.addFilter('split', split);
}

function dateFilter(date, arg) {
  var locale = "en-us";
  var date = new Date(date);
  switch (arg) {
    case "month":
      return date.toLocaleString(locale, { month: "long" });
      break;
    case "day":
      return date.getDate();
      break;
    case "year":
      return date.getFullYear();
      break;
  }
}

// converts string t to a slug (eg 'Some Text Here' becomes 'some-text-here')
function slugify(t) {
  return t ? t.toString().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '')
  : false ;
}

// get arguments from command line
var argv = minimist(process.argv.slice(2));

// command line options (usage: gulp --optionname)
var cliOptions = {
  diff      : false || argv.diff,
  verbose   : false || argv.verbose,
  nosync    : false || argv.nosync
};

// gulpfile options
var options = {
  path: './source/templates/', // base path to templates
  dataPath: './source/data/', // base path to datasets
  ext: '.html', // extension to use for templates
  dataExt: '.json', // extension to use for data
  manageEnv: nunjucksEnv, // function to manage nunjucks environment
  libraryPath: 'node_modules/govlab-styleguide/dist/', // path to installed sass/js library distro folder
  defaultData: './source/data/default.json', // default dataset to use if no automatically generated template is found
  hashLength: 7, // length to truncate hash for page urls
  slugLength: 128, // length to truncate title slug for page urls
  useId: // whitelist for data files to use an id hash in the url, all others will just be title slug
  [
  ]
};

// compile all the datasets into a composite set
// for injection into nunjucks using gulp-data
var generatedData = {};

function compileData(dataPath, ext) {
  ext = ext === undefined ? options.dataExt : ext;
  var dataDir = fs.readdirSync(dataPath),
  baseName, r, _data;

  // look for a data file matching the naming convention
  r = new RegExp('\\' + ext + '$');
  for (var dataset in dataDir) {
    if (r.test(dataDir[dataset])) {

      // trim basename
      baseName = dataDir[dataset].replace(new RegExp('\\' + ext + '$'), '');

      // add JSON to object
      _data = require(dataPath + dataDir[dataset]).data;
      generatedData[baseName] = _data;
    }
  }
}

// generate a stream of one or more vinyl files from a json data source
// containing the parent template specified by templatePath
// which can then be piped into nunjucks to create output with data scoped to the datum
function generateVinyl(basePath, dataPath, fSuffix, dSuffix) {
  var files = [], r, r2, f, baseTemplate, baseName, _data, fname,
  base = fs.readdirSync(basePath);

  // stupid code courtesy of node doesnt support default parameters as of v5
  fSuffix = fSuffix === undefined ? options.ext : fSuffix;
  dSuffix = dSuffix === undefined ? options.dataExt : dSuffix;

  // compile datasets
  compileData(dataPath, dSuffix);

  for (var template in base) {
    // match a filename starting with '__' and ending with the file suffix
    r = new RegExp('^__[^.]*\\' + fSuffix + '$');
    if (r.test(base[template])) {
      // read the file in as our base template
      baseTemplate = fs.readFileSync(basePath + base[template]);

      // strip __ and extension to get base naming convention
      baseName = base[template]
      .replace(/^__/, '')
      .replace(new RegExp('\\' + fSuffix + '$'), '')
      ;

      // look for a dataset matching the naming convention
      for (var dataset in generatedData) {
        if (dataset === baseName) {

          _data = generatedData[dataset];

          // create a new vinyl file for each datum in _data and push to files
          // using directory based on naming convention and base template as content
          for (var d in _data) {
            f = new File({
              path: _data[d].path,
              contents: baseTemplate
            });
            f.data = _data[d];
            files.push(f);
          }
        }
      }
    }
  }

  // convert files array to stream and return
  return require('stream').Readable({ objectMode: true }).wrap(es.readArray(files));
}

gulp.task('yaml', function () {
  return gulp.src('source/data/**/*.+(yaml|yml)')
  .pipe(yaml())
  .pipe(gulp.dest('source/data'));
});

gulp.task('json', ['yaml'], function() {
  return gulp.src('source/data/**/*.json')
    .pipe(intercept(function(file) {
      var o = JSON.parse(file.contents.toString()),
        b = {},
        p;
      // wrap json in a top level property 'data'
      if (!o.hasOwnProperty('data')) {
        b.data = o;
      } else {
        b = o;
      }
      // do some processing on the json
      for (var j in b.data) {
        if (!b.data[j].hasOwnProperty('id')) { // assign a unique id to each entry in data
          if (b.data[j].hasOwnProperty('title')) { // use title to create hash if exists,
            b.data[j].id = md5(b.data[j].title); // otherwise use first prop
          } else {
            b.data[j].id = md5(b.data[j][Object.keys(b.data[j])[0]]);
          }
        }
        // build paths / urls for files
        if (!b.data[j].hasOwnProperty('path')) {
          p = '';
          if (options.useId.indexOf(file.path.replace(/^.*\//g, '')) > -1) {
            if (b.data[j].hasOwnProperty('id')) {
              p += slugify(b.data[j].id).substring(0, options.hashLength) + '-';
            }
          }
          if (b.data[j].hasOwnProperty('title')) { // name file if title exists
            p += slugify(b.data[j].title).substring(0, options.slugLength) + options.ext;
          }
          b.data[j].path = p;
        }
      }
      if (cliOptions.verbose) {
        util.log(util.colors.magenta('Proccessing json, ' + file.path));
      }
      file.contents = new Buffer(JSON.stringify(b));
      return file;
    }))
    .pipe(gulp.dest('source/data'));
});

gulp.task('nunjucksGenerated', ['json'], function() {
  return generateVinyl(options.path, options.dataPath)
  .pipe(plumber())
  .pipe(data(function(file) {
    if (cliOptions.verbose) {
      util.log(util.colors.green(' Generated Template ' + file.path), ': using', JSON.stringify(file.data));
    }
    var d = file.data;
    // add all datasets as special prop $global
    d.$global = generatedData;
    return d;
  }))
  .pipe(nunjucksRender(options))
  .pipe(flatten())
  .pipe(gulp.dest('public'));
});

gulp.task('nunjucksData', ['json'], function() {
  return gulp.src('source/templates/**/*.html')
  .pipe(plumber())
  .pipe(data(function(file) {
    return generatedData;
  }))
  .pipe(nunjucksRender(options))
  .pipe(flatten())
  .pipe(gulp.dest('public'));
});

// END AUTO GEN PAGES

// CNAME
gulp.task('cname', function () {
  return gulp.src('source/templates/CNAME')
  .pipe(gulp.dest('public'));
});


// Sass
gulp.task('sass', function () {
  // Gets all files ending with .scss in source/sass
  return gulp.src('source/sass/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' })).on('error', sass.logError)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/styles'))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('scripts', function () {
  return gulp.src('source/scripts/**/*')
    .pipe(gulp.dest('public/scripts'));
});

gulp.task('image', ['imageResize'], function () {
  return gulp.src('source/static/images/**/*')
    .pipe(imagemin())
    .pipe(gulp.dest('public/images'));
});

gulp.task('imageResize', function () {
  gulp.src('source/static/images/topics/*')
    .pipe(changed('source/static/images/topics/resized/'))
    .pipe(imageResize({ width : 2000 }))
    .pipe(gulp.dest('source/static/images/topics/resized/'));
});

gulp.task('js', function () {
  return gulp.src('source/static/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('public'));
});

// Nunjucks
gulp.task('nunjucks', function () {
  nunjucksRender.nunjucks.configure(['source/templates/']);

  // Gets .html and .nunjucks files in pages
  return gulp.src('source/templates/**/[^_]*.html')
    // Renders template with nunjucks
    // .pipe(data(function(file) {
    //   return generatedData;
    // }))
    .pipe(nunjucksRender({ path: 'source/templates' }))
    // output files in app folder
    .pipe(gulp.dest('public'))
    .pipe(browserSync.reload({ stream: true }));
});


// CONTENTFUL 

function Topic(title) {
  this.name = title,
  this.children = []
}

function Expert(name,affiliationType,region){
  this.name = name,
  this.affiliationType = [],
  this.region = region
}

function Affiliation(name,size=0) {
  this.name = name,
  this.size = size
}

gulp.task('contentfulDataParticipants', function() {
   var client = contentful.createClient({
    space: 'hjsd2qx6wg06',
    accessToken: 'cbe5bb12f36d1cfbf5ef32373b9454bd57aa09f25d9f9a276aad065d06fd397f',
  });
   // get topics with nested participants. the 'includes' param is to resolve the nested attributes
  client.getEntries({'content_type':'topic',include: 10})
  .then(function (entries) {
    var dataset =[];
    entries.items.forEach(function (entry, index) {
      var topic;
      if(entry.fields.title) {
        topic = new Topic(entry.fields.title);
        var experts = entry.fields.experts;
         if (experts) {
          experts.forEach(function(exp,index) {
            expert = new Expert(exp.fields.name);
            var region = exp.fields.region;
              if (region) {
                 expert.region = region.fields.name;
              }
              var affiliationTypes = exp.fields.affiliationType;
              if (affiliationTypes) {
                  affiliationTypes.forEach(function(affiliation, index) {
                   expert.affiliationType.push(affiliation.fields.name);
                 });
              }
            topic.children.push(expert);
          });
         }
      dataset.push(topic);
      }
    });
    fs.writeFileSync('./source/data/contentfuldataparticipants.json', JSON.stringify(dataset)); 
  });
});


function contains(arr, obj) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === obj) {
            return true;
        }
    }
    return false;
}

function getIndex(arr, obj) {
  var match = arr.filter(function (element) { 
    return element.name === obj.name;
  });
  return arr.indexOf(match[0]);
}

gulp.task('contentfulDataFlare', function() {
   var client = contentful.createClient({
    space: 'hjsd2qx6wg06',
    accessToken: 'cbe5bb12f36d1cfbf5ef32373b9454bd57aa09f25d9f9a276aad065d06fd397f',
  });
   // get topics with nested participants. the 'includes' param is to resolve the nested attributes
  client.getEntries({'content_type':'topic',include: 10})
  .then(function (entries) {
    var dataset =[];
    entries.items.forEach(function (entry, index) {
      var topic;
      if(entry.fields.title) {
        topic = new Topic(entry.fields.title);
        var experts = entry.fields.experts;
        if (experts) {
          experts.forEach(function(expert,index) {
            if (expert.fields.affiliationType) {
              expert.fields.affiliationType.forEach(function(affiliation,index) {
                var idx = getIndex(topic.children, affiliation.fields);
                if (idx == -1) {
                  topic.children.push({name:affiliation.fields.name,size: 100});

                } else {
                  topic.children[idx].size+=100
                }
              });
            }
          });
        }

      dataset.push(topic);
      }
    });
    var flare = {name:"flare", children:[]}
    flare.children = dataset
    fs.writeFileSync('./source/data/contentfuldataflare.json', JSON.stringify(flare)); 
  });
});



gulp.task('push-gh-master', shell.task(['git push origin master']));

gulp.task('push-gh-pages', function () {
  return gulp.src('public/**/*')
    .pipe(ghPages({ force: true }));
});

gulp.task('deploy', function (callback) {
  runSequence(
    'clean',
    ['sass', 'js', 'image', 'cname', 'nunjucksGenerated', 'nunjucksData', 'scripts'],
    'push-gh-master',
    'push-gh-pages',
    callback
  );
});

gulp.task('html-watch', ['nunjucksData', 'nunjucksGenerated'], function() {
  browserSync.reload();
});

gulp.task('watch', function () {
  gulp.watch('source/static/**/*.js', ['js']);
  gulp.watch('source/sass/**/*.scss', ['sass']);
  gulp.watch('source/templates/**/*.html', ['html-watch']);
  gulp.watch('source/static/scripts/**/*.js', ['scripts']);
  gulp.watch('source/static/vendorimages/**/*', ['images']);
});

gulp.task('default', function (callback) {
  runSequence(
    'clean',
    ['sass', 'js', 'image', 'cname', 'nunjucksGenerated', 'nunjucksData', 'scripts'],
    ['browserSync', 'watch'],
    callback
  );
});

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    _s = require('underscore.string'),
    moment = require('moment'),
    marked = require('marked'),
    validator = require('validator'),
    extend = require('extend'),
    raneto = require('raneto-core'),
    config = require('./config'),
    app = express();

// Setup views
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('view engine', 'html');
app.enable('view cache');
app.engine('html', require('hogan-express'));

// Setup Express
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Setup config
extend(raneto.config, config);

// Auth
var auth = require('http-auth');

var basic = auth.basic({
    realm: "Web."
}, function(username, password, callback) { // Custom authentication method.
    callback(username === "admin" && password === "hodor");
});

// Edit All Articles
app.get("/master", auth.connect(basic), function(req, res, next) {

    var slug = req.params[0];
    slug = '/index';

    var pageList = raneto.getPages(slug),
        filePath = path.normalize(raneto.config.content_dir + slug);

    res.render("master", {
        config: config,
        pages: pageList,
        body_class: 'page-home'
    });

});

// Add New Article
app.get("/new-kb", auth.connect(basic), function(req, res, next) {

    res.render("newkb", {
        layout: false
    });
});

// Edot New Article
app.get("/edit-kb", auth.connect(basic), function(req, res, next) {

    // open md file
    // slug = "install/nenennen.md"
    slug = req.query.id;
    filePath = path.normalize(raneto.config.content_dir + slug);

    // get category
    cate = req.query.id;
    cate = cate.split("/");
    category = "";
    filename = "";

    if (cate[0].indexOf(".md") != -1) {
        category = "index";
        filename = slug;
    } else {
        category = cate[0];
        filename = slug.replace(cate[0], "");
        filename = filename.replace("/", "");
    }

    fs.readFile(filePath, 'utf8', function(err, content) {
        // File info
        var stat = fs.lstatSync(filePath);
        // Meta
        var meta = raneto.processMeta(content);
        content = raneto.stripMeta(content);
        if (!meta.title) meta.title = raneto.slugToTitle(filePath);
        // Content
        content = raneto.processVars(content);
        var html = marked(content);

        var sort = meta.sort;

        return res.render('editkb', {
            category: category,
            meta: meta,
            content: content,
            filename: filename,
            sort: sort,
            body_class: 'page-' + raneto.cleanString(slug),
            last_modified: moment(stat.mtime).format('Do MMM YYYY'),
            layout: false
        });
    });

});


// create new KB article
app.post("/savenewkb", function(req, res, next) {

    var documentBody = "/* \n";
    documentBody += "Title: " + req.body.title + " \n";
    documentBody += "Description: " + req.body.desc + " \n";

    if (req.body.sort != "-") {
        documentBody += "Sort: " + req.body.sort + " \n";
    }

    documentBody += "*/ \n";
    documentBody += "" + req.body.markdown;

    // delete old file
    if (req.body.old_filename != "") {
        if (req.body.old_category == "index") {
            fs.unlinkSync('content/' + req.body.old_filename);
        } else {
            fs.unlinkSync('content/' + req.body.old_category + '/' + req.body.old_filename);
        }
    }

    fs = require('fs');
    $newFilePath = "";

    if (req.body.category == "index") {
        $newFilePath = 'content/' + req.body.filename;
    } else {
        $newFilePath = 'content/' + req.body.category + '/' + req.body.filename;
    }

    fs.writeFile($newFilePath, documentBody, function(err) {
        if (err) return console.log(err);
    });

    res.redirect('/master');
});

// Handle all requests
app.all('*', function(req, res, next) {
    if (req.query.search) {
        var searchQuery = validator.toString(validator.escape(_s.stripTags(req.query.search))).trim(),
            searchResults = raneto.doSearch(searchQuery),
            pageListSearch = raneto.getPages('');

        return res.render('search', {
            config: config,
            pages: pageListSearch,
            search: searchQuery,
            searchResults: searchResults,
            body_class: 'page-search'
        });
    } else if (req.params[0]) {
        var slug = req.params[0];
        if (slug == '/') slug = '/index';

        var pageList = raneto.getPages(slug),
            filePath = path.normalize(raneto.config.content_dir + slug);
        if (!fs.existsSync(filePath)) filePath += '.md';

        if (slug == '/index' && !fs.existsSync(filePath)) {
            return res.render('home', {
                config: config,
                pages: pageList,
                body_class: 'page-home'
            });
        } else {
            fs.readFile(filePath, 'utf8', function(err, content) {
                if (err) {
                    err.status = '404';
                    err.message = 'Whoops. Looks like this page doesn\'t exist.';
                    return next(err);
                }

                // Process Markdown files
                if (path.extname(filePath) == '.md') {
                    // File info
                    var stat = fs.lstatSync(filePath);
                    // Meta
                    var meta = raneto.processMeta(content);
                    content = raneto.stripMeta(content);
                    if (!meta.title) meta.title = raneto.slugToTitle(filePath);
                    // Content
                    content = raneto.processVars(content);
                    var html = marked(content);

                    return res.render('page', {
                        config: config,
                        pages: pageList,
                        meta: meta,
                        content: html,
                        body_class: 'page-' + raneto.cleanString(slug),
                        last_modified: moment(stat.mtime).format('Do MMM YYYY')
                    });
                } else {
                    // Serve static file
                    res.sendfile(filePath);
                }
            });
        }
    } else {
        next();
    }
});

// Handle any errors
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        config: config,
        status: err.status,
        message: err.message,
        error: {},
        body_class: 'page-error'
    });
});

module.exports = app;
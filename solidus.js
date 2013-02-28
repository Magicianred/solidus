var SITE_DIR = process.cwd();
var API_MOCK_DIR = '/api';
var DEFAULT_ENCODING = 'UTF8';
var DEFAULT_PORT = 8080;

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var async = require('async');
var express = require('express');
var expose = require('express-expose');
var router = express();
var chokidar = require('chokidar');
var request = require('request');
var handlebars = require('handlebars');

var views_path = path.join( SITE_DIR, 'views' );
var preprocessors_path = path.join( SITE_DIR, 'preprocessors' );

var solidus = {};

solidus.start = function( options ){

	var defaults = {
		port: DEFAULT_PORT
	};
	options = _( options ).defaults( defaults );

	var watcher = chokidar.watch( views_path, {
		persistent: true
	});

	var Page = require('./lib/page.js');
	Page.config({
		router: router,
		views_path: views_path,
		preprocessors_path: preprocessors_path
	});
	var pages = Page.pages;

	watcher.on( 'add', function( path ){

		var page = new Page( path );
		pages[path] = page;

		compileTemplates();

	});

	watcher.on( 'change', function( path ){

		var page = pages[path];
		if( page ) page.parsePage();

	});

	watcher.on( 'remove', function( path ){

		// remove this page

		pages[path].destroy();
		delete pages[path];

		compileTemplates();

	});

	var express_handlebars = require('express3-handlebars');
	var express_handlebars_config = {
		extname: '.hbs',
		partialsDir: views_path,
		layoutsDir: views_path
	};
	if( fs.existsSync( path.join( views_path, 'layout.hbs' ) ) ) express_handlebars_config.defaultLayout = 'layout';
	var handlebars = express_handlebars.create( express_handlebars_config );

	var compileTemplates = function(){

		handlebars.loadPartials({
			precompiled: true,
			wrapped: true
		}, function( err, partials ){

			templates_string = 'Handlebars.templates = Handlebars.partials = {';
			for( var key in partials ){
				templates_string += '"'+ key +'": '+ partials[key].toString() +',';
			}
			templates_string = templates_string.slice( 0, -1 );
			templates_string +='}';
			templates_string = templates_string.replace( /<\/script>/ig, '</scr"+"ipt>' ); // are you kidding me? http://stackoverflow.com/questions/1659749/script-tag-in-javascript-string

		});

	};

	router.engine( 'hbs', handlebars.engine );
	router.set( 'view engine', 'hbs' );
	router.set( 'views', views_path );

	var assets_path = path.join( SITE_DIR, 'assets' );
	var api_mock_path = path.join( __dirname, API_MOCK_DIR );

	router.use( express.static( assets_path ) );
	router.listen( options.port );

	console.log( 'Solidus server running on port '+ options.port );

};

module.exports = solidus;
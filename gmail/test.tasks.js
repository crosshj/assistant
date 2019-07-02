var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = require('../auth/config');
const cheerio = require('cheerio');
var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var sop = require('simple-object-path');

var async = require('async');
var asyncTree = require('async-tree');

var accessToken = config.accessToken;
const headers = {
	'Authorization': `Bearer ${config.accessToken}`
};
var gmail = new Gmail(accessToken);

function tryParse(str){
	try {
		return JSON.parse(str);
	} catch (e) {
		return undefined;
	}
}

function decode64(string){
    //return new Buffer(string, 'base64').toString('ascii');
    return new Buffer(string, 'base64').toString('binary');
}

// wrap synchronous code to be handled by async lib
function cbify(fn){
    const callbacked = (cb, args) => {
        console.log(args);
        const output = fn(...args);
        cb(null, output);
    };
    return function(arguments){
        return (callback) => callbacked(callback, arguments);
    }
}

//https://developers.google.com/tasks/v1/reference/
const base = 'https://www.googleapis.com/tasks/v1';

function tasksListList({} = {}, callback){
	const opts = {
		url: base + `/users/@me/lists`,
		headers
	};

	request(opts, (error, res, body) => {
		callback(error, res, tryParse(body));
	});
}

//TODO: add lists CRUD

function tasksList({ list = '@default' } = {}, callback){
	const opts = {
		url: base + `/lists/${list}/tasks`,
		headers
	};

	request(opts, (error, res, body) => {
		callback(error, res, tryParse(body));
	});
}

function tasksCreate({ parent } = {}, callback){
}

function tasksDelete({ id } = {}, callback){

}

function main() {
	tasksListList(undefined, (err, res, body) => {
		console.log(JSON.stringify({ err, body }, null, ' '));
	});
}


main();

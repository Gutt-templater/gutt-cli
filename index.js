#!/usr/bin/env node

const path = require('path')
const yargs = require('yargs')
const fs = require('fs')
const gutt = require('gutt')
const package = require('./package.json')

let files
let stringifier
let output
const stringifiers = []
let template
let cwd
let currentOutput
const argvs = yargs(process.argv.slice(2))
	.usage('Usage: gutt <files ...> [options]')
	.help('h')
	.alias('h', 'help')
	.alias('s', 'stringify')
	.alias('o', 'out-put')
	.alias('v', 'version')
	.demandOption(['s'])
	.describe('s', 'name of stringifier without prefix `gutt-`')
	.describe('o', 'out-put path')
	.describe('cwd', 'cwd for the output folder')
	.example('gutt templates/*.{gutt,tmplt} -s node-stringifier -o dist/templates/')
	.example('gutt templates/ -s node-stringifier -o dist/node-templates/ -s \\ browser-stringifier -o dist/js-templates/')
	.example('gutt components/**/*.gutt templates/*.gutt -s node-stringifier -o dist')
	.version('v' + package.version)
	.epilogue('For more information visit https://guttjs.com/')
	.argv

files = argvs._
stringifier = argvs.s
output = argvs.o
cwd = argvs.cwd

if (!output) output = []

if (!cwd) cwd = []

if (typeof files === 'string') files = [files]

if (typeof stringifier === 'string') stringifier = [stringifier]

if (typeof output === 'string') output = [output]

if (typeof cwd === 'string') cwd = [cwd]

if (!files.length) {
	throw new Error('No input files given. Check gutt --help')
}

if (stringifier.length > 1 && output.length > 1 && stringifier.length !== output.length) {
	throw new Error('Out-put amount should be equal strinfigiers amount or equal 1 or equal 0')
}

stringifier.forEach(function (stringifier) {
	stringifier = {
		handler: require(path.resolve(process.cwd(), './node_modules/gutt-' + stringifier)),
		meta: require(path.resolve(process.cwd(), './node_modules/gutt-' + stringifier + '/package.json'))
	}

	if (!stringifier.meta.CLISupport) {
		throw new Error(stringifier.meta.title + ' does not support CLI')
	}

	stringifiers.push(stringifier)
})

function getOutputPath(filePath) {
	let cwdPropped = false

	cwd.forEach(function (cwd) {
		cwd = path.normalize(cwd)
		filePath = path.normalize(filePath)

		if (filePath.indexOf(cwd) === 0 && !cwdPropped) {
			filePath = filePath.substr(cwd.length + 1)

			cwdPropped = true
		}
	})

	return filePath
}

stringifiers.forEach(function (stringifier, index) {
	files.forEach(function (filePath) {
		template = gutt.parseFile(filePath).stringifyWith(stringifier.handler)

		if (output.length) {
			currentOutput = output[0]

			if (output.length > 1) {
				currentOutput = output[index]
			}

			filePath = getOutputPath(filePath) + '.' + stringifier.meta.ext

			fs.mkdirSync(path.resolve(currentOutput, path.dirname(filePath)), {
				recursive: true
			})

			filePath = path.resolve(process.cwd(), currentOutput, filePath)

			fs.writeFile(filePath, template, function(error) {
				if (error) {
					console.error(error)
				}
			})
		}
	})
})

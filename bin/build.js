var _ 					= require('underscore');
var walk    			= require('walk');
var fs 					= require('fs');
var compressor			= require('node-minify');

function stack() {
	this.reset();
}
stack.prototype.reset = function() {
	this.stack 		= [];
	this.count 		= 0;
}
stack.prototype.add = function(item, params) {
	this.stack.push({
		fn:		item,
		params:	params
	});
	this.count++;
}
stack.prototype.process = function(callback, async) {
	var scope = this;
	
	if (!async) {
		// synchronous execution
		if (this.stack.length == 0) {
			callback();
			return true;
		}
		this.stack[0].fn(this.stack[0].params,function() {
			scope.stack.shift();
			if (scope.stack.length == 0) {
				callback();
			} else {
				scope.process(callback);
			}
		});
	} else {
		// asynchronous execution
		var i;
		for (i=0;i<this.stack.length;i++) {
			this.stack[i].fn(this.stack[i].params,function() {
				scope.count--;
				if (scope.count == 0) {
					callback();
				}
			});
		}
	}
}
function file() {
	
}

// List file by extention in any subdirectory
file.prototype.listFiles = function(dir, ext, callback, options) {
	
	options = _.extend({
		followLinks: 	false
	},options);
	
	var files   = [];
	
	// Walker options
	var walker  = walk.walk(dir, options);
	
	walker.on('file', function(root, stat, next) {
		var parts = stat.name.split(".");
		if (parts[parts.length-1] == ext) {
			files.push(root + '/' + stat.name);
		}
		next();
	});
	
	walker.on('end', function() {
		callback(files);
	});
}

// File to Object
file.prototype.toObject = function(file, callback) {
	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			callback(false);
		} else {
			callback(JSON.parse(data));
		}
	});
}
file.prototype.read = function(file, callback) {
	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			callback(false);
		} else {
			callback(data);
		}
	});
}
file.prototype.append = function(file, content, callback) {
	fs.appendFile(file, content, callback);
}
file.prototype.createPath = function(pathstr, callback) {
	var parts = pathstr.split("/");
	parts = _.compact(parts);
	var pointer = "";
	
	var checkstack = new stack();
	
	_.each(parts, function(part) {
		checkstack.add(function(p, cb) {
			pointer += part+"/";
			fs.exists(pointer, function(exists) {
				if (!exists) {
					fs.mkdir(pointer, 0777, function() {
						cb();
					});
				} else {
					cb();
				}
			});
		},{});
	});
	
	checkstack.process(function() {
		callback();
	}, false);
}
file.prototype.removeDir = function(pathstr, callback) {
	fs.exists(pathstr, function(exists) {
		if (!exists) {
			callback();
		} else {
			var files = [];
			if( fs.existsSync(pathstr) ) {
				files = fs.readdirSync(pathstr);
				files.forEach(function(file,index){
					var curPath = pathstr + "/" + file;
					if(fs.statSync(curPath).isDirectory()) { // recurse
						this.removeDir(curPath);
					} else { // delete file
						fs.unlinkSync(curPath);
					}
				});
				fs.rmdirSync(pathstr);
				callback();
			}
		}
	});

}


var builder = function() {
	
}
builder.prototype.init = function() {
	var scope = this;
	// Read the build.json file
	this.file	= new file();
	this.file.toObject("build.json", function(buildProfile) {
		scope.buildProfile = buildProfile;
		console.log("Build Profile:\n",JSON.stringify(buildProfile,null,4));
		
		// Delete the output directory
		scope.file.removeDir(scope.buildProfile.output, function() {
			// Create the output directory
			scope.file.createPath(scope.buildProfile.output, function() {
				var filestack = new stack();
				_.each(scope.buildProfile.files, function(file) {
					// Check if there's a wildcard
					var parts = file.split("*");
					if (parts.length == 2) {
						parts[0] = parts[0].substr(0,parts[0].length-1);
						parts[1] = parts[1].substr(1);
						// List the files
						scope.file.listFiles(parts[0], parts[1], function(files) {
							files = files.sort();
							_.each(files, function(file) {
								filestack.add(function(p, cb) {
									scope.file.read(file, function(content) {
										console.log("* Adding "+file+" to "+scope.buildProfile.output+"/"+scope.buildProfile.filename);
										scope.file.append(scope.buildProfile.output+"/"+scope.buildProfile.filename, ";\n\n/*** "+file+" ***/\n"+content, function() {
											cb();
										});
									});
								},{});
							});
						});
					} else {
						filestack.add(function(p, cb) {
							scope.file.read(file, function(content) {
								console.log("* Adding "+file+" to "+scope.buildProfile.output+"/"+scope.buildProfile.filename);
								scope.file.append(scope.buildProfile.output+"/"+scope.buildProfile.filename, ";\n\n/*** "+file+" ***/\n"+content, function() {
									cb();
								});
							});
						},{});
					}
				});
				filestack.process(function() {
					// The file is built.
					// Now we need to rename it as dev, and create a minified prod version
					// Rename
					var dotpos		= scope.buildProfile.filename.lastIndexOf(".");
					var filename	= scope.buildProfile.filename.substr(0,dotpos);
					var ext			= scope.buildProfile.filename.substr(dotpos);
					fs.rename(scope.buildProfile.output+"/"+scope.buildProfile.filename, scope.buildProfile.output+"/"+filename+".dev"+ext, function() {
						// Now, we minify the file to create a prod version
						console.log("-> Building minified version...");
						new compressor.minify({
							type: 		'yui-js',
							fileIn: 	scope.buildProfile.output+"/"+filename+".dev"+ext,
							fileOut: 	scope.buildProfile.output+"/"+filename+".min"+ext,
							callback: 	function(err, min){
								if (err) {
									console.log("Error:",err);
								} else {
									console.log("Build done.");
								}
							}
						});
					});
				}, false);
			});
		})
		
		
		
		
	})
}

new builder().init();